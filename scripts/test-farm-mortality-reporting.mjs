import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { managerDatabase, ids, scalar, periodWrite, asRole } from '../tests/helpers/manager-db.mjs';
import { typescriptLoader } from '../tests/helpers/load-typescript.mjs';

const db = await managerDatabase();
try {
  const { first, second, third } = await scalar(db, `
    select jsonb_build_object('first', monday, 'second', monday + 1, 'third', monday + 2)
    from (select date_trunc('week', now() at time zone 'Africa/Lagos')::date - 7 monday) week
  `);
  await db.exec("insert into farm_inventory(product,current_stock) values ('catfish',40),('goat',20),('turkey',10)");
  const record = (product, quantity, date) => scalar(db, `
    insert into farm_inventory_transactions(product,action,quantity,date,created_by)
    values ($1,'mortality',$2,$3,$4) returning to_jsonb(farm_inventory_transactions.*)
  `, [product, quantity, date, ids.farm]);
  const original = await record('catfish', 3, first);
  const sameDay = await record('goat', 4, third);
  const removed = await record('turkey', 2, third);
  await periodWrite(db, ids.admin, 'activate');
  const period = await scalar(db, "select id from manager_periods where manager_id=$1 and business='farm'", [ids.farm]);
  const supervisor = crypto.randomUUID();
  await db.query('insert into auth.users(id) values($1)', [supervisor]);
  await db.query("insert into profiles(id,role,name) values($1,'manager','Isolated supervisor')", [supervisor]);
  const other = await periodWrite(db, ids.admin, 'provision', { business: 'farm', manager_id: supervisor, starts_on: first });
  await db.query("update manager_periods set status='active' where id=$1", [other.id]);

  const calls = {
    manager_context: ['p_actor', 'p_business', 'p_period_id'],
    manager_read_records: ['p_actor', 'p_business', 'p_resource', 'p_period_id', 'p_filters'],
    farm_control_read: ['p_actor', 'p_period', 'p_from', 'p_to'],
    farm_supervisor_overview_read: ['p_actor', 'p_period', 'p_today'],
  };
  const client = { rpc: async (name, params) => {
    assert.ok(Object.hasOwn(calls, name), name);
    const values = calls[name].map(key => params[key]);
    try {
      const data = await scalar(db, `select ${name}(${values.map((_, index) => '$' + (index + 1)).join(',')})`, values);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  } };
  const base = typescriptLoader()('lib/farm-products.ts');
  let actor = ids.farm, currentDay = first;
  const load = typescriptLoader({
    '@/lib/auth': { requireManager: async () => ({ id: actor, role: actor === ids.admin ? 'admin' : 'manager' }) },
    '@/lib/farm-products': { ...base, farmDateToday: () => currentDay },
    '@/lib/supabase/server': { createServerClient: () => client },
  });
  const { getFarmControl } = load('lib/farm-control.ts');
  const overviewRoute = load('app/api/farm/overview/route.ts');
  const inventoryRoute = load('app/api/farm/inventory/transaction/route.ts');
  const owner = await scalar(db, "select manager_context($1,'farm',null)", [ids.admin]);
  const ownerView = async (from, to = from) => (await getFarmControl(owner, from, to)).overview;
  const supervisorView = async (day, periodId = period) => {
    currentDay = day;
    const response = await overviewRoute.GET(new Request('http://local/api/farm/overview?period_id=' + periodId));
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    return result.overview;
  };
  const deaths = view => [view.deathsOnEndDate, view.mortality.total];
  assert.deepEqual(deaths(await ownerView(first)), [3, 3]);
  assert.deepEqual(deaths(await supervisorView(first)), [3, 3]);

  const correct = (row, date, quantity) => scalar(db, `
    select farm_v2_write($1,'inventory_transaction','update',$2::jsonb,$3,$4,$5)
  `, [ids.admin, JSON.stringify({ date, quantity }), row.id, 'Verify the reported mortality', crypto.randomUUID()]);
  const replacement = await correct(original, second, 2);
  await correct(sameDay, third, 1);
  await correct(removed, third, 0);
  const fingerprint = () => scalar(db, `
    select jsonb_build_array(
      (select md5(jsonb_agg(to_jsonb(t) order by t.id)::text) from farm_inventory t),
      (select md5(jsonb_agg(to_jsonb(t) order by t.id)::text) from farm_inventory_transactions t)
    )
  `);
  const before = await fingerprint();

  assert.deepEqual(deaths(await ownerView(first)), [0, 0], 'Moving the date clears the old day');
  assert.deepEqual(deaths(await ownerView(second)), [2, 2]);
  assert.deepEqual(deaths(await ownerView(first, second)), [2, 2]);
  assert.deepEqual(deaths(await supervisorView(first)), [0, 0]);
  assert.deepEqual(deaths(await supervisorView(second)), [2, 2]);
  const correctedProducts = [{ product: 'goat', quantity: 1 }];
  assert.deepEqual((await ownerView(third)).mortality.products, correctedProducts, 'Same-day and zero corrections');
  const after = await supervisorView(third);
  assert.deepEqual(deaths(after), [1, 3]);
  assert.deepEqual(after.mortality.products, [{ product: 'catfish', quantity: 2 }, ...correctedProducts]);

  const records = async day => {
    const response = await inventoryRoute.GET(new Request(`http://local/api/farm/inventory/transaction?period_id=${period}&date=${day}`));
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    return result.data;
  };
  const oldRows = await records(first), newRows = await records(second);
  assert.deepEqual(oldRows.map(row => [row.id, row.quantity, row.mortality_reversed]), [[original.id, 3, true]]);
  assert.equal(newRows.find(row => row.correction_role === 'reversal').correction_of, original.id);
  assert.equal(newRows.find(row => row.action === 'mortality').id, replacement.id);

  const renderHistory = movements => {
    const ui = typescriptLoader({
      react: { ...React, useEffect: () => {}, useState: initial => [Array.isArray(initial) ? movements : initial, () => {}] },
      '@/contexts/ManagerPeriodContext': { useManagerFetch: () => {} },
      '@/components/manager/FarmCorrectionRequest': { FarmCorrectionRequest: () => React.createElement('button', null, 'Request correction') },
    });
    const { InventoryActivity } = ui('components/manager/InventoryActivity.tsx');
    return renderToStaticMarkup(React.createElement(InventoryActivity, { action: 'mortality' }));
  };
  const originalHistory = renderHistory(oldRows);
  assert.match(originalHistory, /Catfish · 3/);
  assert.match(originalHistory, /Corrected/);
  assert.doesNotMatch(originalHistory, /Request correction/);
  assert.match(renderHistory(newRows), /Request correction/);

  const exportLoader = typescriptLoader({ 'server-only': {}, '@/lib/supabase/server': { createServerClient: () => null } });
  const { buildLegacyManagerWorkbook } = exportLoader('lib/legacy-manager-export.ts');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await buildLegacyManagerWorkbook({
    target: { scope: 'Isolated farm' }, asOf: `${third}T00:00:00Z`, summary: {}, attributionNotes: [],
    sheets: [{ name: 'Inventory history', rows: oldRows }],
  }));
  const worksheet = workbook.getWorksheet('Inventory history'), headings = worksheet.getRow(1).values;
  assert.ok(!headings.includes('Mortality reversed'));
  assert.equal(worksheet.getRow(2).getCell(headings.indexOf('Quantity')).value, 3);

  actor = supervisor;
  assert.deepEqual(deaths(await supervisorView(third, other.id)), [0, 0]);
  const crossScope = await inventoryRoute.GET(new Request(`http://local/api/farm/inventory/transaction?period_id=${period}`));
  assert.equal(crossScope.status, 403);
  assert.deepEqual(await scalar(db, 'select to_jsonb(t) from farm_inventory_transactions t where id=$1', [original.id]), original);
  assert.deepEqual(await fingerprint(), before, 'Reading corrected reports never changes stock or movement history');
  await assert.rejects(() => asRole(db, 'authenticated', ids.farm, () => scalar(db, "select operations_private.row_payload($1,'farm_inventory_transactions',$2::jsonb,$3)", [ids.farm, JSON.stringify(original), period])), e => e.code === '42501');
  console.log('PASS guarded mortality corrections and read-only historical totals for both roles, scoped inventory, dates, same-day and zero corrections');
} catch (error) {
  console.error(error.message, error.code, error.where);
  process.exitCode = 1;
} finally {
  await db.close();
}
