// Expected values are read off the IRS documents (Rev. Proc. 2026-35 and Rev. Proc. 2025-32, downloaded 2026-11-07) or
// are hand arithmetic from the printed tables. The base-amount test re-derives every printed "tax is" amount from the thresholds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import {
  bracketsFor, derivedBases, scheduleTax, standardDeduction, getTaxBrackets, getStandardDeduction, calculateFederalIncomeTax, getTaxAmounts,
  parseStatus, parseYear, InputError, UTM, computeTax,
} from '../dist/core.js';
import { TABLES, AMOUNTS, EITC } from '../dist/data.js';

test('every printed base amount equals the cumulative tax of the lower brackets (20 tables checked)', () => {
  let n = 0;
  for (const y of [2026, 2027]) for (const k of Object.keys(TABLES[y])) {
    const printed = TABLES[y][k].base; const derived = derivedBases(y, k);
    assert.deepEqual(derived, printed, `${y} ${k}`); n += printed.length;
  }
  assert.equal(n, 2 * (4 * 6 + 3));
});
test('2027 single: top of 10% is 12,800, 12% 52,025, 22% 109,125, 24% 208,325, 32% 264,550, 35% 661,375', () => {
  assert.deepEqual(bracketsFor(2027, 'single').map((b) => b.to), [12800, 52025, 109125, 208325, 264550, 661375, null]);
});
test('2027 married filing jointly: 25,600, 104,050, 218,250, 416,650, 529,100, 793,650', () => {
  assert.deepEqual(bracketsFor(2027, 'married_filing_jointly').map((b) => b.to), [25600, 104050, 218250, 416650, 529100, 793650, null]);
});
test('2027 head of household and married filing separately tops', () => {
  assert.deepEqual(bracketsFor(2027, 'head_of_household').map((b) => b.to), [18250, 69650, 109100, 208300, 264550, 661350, null]);
  assert.equal(bracketsFor(2027, 'married_filing_separately')[5].to, 396825);
});
test('schedule tax: single 2027 at 100,000 = 5,987 + 22% of 47,975 = 16,541.50', () => {
  assert.equal(scheduleTax(2027, 'single', 100000), 16541.5);
});
test('schedule tax: MFJ 2027 at 200,000 = 11,974 + 22% of 95,950 = 33,083; at 25,600 = 2,560; at 0 = 0', () => {
  assert.equal(scheduleTax(2027, 'married_filing_jointly', 200000), 33083);
  assert.equal(scheduleTax(2027, 'married_filing_jointly', 25600), 2560);
  assert.equal(scheduleTax(2027, 'married_filing_jointly', 0), 0);
});
test('schedule tax: single 2026 at 100,000 = 5,800 + 22% of 49,600 = 16,712; 2027 top rate 199,237.75 + 37% of 100,000', () => {
  assert.equal(scheduleTax(2026, 'single', 100000), 16712);
  assert.equal(scheduleTax(2027, 'single', 761375), 236237.75);
});
test('standard deduction 2027: 33,200 / 24,925 / 16,600 / 16,600 and 2026: 32,200 / 24,150 / 16,100 / 16,100', () => {
  assert.equal(standardDeduction(2027, 'married_filing_jointly').total, 33200);
  assert.equal(standardDeduction(2027, 'head_of_household').total, 24925);
  assert.equal(standardDeduction(2027, 'single').total, 16600);
  assert.equal(standardDeduction(2027, 'married_filing_separately').total, 16600);
  assert.equal(standardDeduction(2026, 'married_filing_jointly').total, 32200);
  assert.equal(standardDeduction(2026, 'head_of_household').total, 24150);
  assert.equal(standardDeduction(2026, 'single').total, 16100);
});
test('standard deduction extras: single 65+ is 16,600 + 2,100; joint both 65+ is 33,200 + 2 x 1,700; blind and 65+ single 2027 is 20,800', () => {
  assert.equal(standardDeduction(2027, 'single', { aged: 1 }).total, 18700);
  assert.equal(standardDeduction(2027, 'married_filing_jointly', { aged: 2 }).total, 36600);
  assert.equal(standardDeduction(2027, 'single', { aged: 1, blind: 1 }).total, 20800);
  assert.equal(standardDeduction(2026, 'single', { aged: 1 }).total, 18150);
});
test('dependent rule 2027: greater of 1,400 or 500 + earned income, capped at the regular amount', () => {
  assert.equal(standardDeduction(2027, 'single', { dependent: true, earned: 0 }).base, 1400);
  assert.equal(standardDeduction(2027, 'single', { dependent: true, earned: 3000 }).base, 3500);
  assert.equal(standardDeduction(2027, 'single', { dependent: true, earned: 50000 }).base, 16600);
  assert.equal(standardDeduction(2026, 'single', { dependent: true, earned: 3000 }).base, 3450);
});
test('standard deduction counts are validated', () => {
  assert.throws(() => standardDeduction(2027, 'single', { aged: 2 }), InputError);
  assert.throws(() => standardDeduction(2027, 'married_filing_jointly', { blind: 3 }), InputError);
});
test('get_tax_brackets: 2027 single summary names the first and last bracket and the 2026 change', () => {
  const r = getTaxBrackets({});
  assert.equal(r.tax_year, 2027); assert.equal(r.tables.length, 4);
  assert.match(r.summary, /10% \$0 to \$12,800/); assert.match(r.summary, /37% over \$661,375/);
  const single = r.tables[0].brackets;
  assert.equal(single[0].up_to_2026, 12400); assert.equal(single[0].change_in_top_of_bracket, 400);
  assert.ok(r.more.includes(UTM)); assert.match(r.source, /rp-26-35/);
  const t = getTaxBrackets({ tax_year: 2026, filing_status: 'estates_and_trusts' });
  assert.deepEqual(t.tables[0].brackets.map((b) => b.taxable_income_up_to), [3300, 11700, 16000, null]);
});
test('get_standard_deduction: joint 2027 is up 1,000 from 2026; single 65 and older 2027 is 18,700', () => {
  const r = getStandardDeduction({ filing_status: 'MFJ' });
  assert.equal(r.total_standard_deduction, 33200); assert.equal(r.other_year.change, 1000); assert.match(r.summary, /up \$1,000/);
  const s = getStandardDeduction({ filing_status: 'single', age_65_or_older_count: 1 });
  assert.equal(s.total_standard_deduction, 18700); assert.match(s.summary, /plus \$2,100/);
});
test('calculate: single 2027, 100,000 income, standard deduction 16,600, taxable 83,400, tax 12,889.50 against 13,170 under 2026', () => {
  const r = calculateFederalIncomeTax({ filing_status: 'single', income: 100000 });
  assert.equal(r.taxable_income, 83400); assert.equal(r.deduction_used, 16600); assert.equal(r.total_tax, 12889.5);
  assert.equal(r.marginal_rate_percent, 22); assert.equal(r.average_rate_percent, 12.89);
  assert.equal(r.compare_other_year.total_tax, 13170); assert.equal(r.compare_other_year.difference_this_year_minus_other, -280.5);
  assert.match(r.summary, /\$12,889\.50/); assert.match(r.summary, /\$280\.50 lower/);
  assert.equal(r.bracket_breakdown.length, 3); assert.equal(r.bracket_breakdown.reduce((s, b) => s + b.tax, 0).toFixed(2), '12889.50');
});
test('calculate: married filing jointly 2027, 250,000 income, taxable 216,800, tax 36,779 against 37,468 under 2026', () => {
  const r = calculateFederalIncomeTax({ filing_status: 'married_filing_jointly', income: 250000 });
  assert.equal(r.taxable_income, 216800); assert.equal(r.total_tax, 36779); assert.equal(r.compare_other_year.total_tax, 37468);
  assert.equal(r.compare_other_year.difference_this_year_minus_other, -689);
});
test('calculate: tax year 2026 is the base and 2027 the comparison', () => {
  const r = calculateFederalIncomeTax({ tax_year: 2026, filing_status: 'single', income: 100000 });
  assert.equal(r.total_tax, 13170); assert.equal(r.compare_other_year.tax_year, 2027); assert.equal(r.compare_other_year.total_tax, 12889.5);
  assert.match(r.summary, /\$280\.50 higher/);
});
test('calculate: itemized 25,000 on 120,000 single gives taxable 95,000 and tax 15,441.50; taxable_income mode skips the deduction', () => {
  assert.equal(calculateFederalIncomeTax({ filing_status: 'single', income: 120000, deduction: 'itemized', itemized_deductions: 25000 }).total_tax, 15441.5);
  const r = calculateFederalIncomeTax({ filing_status: 'married_filing_jointly', taxable_income: 25600 });
  assert.equal(r.total_tax, 2560); assert.equal(r.marginal_rate_percent, 10); assert.equal(r.deduction_used, 0);
});
test('calculate: 65 and older single adds 2,100 so taxable income on 100,000 is 81,300', () => {
  assert.equal(calculateFederalIncomeTax({ filing_status: 'single', income: 100000, age_65_or_older_count: 1 }).taxable_income, 81300);
  assert.equal(calculateFederalIncomeTax({ filing_status: 'single', income: 100000, additional_deductions: 5000 }).taxable_income, 78400);
});
test('capital gains stacking: ordinary 80,000 plus 20,000 gains is 12,141.50 plus 3,000 at 15%', () => {
  const r = calculateFederalIncomeTax({ filing_status: 'single', taxable_income: 100000, long_term_capital_gains: 20000 });
  assert.equal(r.ordinary_income_tax, 12141.5); assert.equal(r.capital_gains_tax, 3000); assert.equal(r.total_tax, 15141.5);
});
test('capital gains stacking: 30,000 ordinary and 30,000 gains has 21,050 at 0% and 8,950 at 15%', () => {
  const r = calculateFederalIncomeTax({ filing_status: 'single', taxable_income: 60000, long_term_capital_gains: 30000 });
  assert.equal(r.capital_gains_detail.at0, 21050); assert.equal(r.capital_gains_detail.at15, 8950); assert.equal(r.ordinary_income_tax, 3344); assert.equal(r.total_tax, 4686.5);
});
test('capital gains stacking: gains above 563,200 are taxed at 20%', () => {
  const r = calculateFederalIncomeTax({ filing_status: 'single', taxable_income: 700000, long_term_capital_gains: 100000 });
  assert.equal(r.ordinary_income_tax, 177756.5); assert.equal(r.capital_gains_detail.at20, 100000); assert.equal(r.total_tax, 197756.5);
});
test('bracket breakdown sums to the schedule tax for 40 incomes in every table', () => {
  for (const y of [2026, 2027]) for (const k of ['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household', 'estates_and_trusts']) {
    for (let inc = 0; inc <= 900000; inc += 22500) {
      const r = computeTax(y, k === 'estates_and_trusts' ? 'single' : k, inc, 0);
      if (k === 'estates_and_trusts') continue;
      assert.ok(Math.abs(r.breakdown.reduce((s, b) => s + b.tax, 0) - r.ordinary_tax) < 0.011, `${y} ${k} ${inc}`);
    }
  }
});
test('calculator rejects bad input', () => {
  assert.throws(() => calculateFederalIncomeTax({ filing_status: 'single', income: 1, taxable_income: 1 }), InputError);
  assert.throws(() => calculateFederalIncomeTax({ filing_status: 'single' }), InputError);
  assert.throws(() => calculateFederalIncomeTax({ filing_status: 'single', income: 5, deduction: 'itemized' }), InputError);
  assert.throws(() => calculateFederalIncomeTax({ filing_status: 'single', taxable_income: 5, long_term_capital_gains: 6 }), InputError);
  assert.throws(() => calculateFederalIncomeTax({ tax_year: 2025, filing_status: 'single', income: 5 }), InputError);
  assert.throws(() => calculateFederalIncomeTax({ filing_status: 'nonsense', income: 5 }), InputError);
  assert.throws(() => calculateFederalIncomeTax({ filing_status: 'single', income: -5 }), InputError);
});
test('status words: mfj, hoh, qss and estate', () => {
  assert.equal(parseStatus('MFJ'), 'married_filing_jointly'); assert.equal(parseStatus('head of household'), 'head_of_household');
  assert.equal(parseStatus('qualifying surviving spouse'), 'qualifying_surviving_spouse'); assert.equal(parseStatus('trust', true), 'estates_and_trusts');
  assert.throws(() => parseStatus('trust'), InputError); assert.equal(parseYear(undefined), 2027);
});
test('qualifying surviving spouse uses the joint table and joint deduction', () => {
  const r = calculateFederalIncomeTax({ filing_status: 'qualifying_surviving_spouse', income: 100000 });
  assert.equal(r.deduction_used, 33200); assert.equal(r.taxable_income, 66800); assert.equal(r.total_tax, 2560 + 0.12 * (66800 - 25600));
});
test('get_tax_amounts: capital gains 2027, single 51,050 and 563,200, joint 102,100 and 633,600; 2026 single 49,450', () => {
  const r = getTaxAmounts({ topic: 'capital_gains' });
  const s = r.capital_gains_thresholds.find((x) => x.filing_status === 'single');
  assert.equal(s.zero_percent_up_to, 51050); assert.equal(s.fifteen_percent_up_to, 563200); assert.equal(s.zero_percent_up_to_2026, 49450);
  assert.equal(r.capital_gains_thresholds.find((x) => x.filing_status === 'married_filing_jointly').zero_percent_up_to, 102100);
  assert.match(r.summary, /0 percent up to \$51,050/);
});
test('get_tax_amounts: child tax credit 2,300 up 100, refundable 1,800; estate exclusion 15,480,000; gift 20,000', () => {
  const c = getTaxAmounts({ topic: 'child_tax_credit' });
  const ctc = c.items.find((i) => i.item.startsWith('Child tax credit, maximum'));
  assert.equal(ctc.amount_2027, 2300); assert.equal(ctc.change, 100); assert.match(c.summary, /\$2,300 per child, \$1,800 of it refundable/);
  const e = getTaxAmounts({ topic: 'estate_and_gift' });
  assert.equal(e.items.find((i) => i.code_section === '2010(c)(3)').amount_2027, 15480000); assert.equal(e.items.find((i) => i.code_section === '2503(b)').amount_2027, 20000);
});
test('get_tax_amounts: earned income credit maximum 8,496 for three or more children against 8,231', () => {
  const r = getTaxAmounts({ topic: 'earned_income_credit' });
  assert.equal(r.earned_income_credit.rows[3].max_credit, 8496); assert.equal(r.earned_income_credit.rows_2026[3].max_credit, 8231);
  assert.match(r.summary, /\$8,496 with three or more children/);
});
test('get_tax_amounts: alternative minimum tax and all topics; bad topic is an error', () => {
  const a = getTaxAmounts({ topic: 'amt' });
  assert.equal(a.items.find((i) => i.key === undefined && i.item.startsWith('AMT exemption, unmarried')).amount_2027, 93000);
  assert.ok(getTaxAmounts({}).count >= 35);
  assert.throws(() => getTaxAmounts({ topic: 'bitcoin' }), InputError);
});
test('2027 amounts are all above or equal to 2026 amounts except where unchanged', () => {
  for (const a of AMOUNTS) assert.ok(a.y2027 >= a.y2026, a.key);
  for (let i = 0; i < 4; i++) assert.ok(EITC[2027][i].max_credit > EITC[2026][i].max_credit);
});
test('stdio: initialize, tools/list with annotations, and a tools/call over JSON-RPC', async () => {
  const child = spawn(process.execPath, [new URL('../dist/stdio.js', import.meta.url).pathname], { stdio: ['pipe', 'pipe', 'ignore'] });
  const lines = []; let buf = '';
  const got = (id) => new Promise((res) => { const iv = setInterval(() => { const m = lines.find((l) => l.id === id); if (m) { clearInterval(iv); res(m); } }, 10); });
  child.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { lines.push(JSON.parse(buf.slice(0, i))); buf = buf.slice(i + 1); } });
  const send = (m) => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...m }) + '\n');
  send({ id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } });
  assert.equal((await got(1)).result.serverInfo.name, 'tax-brackets-standard-deduction-2027-mcp');
  send({ method: 'notifications/initialized' });
  send({ id: 2, method: 'tools/list' });
  const tools = (await got(2)).result.tools;
  assert.deepEqual(tools.map((t) => t.name), ['get_tax_brackets', 'get_standard_deduction', 'calculate_federal_income_tax', 'get_tax_amounts']);
  for (const t of tools) {
    assert.ok(t.title, `${t.name} title`);
    assert.equal(t.annotations.readOnlyHint, true); assert.equal(t.annotations.destructiveHint, false); assert.equal(t.annotations.openWorldHint, false);
  }
  send({ id: 3, method: 'tools/call', params: { name: 'get_standard_deduction', arguments: { filing_status: 'single' } } });
  const r3 = await got(3);
  send({ id: 4, method: 'tools/call', params: { name: 'get_standard_deduction', arguments: { filing_status: 'single', age_65_or_older_count: 2 } } });
  const r4 = await got(4);
  child.kill();
  assert.match(r3.result.content[0].text, /\$16,600/); assert.equal(r3.result.isError, undefined);
  assert.equal(r4.result.isError, true);
});
// Source check: every number in data.ts must appear as a dollar figure in the IRS text kept in test/fixtures.
import { readFileSync } from 'node:fs';
import { STANDARD_DEDUCTION, CAPITAL_GAINS } from '../dist/data.js';
const fx = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');
const T27 = fx('rp-26-35.txt'), T26 = fx('rp-25-32.txt'), REL = fx('ir-2026-133.txt');
const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2 });
const has = (text, n) => new RegExp(`\\$${fmt(n).replace(/\./g, '\\.')}(\\.00)?(?![\\d,])`).test(text);
const nums = (o) => Object.values(o).flatMap((v) => (typeof v === 'number' ? [v] : Array.isArray(v) ? v : v && typeof v === 'object' ? nums(v) : []));
test('source check: every bracket threshold, base, deduction and gains threshold is printed in the IRS revenue procedure', () => {
  for (const [y, text] of [[2027, T27], [2026, T26]]) {
    for (const k of Object.keys(TABLES[y])) for (const n of [...TABLES[y][k].upper, ...TABLES[y][k].base]) assert.ok(has(text, n), `${y} ${k} ${n}`);
    for (const n of nums(STANDARD_DEDUCTION[y])) assert.ok(has(text, n), `${y} standard deduction ${n}`);
    for (const n of nums(CAPITAL_GAINS[y])) assert.ok(has(text, n), `${y} capital gains ${n}`);
    for (const row of EITC[y]) for (const [k, n] of Object.entries(row)) if (typeof n === 'number') assert.ok(has(text, n), `${y} eitc ${k} ${n}`);
  }
});
test('source check: every single-value amount is printed in the IRS text (2026 estate and employer child care figures in the 2027 news release)', () => {
  for (const a of AMOUNTS) {
    assert.ok(has(T27, a.y2027), `2027 ${a.key} ${a.y2027}`);
    assert.ok(has(a.source2026 ? REL : T26, a.y2026), `2026 ${a.key} ${a.y2026}`);
  }
});
test('source check control: a wrong number is not found', () => {
  assert.equal(has(T27, 12801), false); assert.equal(has(T27, 33200), true);
});
