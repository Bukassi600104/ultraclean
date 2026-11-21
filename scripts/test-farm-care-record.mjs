import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { asRole, ids, managerDatabase, periodWrite, scalar } from '../tests/helpers/manager-db.mjs';

const emptyHistoryOwner = '00000000-0000-4000-8000-000000000006';
const db = await managerDatabase({
  through: '20261119120300_farm_mortality_report_corrections.sql',
  legacyManagers: [{ id: emptyHistoryOwner, name: 'Earlier supervisor' }],
});

try {
  const today = await scalar(db, "select (now() at time zone 'Africa/Lagos')::date::text");
  const period = await scalar(db, "select id from manager_periods where manager_id=$1 and business='farm'", [ids.farm]);
  const emptyHistory = await scalar(db, "select id from manager_periods where manager_id=$1 and business='farm'", [emptyHistoryOwner]);
  await periodWrite(db, ids.admin, 'activate');
  await db.query("update manager_periods set mode='personal', starts_on=$2::date - 7 where id=$1", [period, today]);
  await db.query("update manager_periods set status='closed', ended_at=now() where id=$1", [emptyHistory]);

  await scalar(db, "select farm_health_write($1,'note',$2::jsonb,null,$3)", [ids.farm, JSON.stringify({
    date: today, title: 'Existing observation', details: 'Original health note',
  }), crypto.randomUUID()]);
  const readExisting = () => scalar(db, 'select farm_health_read($1,null,$2)', [ids.admin, today]);
  const countExisting = () => scalar(db, `select jsonb_build_array(
    (select count(*) from farm_health_tasks), (select count(*) from farm_health_completions),
    (select count(*) from farm_health_notes), (select count(*) from farm_operation_events),
    (select count(*) from manager_record_links), (select count(*) from manager_write_contexts),
    (select count(*) from farm_inventory_transactions))`);
  const legacyHealth = await readExisting();
  const legacyCounts = await countExisting();
  const migrations = new URL('../supabase/migrations/', import.meta.url);
  const migration = (await readdir(migrations)).find(name => /^\d{14}_farm_care_record\.sql$/.test(name));
  if (migration) await db.exec(await readFile(new URL(migration, migrations), 'utf8'));

  const read = (actor, scope = null, register = null, page = 1) =>
    scalar(db, 'select farm_care_record_read($1,$2,$3,$4)', [actor, scope, register, page]);
  const write = (actor, scope, register, operation, payload, request = crypto.randomUUID()) =>
    scalar(db, 'select farm_care_record_write($1,$2,$3,$4,$5,$6::jsonb)', [actor, scope, register, operation, request, JSON.stringify(payload)]);
  const fails = (...codes) => error => codes.includes(error.code);

  const initial = await asRole(db, 'service_role', null, () => read(ids.admin));
  assert.equal(initial.register_id, period);
  assert.equal(initial.can_write, true);
  assert.equal(initial.page_count, 1);
  assert.deepEqual(initial.rows, []);
  assert.equal(initial.review, null);
  assert.deepEqual(initial.registers.map(register => register.id), [period]);
  assert.equal((await read(ids.farm, period)).can_write, true);
  await assert.rejects(() => read(ids.farm, period, emptyHistory), fails('42501'));
  await assert.rejects(() => read(ids.admin, null, emptyHistory), fails('42501'));
  await assert.rejects(() => read(ids.property), fails('42501'));
  await assert.rejects(() => read(ids.suspended), fails('42501'));
  await assert.rejects(() => asRole(db, 'authenticated', ids.farm, () => read(ids.farm, period)), fails('42501'));
  await assert.rejects(() => asRole(db, 'anon', null, () => read(ids.admin)), fails('42501'));
  await assert.rejects(() => asRole(db, 'authenticated', ids.admin, () => write(ids.admin, null, period, 'add_page', {})), fails('42501'));
  await assert.rejects(() => asRole(db, 'service_role', null, () => db.query('select * from operations_private.farm_care_record_events')), fails('42501'));

  const row = {
    page: 1, row_number: 1, activity: 'Fowl pox booster', expected_revision: 0,
    values: {
      animal_group: 'Group A', location: 'Pen 1', animal_tag: 'A-01', record_date: today,
      age: '14 weeks', breed: 'Fixture breed', markings: 'Light markings', diagnosis: 'X'.repeat(201),
      treatment: 'Logged by supervisor', date_received: today, duration: 'Recorded duration',
      withdrawal: 'Recorded interval', next_due: today, animal_status: 'alive', notes: 'First line\nRecorded in Ibadan',
    },
  };
  await assert.rejects(() => write(ids.farm, period, period, 'save_row', { ...row, activity: 'Renamed starter activity' }), fails('22023'));
  await assert.rejects(() => write(ids.farm, period, period, 'save_row', { ...row, values: { notes: '  ' } }), fails('22023'));
  await assert.rejects(() => write(ids.farm, period, period, 'save_row', { ...row, values: { notes: 'Logged', location: '\t ' } }), fails('22023'));
  await assert.rejects(() => write(ids.farm, period, period, 'save_row', { ...row, values: { location: 'X'.repeat(201) } }), fails('22023'));
  await assert.rejects(() => write(ids.farm, period, period, 'save_row', { ...row, values: { animal_status: 'Alive' } }), fails('22023'));
  await assert.rejects(() => write(ids.farm, period, period, 'save_row', { ...row, values: { notes: 'Saved', unknown_column: 'value' } }), fails('22023'));
  await assert.rejects(() => write(ids.farm, period, period, 'save_row', { ...row, values: { record_date: '2999-01-01' } }), fails('22023'));
  await assert.rejects(() => write(ids.farm, period, period, 'save_row', { ...row, values: { record_date: '2000-01-01' } }), fails('22023', '42501'));
  await assert.rejects(() => write(ids.farm, period, period, 'save_row', { ...row, values: { record_date: '2026-02-31' } }), fails('22023'));
  await assert.rejects(() => write(ids.farm, period, emptyHistory, 'save_row', row), fails('42501'));

  const firstRequest = crypto.randomUUID();
  const first = await asRole(db, 'service_role', null, () => write(ids.farm, period, period, 'save_row', row, firstRequest));
  assert.deepEqual(first, { page: 1, row_number: 1, revision: 1 });
  assert.deepEqual(await write(ids.farm, period, period, 'save_row', row, firstRequest), first);
  await assert.rejects(() => write(ids.farm, period, period, 'save_row', { ...row, values: { notes: 'Changed retry' } }, firstRequest), fails('23514', '40001'));
  assert.deepEqual((await read(ids.admin, null, period)).rows, [{
    row_number: 1, activity: row.activity, values: row.values, revision: 1,
  }]);

  const revised = { ...row, values: { ...row.values, notes: 'Additional observation' }, expected_revision: 1 };
  assert.equal((await write(ids.admin, null, period, 'save_row', revised)).revision, 2);
  await assert.rejects(() => write(ids.farm, period, period, 'save_row', revised), fails('40001'));
  assert.deepEqual((await read(ids.farm, period)).rows[0].values, revised.values);

  const pageRequest = crypto.randomUUID();
  assert.deepEqual(await write(ids.admin, null, period, 'add_page', {}, pageRequest), { page: 2 });
  assert.deepEqual(await write(ids.admin, null, period, 'add_page', {}, pageRequest), { page: 2 });
  const emptyPage = await read(ids.farm, period, period, 2);
  assert.equal(emptyPage.page, 2);
  assert.equal(emptyPage.page_count, 2);
  assert.deepEqual(emptyPage.rows, []);
  assert.deepEqual(await write(ids.farm, period, period, 'save_row', {
    page: 2, row_number: null, activity: row.activity, values: { notes: 'Another occurrence' }, expected_revision: 0,
  }), { page: 2, row_number: 1, revision: 1 });
  const futureRow = { page: 2, row_number: null, activity: 'Additional farm care entry', values: { location: 'Pen 2' }, expected_revision: 0 };
  assert.equal((await write(ids.farm, period, period, 'save_row', futureRow)).row_number, 2);
  await assert.rejects(() => write(ids.admin, null, period, 'save_row', {
    ...futureRow, row_number: 2, expected_revision: 1, activity: 'Renamed activity',
  }), fails('22023', '40001'));
  for (let number = 3; number <= 22; number++) {
    assert.equal((await write(ids.farm, period, period, 'save_row', futureRow)).row_number, number);
  }
  await assert.rejects(() => write(ids.farm, period, period, 'save_row', futureRow), fails('23514', '40001'));
  const review = { page: 2, text: 'General review\nSuggestions', expected_revision: 0 };
  await assert.rejects(() => write(ids.farm, period, period, 'save_review', { ...review, text: '\n ' }), fails('22023'));
  assert.deepEqual(await write(ids.farm, period, period, 'save_review', review), { page: 2, revision: 1 });
  assert.equal((await write(ids.admin, period, period, 'save_review', { ...review, text: 'Updated review', expected_revision: 1 })).revision, 2);
  const continuation = await read(ids.admin, null, period, 2);
  assert.equal(continuation.rows.length, 22);
  assert.deepEqual(continuation.review, { text: 'Updated review', revision: 2 });
  assert.equal((await read(ids.admin, null, period, 1)).review, null);
  await assert.rejects(() => write(ids.admin, null, period, 'save_review', { ...review, page: 3 }), fails('22023'));
  assert.deepEqual(await write(ids.admin, null, period, 'add_page', {}), { page: 3 });
  assert.equal((await read(ids.admin, null, period, 3)).page_count, 3);

  await db.query(`insert into manager_period_days(period_id,date,status,closed_by,closed_at)
    values($1,$2,'closed',$3,now())`, [period, today, ids.admin]);
  await assert.rejects(() => write(ids.farm, period, period, 'save_row', { ...row, row_number: 2, activity: 'Salt bath and partial water change' }), fails('22023', '23514'));
  await assert.rejects(() => write(ids.admin, null, period, 'save_row', { ...row, row_number: 2, activity: 'Salt bath and partial water change' }), fails('22023', '23514'));
  await assert.rejects(() => write(ids.farm, period, period, 'save_row', {
    ...row, values: { notes: 'Changing a date after close' }, expected_revision: 2,
  }), fails('23514'));
  for (const mutation of ['update operations_private.farm_care_record_events set payload=payload',
    'delete from operations_private.farm_care_record_events', 'truncate operations_private.farm_care_record_events']) {
    await assert.rejects(() => db.query(mutation), fails('42501'));
  }
  assert.deepEqual(await readExisting(), legacyHealth);
  assert.deepEqual(await countExisting(), legacyCounts);

  await periodWrite(db, ids.admin, 'close', { period_id: period, reason: 'Isolated fixture close' });
  const ended = await read(ids.admin);
  assert.equal(ended.register_id, period);
  assert.equal(ended.can_write, false);
  assert.equal(ended.page_count, 3);
  assert.equal(ended.registers[0].ends_on, today);
  await assert.rejects(() => write(ids.admin, null, period, 'add_page', {}), fails('42501'));
  const nextPeriod = await periodWrite(db, ids.admin, 'provision', {
    business: 'farm', manager_id: emptyHistoryOwner, starts_on: today,
  });
  assert.equal((await read(emptyHistoryOwner)).can_write, false);
  await db.query("update manager_periods set status='active' where id=$1", [nextPeriod.id]);
  const nextRegister = await read(emptyHistoryOwner);
  assert.equal(nextRegister.register_id, nextPeriod.id);
  assert.equal(nextRegister.can_write, true);
  assert.deepEqual(nextRegister.rows, []);
  assert.deepEqual((await read(ids.admin)).registers.map(register => register.id), [nextPeriod.id, period]);
  await assert.rejects(() => read(emptyHistoryOwner, nextPeriod.id, period), fails('42501'));
  await assert.rejects(() => read(emptyHistoryOwner, period), fails('42501'));
  await assert.rejects(() => write(emptyHistoryOwner, nextPeriod.id, period, 'add_page', {}), fails('42501'));
  assert.deepEqual((await readExisting()).notes, legacyHealth.notes);

  console.log('PASS isolated care record reads, writes, revision and retry safety, continuation, permissions, and existing health preservation');
} finally {
  await db.close();
}
