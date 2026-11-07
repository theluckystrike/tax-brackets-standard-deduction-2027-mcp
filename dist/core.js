// Pure core for tax-brackets-standard-deduction-2027-mcp. No I/O: every figure is in data.ts, copied from
// IRS Rev. Proc. 2026-35 (tax year 2027) and Rev. Proc. 2025-32 (tax year 2026).
import { AMOUNTS, CAPITAL_GAINS, EITC, RATES, SOURCES, STANDARD_DEDUCTION, TABLES, } from './data.js';
export const REPO = 'tax-brackets-standard-deduction-2027-mcp';
export const SITE = 'https://www.mcpstamp.com';
export const UTM = `utm_source=mcp&utm_medium=${REPO}`;
export const more = () => `${SITE}/servers/?${UTM}`;
export class InputError extends Error {
}
export const STATUSES = ['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household', 'qualifying_surviving_spouse'];
const LABEL = {
    single: 'Single',
    married_filing_jointly: 'Married filing jointly',
    married_filing_separately: 'Married filing separately',
    head_of_household: 'Head of household',
    qualifying_surviving_spouse: 'Qualifying surviving spouse (uses the joint table)',
    estates_and_trusts: 'Estates and trusts',
};
export const money = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const pct = (r) => `${Math.round(r * 1000) / 10}%`;
const signed = (n) => (n > 0 ? `up ${money(n)}` : n < 0 ? `down ${money(-n)}` : 'unchanged');
export function parseYear(y) {
    const n = y === undefined || y === null || y === '' ? 2027 : Number(y);
    if (n !== 2026 && n !== 2027)
        throw new InputError('tax_year must be 2026 or 2027. This server holds the IRS inflation adjustments for those two tax years only.');
    return n;
}
export const otherYear = (y) => (y === 2027 ? 2026 : 2027);
/** Map user words to a filing status. */
export function parseStatus(s, allowTrust = false) {
    const v = String(s ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    const map = {
        single: 'single', unmarried: 'single', s: 'single',
        married_filing_jointly: 'married_filing_jointly', married_jointly: 'married_filing_jointly', joint: 'married_filing_jointly', mfj: 'married_filing_jointly', married: 'married_filing_jointly',
        married_filing_separately: 'married_filing_separately', married_separately: 'married_filing_separately', separate: 'married_filing_separately', mfs: 'married_filing_separately',
        head_of_household: 'head_of_household', hoh: 'head_of_household', head: 'head_of_household',
        qualifying_surviving_spouse: 'qualifying_surviving_spouse', surviving_spouse: 'qualifying_surviving_spouse', qss: 'qualifying_surviving_spouse', qualifying_widow: 'qualifying_surviving_spouse', qualifying_widower: 'qualifying_surviving_spouse',
        ...(allowTrust ? { estates_and_trusts: 'estates_and_trusts', estate: 'estates_and_trusts', trust: 'estates_and_trusts', estates: 'estates_and_trusts' } : {}),
    };
    const hit = map[v];
    if (!hit)
        throw new InputError(`filing_status "${String(s)}" is not recognised. Use single, married_filing_jointly, married_filing_separately, head_of_household or qualifying_surviving_spouse${allowTrust ? ' (or estates_and_trusts)' : ''}.`);
    return hit;
}
const tableKey = (s) => (s === 'qualifying_surviving_spouse' ? 'married_filing_jointly' : s);
/** Brackets for a table: rate, bottom, top and the printed "tax at the bottom of the bracket". */
export function bracketsFor(year, key) {
    const t = TABLES[year][key];
    const rates = RATES[key];
    return rates.map((rate, i) => ({
        rate,
        from: i === 0 ? 0 : t.upper[i - 1],
        to: i < t.upper.length ? t.upper[i] : null,
        base: i === 0 ? 0 : t.base[i - 1],
    }));
}
/** Tax base amount recomputed from rates and thresholds (used by tests to check the printed IRS bases). */
export function derivedBases(year, key) {
    const rows = bracketsFor(year, key);
    const out = [0];
    for (let i = 1; i < rows.length; i++)
        out.push(r2(out[i - 1] + rows[i - 1].rate * (rows[i - 1].to - rows[i - 1].from)));
    return out.slice(1);
}
/** Ordinary income tax from the IRS rate schedule (the printed "tax is" formula). */
export function scheduleTax(year, key, taxable) {
    const rows = bracketsFor(year, key);
    const income = Math.max(0, taxable);
    const row = [...rows].reverse().find((r) => income > r.from) ?? rows[0];
    return r2(row.base + row.rate * (income - row.from));
}
export function bracketOf(year, key, taxable) {
    const rows = bracketsFor(year, key);
    return [...rows].reverse().find((r) => taxable > r.from) ?? rows[0];
}
export function maxCounts(status) { return status === 'married_filing_jointly' ? 2 : 1; }
export function standardDeduction(year, status, o = {}) {
    const sd = STANDARD_DEDUCTION[year];
    const key = tableKey(status);
    const aged = o.aged ?? 0, blind = o.blind ?? 0;
    const cap = maxCounts(status);
    if (!Number.isInteger(aged) || aged < 0 || aged > cap)
        throw new InputError(`age_65_or_older_count must be a whole number from 0 to ${cap} for ${LABEL[status]}.`);
    if (!Number.isInteger(blind) || blind < 0 || blind > cap)
        throw new InputError(`blind_count must be a whole number from 0 to ${cap} for ${LABEL[status]}.`);
    const unmarried = status === 'single' || status === 'head_of_household';
    const extraEach = unmarried ? sd.aged_or_blind_unmarried : sd.aged_or_blind;
    const additional = (aged + blind) * extraEach;
    if (o.dependent) {
        const earned = o.earned ?? 0;
        if (!(earned >= 0))
            throw new InputError('earned_income must be zero or more.');
        const base = Math.min(sd[key], Math.max(sd.dependent_floor, sd.dependent_plus_earned + earned));
        return { base, additional, total: base + additional, extra_each: extraEach, rule: 'dependent' };
    }
    return { base: sd[key], additional, total: sd[key] + additional, extra_each: extraEach, rule: 'regular' };
}
// ---------------------------------------------------------------- tool: brackets
export function getTaxBrackets(a) {
    const year = parseYear(a.tax_year);
    const compare = a.compare !== false;
    const keys = [];
    if (a.filing_status) {
        const s = parseStatus(a.filing_status, true);
        keys.push(s);
    }
    else {
        keys.push('single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household');
    }
    const prev = otherYear(year);
    const tables = keys.map((s) => {
        const key = tableKey(s);
        const rows = bracketsFor(year, key);
        const other = bracketsFor(prev, key);
        return {
            filing_status: s,
            label: LABEL[s],
            brackets: rows.map((r, i) => ({
                rate_percent: Math.round(r.rate * 1000) / 10,
                taxable_income_over: r.from,
                taxable_income_up_to: r.to,
                tax_at_bottom_of_bracket: r.base,
                range: r.to === null ? `over ${money(r.from)}` : `${money(r.from)} to ${money(r.to)}`,
                ...(compare ? { [`up_to_${prev}`]: other[i].to, [`change_in_top_of_bracket`]: r.to !== null && other[i].to !== null ? r.to - other[i].to : null } : {}),
            })),
        };
    });
    const first = tables[0];
    const sample = first.brackets.map((b) => `${b.rate_percent}% ${b.range}`).join(', ');
    const s = SOURCES[year];
    return {
        summary: `${year} federal income tax brackets (${s.revproc}, announced ${s.released}, for ${s.applies_to}). ${first.label}: ${sample}. These are taxable income thresholds, after the standard or itemized deduction.` +
            (tables.length > 1 ? ` Brackets for ${tables.length - 1} other filing status${tables.length > 2 ? 'es' : ''} are in the data.` : ''),
        tax_year: year,
        tables,
        note: 'Thresholds apply to taxable income, which is income after the standard or itemized deduction. The rates are 10, 12, 22, 24, 32, 35 and 37 percent. Qualifying surviving spouses use the joint table. Capital gains and qualified dividends have their own 0, 15 and 20 percent thresholds (use get_tax_amounts).',
        as_of: `${s.released} (${s.release}); data checked 2026-11-07`,
        source: s.revproc_url, news_release: s.release_url,
        more: more(),
    };
}
// ---------------------------------------------------------------- tool: standard deduction
export function getStandardDeduction(a) {
    const year = parseYear(a.tax_year);
    const status = parseStatus(a.filing_status);
    const o = { aged: a.age_65_or_older_count ?? 0, blind: a.blind_count ?? 0, dependent: a.can_be_claimed_as_dependent === true, earned: a.earned_income };
    const cur = standardDeduction(year, status, o);
    const prev = standardDeduction(otherYear(year), status, o);
    const sd = STANDARD_DEDUCTION[year];
    const s = SOURCES[year];
    const parts = [`The ${year} standard deduction for ${LABEL[status].toLowerCase()} is ${money(cur.base)}`];
    if (o.dependent)
        parts[0] += ' under the dependent rule (the greater of ' + money(sd.dependent_floor) + ' or ' + money(sd.dependent_plus_earned) + ' plus earned income, capped at the regular amount)';
    if (cur.additional)
        parts.push(`plus ${money(cur.additional)} for age 65 or older or blindness (${money(cur.extra_each)} each), ${money(cur.total)} in all`);
    const diff = r2(cur.total - prev.total);
    return {
        summary: `${parts.join(', ')}. In ${otherYear(year)} the same facts give ${money(prev.total)}, so it is ${signed(diff)}. Source: ${s.revproc} section ${year === 2027 ? '3.15' : '4.14'}, announced ${s.released}.`,
        tax_year: year, filing_status: status, label: LABEL[status],
        base_standard_deduction: cur.base, additional_for_age_or_blindness: cur.additional, total_standard_deduction: cur.total,
        additional_each: cur.extra_each, applied_rule: cur.rule,
        other_year: { tax_year: otherYear(year), total_standard_deduction: prev.total, change: diff },
        all_filing_statuses: {
            married_filing_jointly: sd.married_filing_jointly, head_of_household: sd.head_of_household, single: sd.single, married_filing_separately: sd.married_filing_separately,
        },
        dependent_rule: { greater_of_floor: sd.dependent_floor, or_earned_income_plus: sd.dependent_plus_earned },
        note: 'The extra amount is for each taxpayer who is 65 or older by the end of the tax year or blind. Unmarried filers (single or head of household) get the higher extra amount. Married filing separately may count a spouse only in narrow cases, so the counts are limited to one for that status here.',
        as_of: `${s.released} (${s.release}); data checked 2026-11-07`,
        source: s.revproc_url, news_release: s.release_url, more: more(),
    };
}
function capGainsTax(year, key, ordinary, gains) {
    const t = CAPITAL_GAINS[year][key];
    const total = ordinary + gains;
    const at0 = Math.max(0, Math.min(total, t.zero_max) - ordinary);
    const at15 = Math.max(0, Math.min(total, t.fifteen_max) - Math.max(ordinary, t.zero_max));
    const at20 = Math.max(0, total - Math.max(ordinary, t.fifteen_max));
    return { at0: r2(at0), at15: r2(at15), at20: r2(at20), tax: r2(at15 * 0.15 + at20 * 0.2), zero_max: t.zero_max, fifteen_max: t.fifteen_max };
}
export function computeTax(year, status, taxable, gains = 0) {
    const key = tableKey(status);
    const gainsIn = Math.min(Math.max(0, gains), Math.max(0, taxable));
    const ordinary = Math.max(0, taxable - gainsIn);
    const rows = bracketsFor(year, key);
    const breakdown = rows.map((r) => {
        const top = r.to === null ? Infinity : r.to;
        const inBracket = Math.max(0, Math.min(ordinary, top) - r.from);
        return { rate_percent: Math.round(r.rate * 1000) / 10, from: r.from, to: r.to, income_in_bracket: r2(inBracket), tax: r2(inBracket * r.rate) };
    }).filter((b) => b.income_in_bracket > 0);
    const ordinaryTax = scheduleTax(year, key, ordinary);
    const cg = gainsIn > 0 ? capGainsTax(year, key, ordinary, gainsIn) : null;
    const total = r2(ordinaryTax + (cg?.tax ?? 0));
    const marginal = bracketOf(year, key, ordinary).rate;
    return { taxable_income: taxable, ordinary_income: ordinary, ordinary_tax: ordinaryTax, capital_gains: cg, total_tax: total, marginal_rate: marginal, breakdown };
}
export function calculateFederalIncomeTax(a) {
    const year = parseYear(a.tax_year);
    const status = parseStatus(a.filing_status);
    const hasIncome = a.income !== undefined && a.income !== null;
    const hasTaxable = a.taxable_income !== undefined && a.taxable_income !== null;
    if (hasIncome === hasTaxable)
        throw new InputError('Give exactly one of income (gross income or AGI, before the deduction) or taxable_income (after the deduction).');
    const gains = a.long_term_capital_gains ?? 0;
    if (!(gains >= 0))
        throw new InputError('long_term_capital_gains must be zero or more.');
    const extra = a.additional_deductions ?? 0;
    if (!(extra >= 0))
        throw new InputError('additional_deductions must be zero or more.');
    const method = a.deduction ?? 'standard';
    if (method !== 'standard' && method !== 'itemized')
        throw new InputError('deduction must be "standard" or "itemized".');
    const build = (y) => {
        let taxable, ded = 0, dedNote = '';
        if (hasTaxable) {
            taxable = a.taxable_income;
            if (!(taxable >= 0))
                throw new InputError('taxable_income must be zero or more.');
            dedNote = 'taxable income was given directly';
        }
        else {
            const income = a.income;
            if (!(income >= 0))
                throw new InputError('income must be zero or more.');
            if (method === 'itemized') {
                if (!(a.itemized_deductions !== undefined && a.itemized_deductions >= 0))
                    throw new InputError('itemized_deductions is required when deduction is "itemized".');
                ded = a.itemized_deductions;
                dedNote = 'itemized deductions as given';
            }
            else {
                ded = standardDeduction(y, status, { aged: a.age_65_or_older_count, blind: a.blind_count }).total;
                dedNote = `${y} standard deduction`;
            }
            taxable = Math.max(0, income - ded - extra);
        }
        if (gains > taxable)
            throw new InputError('long_term_capital_gains cannot exceed taxable income (gains are part of it).');
        return { ...computeTax(y, status, taxable, gains), deduction_used: ded, deduction_note: dedNote };
    };
    const cur = build(year);
    const alt = build(otherYear(year));
    const diff = r2(cur.total_tax - alt.total_tax);
    const base = hasIncome ? a.income : cur.taxable_income;
    const effective = base > 0 ? Math.round((cur.total_tax / base) * 10000) / 100 : 0;
    const s = SOURCES[year];
    const inputText = hasIncome
        ? `${money(a.income)} of income less a ${money(cur.deduction_used + extra)} deduction`
        : `${money(cur.taxable_income)} of taxable income`;
    return {
        summary: `${year} federal income tax for ${LABEL[status].toLowerCase()} on ${inputText} (taxable income ${money(cur.taxable_income)}) is ${money(cur.total_tax)}. ` +
            `The marginal rate is ${pct(cur.marginal_rate)} and the average rate is ${effective}% of ${hasIncome ? 'income' : 'taxable income'}. ` +
            `Under ${otherYear(year)} rules the same facts give ${money(alt.total_tax)}, so the ${year} tax is ${diff === 0 ? 'the same' : diff < 0 ? `${money(-diff)} lower` : `${money(diff)} higher`}.` +
            ' This is federal income tax only. It leaves out credits, self-employment tax, net investment income tax, the alternative minimum tax and state tax.',
        tax_year: year, filing_status: status, label: LABEL[status],
        inputs: { income: a.income ?? null, taxable_income: a.taxable_income ?? null, deduction: hasTaxable ? 'given' : method, additional_deductions: extra, long_term_capital_gains: gains },
        deduction_used: cur.deduction_used, deduction_note: cur.deduction_note,
        taxable_income: cur.taxable_income, ordinary_income: cur.ordinary_income,
        ordinary_income_tax: cur.ordinary_tax, capital_gains_tax: cur.capital_gains?.tax ?? 0, total_tax: cur.total_tax,
        marginal_rate_percent: Math.round(cur.marginal_rate * 1000) / 10, average_rate_percent: effective,
        bracket_breakdown: cur.breakdown,
        capital_gains_detail: cur.capital_gains,
        compare_other_year: { tax_year: otherYear(year), taxable_income: alt.taxable_income, total_tax: alt.total_tax, difference_this_year_minus_other: diff },
        note: 'Ordinary income tax uses the IRS rate schedule for the filing status. Long-term gains and qualified dividends are stacked on top of ordinary income and taxed at 0, 15 or 20 percent using the section 1(j)(5) thresholds. Other deductions that reduce taxable income (qualified business income, the new deductions for seniors, tips, overtime or car loan interest) can be passed in additional_deductions once you have worked out the amount.',
        as_of: `${s.released} (${s.release}); data checked 2026-11-07`,
        source: s.revproc_url, news_release: s.release_url, more: more(),
    };
}
// ---------------------------------------------------------------- tool: other amounts
export const TOPICS = ['capital_gains', 'child_tax_credit', 'earned_income_credit', 'amt', 'estate_and_gift', 'business', 'other'];
export function getTaxAmounts(a) {
    const year = a.tax_year === undefined ? 2027 : parseYear(a.tax_year);
    const topic = (a.topic ?? 'all').toLowerCase();
    if (topic !== 'all' && !TOPICS.includes(topic))
        throw new InputError(`topic must be one of ${TOPICS.join(', ')} or all.`);
    const want = (t) => topic === 'all' || topic === t;
    const prev = otherYear(year);
    const yv = (x, y) => (y === 2027 ? x.y2027 : x.y2026);
    const items = AMOUNTS.filter((x) => want(x.topic)).map((x) => ({
        topic: x.topic, item: x.label, code_section: x.section,
        [`amount_${year}`]: yv(x, year), [`amount_${prev}`]: yv(x, prev), change: r2(yv(x, year) - yv(x, prev)),
        ...(x.note ? { note: x.note } : {}),
    }));
    const gains = want('capital_gains')
        ? Object.keys(CAPITAL_GAINS[year]).map((k) => ({
            filing_status: k, label: LABEL[k],
            zero_percent_up_to: CAPITAL_GAINS[year][k].zero_max, fifteen_percent_up_to: CAPITAL_GAINS[year][k].fifteen_max, twenty_percent_above: CAPITAL_GAINS[year][k].fifteen_max,
            [`zero_percent_up_to_${prev}`]: CAPITAL_GAINS[prev][k].zero_max, [`fifteen_percent_up_to_${prev}`]: CAPITAL_GAINS[prev][k].fifteen_max,
        }))
        : undefined;
    const eitc = want('earned_income_credit') ? { tax_year: year, rows: EITC[year], [`rows_${prev}`]: EITC[prev] } : undefined;
    const s = SOURCES[year];
    const lead = [];
    if (gains) {
        const sg = CAPITAL_GAINS[year].single, mj = CAPITAL_GAINS[year].married_filing_jointly;
        lead.push(`${year} long-term capital gains are taxed at 0 percent up to ${money(sg.zero_max)} of taxable income for single filers (${money(mj.zero_max)} joint) and 15 percent up to ${money(sg.fifteen_max)} (${money(mj.fifteen_max)} joint), then 20 percent.`);
    }
    const ctc = items.find((i) => i.item.startsWith('Child tax credit, maximum'));
    if (ctc)
        lead.push(`The child tax credit is ${money(yv(AMOUNTS.find((x) => x.key === 'child_tax_credit'), year))} per child, ${money(yv(AMOUNTS.find((x) => x.key === 'child_tax_credit_refundable'), year))} of it refundable.`);
    if (eitc) {
        const three = EITC[year][3];
        lead.push(`The maximum earned income credit is ${money(three.max_credit)} with three or more children.`);
    }
    const est = items.find((i) => i.item.startsWith('Estate tax basic'));
    if (est)
        lead.push(`The estate and gift tax basic exclusion is ${money(yv(AMOUNTS.find((x) => x.key === 'estate_basic_exclusion'), year))} and the gift annual exclusion is ${money(yv(AMOUNTS.find((x) => x.key === 'gift_annual_exclusion'), year))}.`);
    if (!lead.length)
        lead.push(`${items.length} adjusted ${topic === 'all' ? '' : topic.replace(/_/g, ' ') + ' '}amounts for ${year}.`);
    return {
        summary: `${lead.join(' ')} Source: ${s.revproc}, announced ${s.released}, with ${prev} figures from ${SOURCES[prev].revproc} for comparison.`,
        tax_year: year, topic, count: items.length, items,
        capital_gains_thresholds: gains, earned_income_credit: eitc,
        note: 'Amounts apply to taxable years beginning in the year shown. The revenue procedure states that if Congress amends the Code after its release date, taxpayers should look for further guidance.',
        as_of: `${s.released} (${s.release}); data checked 2026-11-07`,
        source: s.revproc_url, news_release: s.release_url, more: more(),
    };
}
