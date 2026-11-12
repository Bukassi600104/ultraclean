import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { asRole, ids, managerDatabase, periodWrite, scalar } from '../tests/helpers/manager-db.mjs';

const peer = '10000000-0000-4000-8000-000000000009';
const migration = '20261112140000_farm_log_followups.sql';
const db = await managerDatabase({
  through: '20261112090300_receipt_balance_confirmation.sql',
  legacyManagers: [{ id: peer, name: 'Other farm supervisor' }],
});
const query = (sql, args) => scalar(db, sql, args);
const uuid = () => crypto.randomUUID();
const admin = ids.admin;
const supervisor = ids.farm;
const reports = 'farm_daily_reports';
const batches = 'farm_batch_records';
const forbidden = error => error.code === '42501';
const inbox = (actor, period = null, offset = 0) =>
  query('select farm_log_followups_read($1,$2,$3)', [actor, period, offset]);
const complete = (actor, messageId, request = uuid(), period = null) =>
  query('select farm_log_followup_complete($1,$2,$3,$4)', [actor, messageId, request, period]);
const thread = (actor, resource, record) =>
  query('select farm_record_messages_read($1,$2,$3)', [actor, resource, record]);
const send = (actor, resource, record, body, kind = 'question', replyTo = null) =>
  query('select farm_record_message_write($1,$2::jsonb,$3)',
    [actor, JSON.stringify({ resource, record_id: record, body, kind, reply_to: replyTo }), uuid()]);
const periodFor = actor => query("select id from manager_periods where manager_id=$1 and business='farm' and ended_at is null", [actor]);
const sources = () => query(`
  select jsonb_build_array(
    (select jsonb_agg(to_jsonb(t) order by id) from farm_daily_reports t),
    (select jsonb_agg(to_jsonb(t) order by id) from farm_batch_records t),
    (select jsonb_agg(to_jsonb(t) order by id) from farm_record_messages t),
    (select jsonb_agg(to_jsonb(t) order by id) from profiles t))`);
const record = (actor, area, date) => query('select farm_daily_report_submit($1,$2::jsonb,$3)', [actor,
  JSON.stringify({ report_date: date, decision_required: false,
    sections: { template_version: 3, area, observations: { notes: 'Water checked' } } }), uuid()]);

try {
  // The same words on different older reports must remain distinct instructions.
  const oldReport = await query("insert into farm_daily_reports(report_date,manager_id,sections,status) values('2020-03-01',$1,'{}','submitted') returning id", [supervisor]);
  const unknown = await query("insert into farm_daily_reports(report_date,manager_id,sections,status) values('2020-03-01',$1,'{}','submitted') returning id", [admin]);
  await periodWrite(db, admin, 'activate');
  const period = await periodFor(supervisor);
  const otherPeriod = await periodFor(peer);
  const vat1 = await record(supervisor, 'farm2_vat1', '2026-11-11');
  const vat2 = await record(supervisor, 'farm2_vat2', '2026-11-11');
  const other = await record(peer, 'farm2_vat1', '2026-11-11');
  const first = await send(admin, reports, vat1.id, 'Change water tomorrow');
  const second = await send(admin, reports, vat2.id, 'Change water tomorrow');
  const otherMessage = await send(admin, reports, other.id, 'Change water tomorrow');
  const uncertain = await send(admin, reports, unknown, 'Check the original record');
  const historic = await send(admin, reports, oldReport, 'Follow up on the original record', 'comment');
  const supervisorReply = await send(supervisor, reports, vat1.id, 'I will check', 'reply', first.id);
  const mdReply = await send(admin, reports, vat1.id, 'Let me know today', 'reply', supervisorReply.id);
  const sale = await query("select farm_v2_write($1,'sale','create',$2::jsonb,null,null,$3)", [supervisor,
    JSON.stringify({ date:'2026-11-11',product:'other',quantity:1,unit_price:100,pricing_basis:'per_unit' }), uuid()]);
  const saleMessage = await send(admin, 'farm_sales', sale.id, 'Please check this sale');
  const configure = (operation,payload) => query('select farm_batch_write($1,$2,$3::jsonb,$4)', [admin, operation, JSON.stringify(payload), uuid()]);
  const site = await configure('site', { name:'Isolated site' });
  const batch = await configure('batch', { site_id:site.id, name:'First pond', kind:'pond', product:'catfish' });
  await periodWrite(db, admin, 'assign', { period_id:period, assets:[{ resource:'farm_batches', record_id:batch.id }] });
  const batchPayload = { batch_id:batch.id, date:'2026-11-11', notes:'Checked water' };
  const batchLog = await query("select farm_batch_record_write($1,'submit',$2::jsonb,null,$3)", [supervisor, JSON.stringify(batchPayload), uuid()]);
  const corrected = await query("select farm_batch_record_write($1,'correct',$2::jsonb,$3,$4)", [admin,
    JSON.stringify({ ...batchPayload, notes:'Updated observation', reason:'Verified reading' }), batchLog.id, uuid()]);
  assert.equal(corrected.actor_id, admin);
  const batchMessage = await send(admin, batches, corrected.id, 'Check the water again', 'comment');

  const before = await sources();
  await db.exec(await readFile(new URL('../supabase/migrations/' + migration, import.meta.url), 'utf8'));
  assert.deepEqual(await sources(), before, 'Applying the migration preserves all fixture rows, profiles and message text');
  assert.equal(await query('select count(*)::int from farm_log_followup_completions'), 0);
  const start = await asRole(db, 'service_role', null, () => inbox(supervisor, period));
  const byId = new Map(start.items.map(item => [item.message_id, item]));
  assert.deepEqual(new Set(byId.keys()), new Set([first.id, second.id, historic.id, mdReply.id, batchMessage.id]));
  assert.equal(start.total, 5);
  assert.equal(byId.get(first.id).area, 'farm2_vat1');
  assert.equal(byId.get(second.id).area, 'farm2_vat2');
  assert.equal(byId.get(historic.id).area, null);
  assert.equal(byId.get(historic.id).report_date, '2020-03-01');
  assert.equal(byId.get(batchMessage.id).batch_id, batch.id);
  assert.equal(byId.get(batchMessage.id).batch_name, 'First pond');
  assert.equal(byId.get(batchMessage.id).area, null);
  assert.deepEqual(Object.keys(byId.get(first.id)).sort(),
    ['message_id','record_id','resource','body','created_at','report_date','area','batch_name','batch_id'].sort());
  assert.deepEqual((await inbox(peer)).items.map(m => m.message_id), [otherMessage.id]);
  await assert.rejects(() => inbox(supervisor, otherPeriod), forbidden);
  await assert.rejects(() => inbox(supervisor, null, -1), error => error.code === '22023');
  for (const actor of [admin, ids.property, ids.content, ids.suspended, null]) {
    await assert.rejects(() => inbox(actor), forbidden);
    await assert.rejects(() => complete(actor, first.id), forbidden);
  }
  for (const message of [saleMessage, supervisorReply, otherMessage, uncertain]) {
    await assert.rejects(() => complete(supervisor, message.id), forbidden);
  }
  await assert.rejects(() => complete(peer, first.id), forbidden);
  await assert.rejects(() => thread(peer, reports, vat1.id), forbidden);
  await assert.rejects(() => complete(supervisor, first.id, null), error => error.code === '22023');
  for (const role of ['anon','authenticated']) {
    await assert.rejects(() => asRole(db, role, supervisor, () => inbox(supervisor)), forbidden);
    await assert.rejects(() => asRole(db, role, supervisor, () => complete(supervisor, first.id)), forbidden);
  }
  for (const role of ['anon','authenticated','service_role']) {
    await assert.rejects(() => asRole(db, role, supervisor,
      () => db.query('select * from farm_log_followup_completions')), forbidden);
  }

  const managerThread = await thread(supervisor, reports, vat1.id);
  const ownerThread = await thread(admin, reports, vat1.id);
  const firstRow = managerThread.find(row => row.id === first.id);
  assert.equal(firstRow.can_complete, true);
  assert.equal(firstRow.is_followup, true);
  assert.equal(firstRow.completed_at, null);
  assert.equal(ownerThread.find(row => row.id === first.id).can_complete, false);
  assert.equal(managerThread.find(row => row.id === supervisorReply.id).is_followup, false);
  assert.equal((await thread(admin, 'farm_sales', sale.id))[0].is_followup, false);
  assert.equal((await thread(admin, reports, unknown))[0].is_followup, false, 'No to-do label without an eligible recipient');
  assert.equal((await inbox(supervisor)).total, 5, 'Opening the thread and ordinary replies leave instructions pending');
  const retryId = uuid();
  const [one, two] = await Promise.all([complete(supervisor, first.id, retryId), complete(supervisor, first.id)]);
  assert.deepEqual(one, two);
  assert.deepEqual(await complete(supervisor, first.id, retryId, period), one);
  assert.deepEqual(Object.keys(one).sort(), ['message_id','record_id','resource','completed_at'].sort());
  assert.equal((await inbox(supervisor)).total, 4);
  assert.equal((await inbox(peer)).total, 1);
  await assert.rejects(() => complete(supervisor, second.id, retryId), error => error.code === '23514');
  const receipt = await query('select result from manager_write_receipts where actor_id=$1 and request_id=$2', [supervisor,retryId]);
  assert.deepEqual(receipt, one);
  await assert.rejects(() => query('select farm_record_message_write($1,$2::jsonb,$3)',
    [supervisor, JSON.stringify({ resource:reports, record_id:vat1.id, kind:'comment', body:'Different action' }),retryId]),
    error => error.code === '23514');
  assert.equal(await query('select count(*)::int from farm_log_followup_completions'), 1);
  for (const actor of [supervisor, admin]) {
    const done = (await thread(actor, reports, vat1.id)).find(row => row.id === first.id);
    assert.equal(done.completed_at, one.completed_at);
    assert.equal(done.can_complete, false);
    assert.equal(done.is_followup, true);
  }
  assert.deepEqual(await sources(), before, 'Completion and retries preserve the original sources');
  await assert.rejects(() => db.query('delete from farm_log_followup_completions where message_id=$1', [first.id]));
  assert.equal((await inbox(supervisor)).total, 4);

  // Earlier tied timestamps test the stable secondary ordering and complete count on later pages.
  await db.query(`insert into farm_record_messages(resource,record_id,actor_id,kind,body,created_at)
    select 'farm_daily_reports',$1,$2,'comment','Check water','2020-05-01'::timestamptz from generate_series(1,24)`, [vat1.id, admin]);
  const firstPage = await inbox(supervisor);
  const nextPage = await inbox(supervisor, null, 20);
  assert.equal(firstPage.total, 28);
  assert.equal(firstPage.items.length, 20);
  assert.equal(nextPage.total, 28);
  assert.equal(nextPage.items.length, 8);
  assert.deepEqual(await inbox(supervisor, null, 100), {total:28, items:[]});
  const combined = [...firstPage.items,...nextPage.items];
  assert.equal(new Set(combined.map(m => m.message_id)).size, 28);
  const sorted = [...combined].sort((a,b) => a.created_at === b.created_at
    ? b.message_id.localeCompare(a.message_id) : b.created_at.localeCompare(a.created_at));
  assert.deepEqual(combined, sorted);
  await db.query('update profiles set suspended=true where id=$1', [supervisor]);
  await assert.rejects(() => inbox(supervisor), forbidden);
  await assert.rejects(() => complete(supervisor, second.id), forbidden);
  await db.query('update profiles set suspended=false where id=$1', [supervisor]);
  await periodWrite(db, admin, 'close', {period_id:period, reason:'Verified handover'});
  await assert.rejects(() => inbox(supervisor, period), forbidden);
  assert.equal((await thread(admin, reports, vat2.id)).find(m => m.id === second.id).is_followup, false,
    'An outstanding instruction on a closed period must not promise a new supervisor can complete it');
  const next = await periodWrite(db, admin, 'provision', {manager_id:supervisor, business:'farm', starts_on:'2026-11-11'});
  await assert.rejects(() => inbox(supervisor, next.id), forbidden);
  await db.query("update manager_periods set status='active', starts_on=current_date+1 where id=$1", [next.id]);
  await assert.rejects(() => inbox(supervisor), forbidden);
  await db.query("update manager_periods set starts_on='2026-11-11' where id=$1", [next.id]);
  assert.deepEqual(await inbox(supervisor, next.id), { total:0, items:[] });
  await assert.rejects(() => complete(supervisor, historic.id), forbidden);
  await assert.rejects(() => complete(supervisor, second.id, uuid(), period), forbidden);
  const ownReport = await record(supervisor,'farm2_vat3','2026-11-12');
  const ownMessage = await send(admin,reports,ownReport.id,'Check this new period');
  assert.deepEqual((await inbox(supervisor)).items.map(m => m.message_id), [ownMessage.id]);
  assert.equal((await thread(admin,reports,vat1.id)).find(m => m.id === first.id).completed_at, one.completed_at);
  console.log('PASS Farm Daily Log follow-ups: historic messages, source attribution, privacy, paging, explicit completion, immutable rows, retries and clean handover');
} finally {
  await db.close();
}
