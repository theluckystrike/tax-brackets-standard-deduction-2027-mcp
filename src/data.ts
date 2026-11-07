// Dated, cited tables. Every figure was copied from the IRS documents named in SOURCES on 2026-11-07
// (see DATA_SOURCES.md). Nothing here comes from model memory. The tests re-derive each printed base
// amount from the thresholds and rates, so a mistyped threshold fails the build.

export type TableKey = 'single' | 'married_filing_jointly' | 'married_filing_separately' | 'head_of_household' | 'estates_and_trusts';
export type TaxYear = 2026 | 2027;

export const SOURCES = {
  2027: {
    revproc: 'Rev. Proc. 2026-35',
    revproc_url: 'https://www.irs.gov/pub/irs-drop/rp-26-35.pdf',
    release: 'IR-2026-133',
    release_url: 'https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2027-taxpayers-continue-to-benefit-from-the-working-families-tax-cuts',
    released: '2026-11-05',
    applies_to: 'taxable years beginning in 2027 (returns filed in 2028)',
  },
  2026: {
    revproc: 'Rev. Proc. 2025-32',
    revproc_url: 'https://www.irs.gov/pub/irs-drop/rp-25-32.pdf',
    release: 'IR-2025-103',
    release_url: 'https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill',
    released: '2025-10-09',
    applies_to: 'taxable years beginning in 2026 (returns filed in 2027)',
  },
} as const;

/** Statutory rates of section 1(j) for individuals, and of section 1(e) as modified for estates and trusts. */
export const RATES: Record<TableKey, number[]> = {
  single: [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37],
  married_filing_jointly: [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37],
  married_filing_separately: [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37],
  head_of_household: [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37],
  estates_and_trusts: [0.10, 0.24, 0.35, 0.37],
};

/** upper: the top of every bracket except the last. base: "The Tax Is" amount printed at the bottom of brackets 2..n. */
export interface RawTable { upper: number[]; base: number[] }

export const TABLES: Record<TaxYear, Record<TableKey, RawTable>> = {
  2027: {
    // Rev. Proc. 2026-35 section 3.01, Tables 1 to 5
    married_filing_jointly: { upper: [25600, 104050, 218250, 416650, 529100, 793650], base: [2560.0, 11974.0, 37098.0, 84714.0, 120698.0, 213290.5] },
    head_of_household: { upper: [18250, 69650, 109100, 208300, 264550, 661350], base: [1825.0, 7993.0, 16672.0, 40480.0, 58480.0, 197360.0] },
    single: { upper: [12800, 52025, 109125, 208325, 264550, 661375], base: [1280.0, 5987.0, 18549.0, 42357.0, 60349.0, 199237.75] },
    married_filing_separately: { upper: [12800, 52025, 109125, 208325, 264550, 396825], base: [1280.0, 5987.0, 18549.0, 42357.0, 60349.0, 106645.25] },
    estates_and_trusts: { upper: [3400, 12100, 16500], base: [340, 2428, 3968] },
  },
  2026: {
    // Rev. Proc. 2025-32 section 4.01, Tables 1 to 5
    married_filing_jointly: { upper: [24800, 100800, 211400, 403550, 512450, 768700], base: [2480, 11600, 35932, 82048, 116896, 206583.5] },
    head_of_household: { upper: [17700, 67450, 105700, 201750, 256200, 640600], base: [1770, 7740, 16155, 39207, 56631, 191171] },
    single: { upper: [12400, 50400, 105700, 201775, 256225, 640600], base: [1240, 5800, 17966, 41024, 58448, 192979.25] },
    married_filing_separately: { upper: [12400, 50400, 105700, 201775, 256225, 384350], base: [1240, 5800, 17966, 41024, 58448, 103291.75] },
    estates_and_trusts: { upper: [3300, 11700, 16000], base: [330, 2346, 3851] },
  },
};

/** Standard deduction, section 63(c) and 63(f). Rev. Proc. 2026-35 section 3.15; Rev. Proc. 2025-32 section 4.14. */
export const STANDARD_DEDUCTION: Record<TaxYear, {
  married_filing_jointly: number; head_of_household: number; single: number; married_filing_separately: number;
  dependent_floor: number; dependent_plus_earned: number; aged_or_blind: number; aged_or_blind_unmarried: number;
}> = {
  2027: { married_filing_jointly: 33200, head_of_household: 24925, single: 16600, married_filing_separately: 16600, dependent_floor: 1400, dependent_plus_earned: 500, aged_or_blind: 1700, aged_or_blind_unmarried: 2100 },
  2026: { married_filing_jointly: 32200, head_of_household: 24150, single: 16100, married_filing_separately: 16100, dependent_floor: 1350, dependent_plus_earned: 450, aged_or_blind: 1650, aged_or_blind_unmarried: 2050 },
};

/** Maximum zero rate and maximum 15 percent rate amounts, section 1(j)(5)(B). Rev. Proc. 2026-35 section 3.03; Rev. Proc. 2025-32 section 4.03. */
export const CAPITAL_GAINS: Record<TaxYear, Record<TableKey, { zero_max: number; fifteen_max: number }>> = {
  2027: {
    married_filing_jointly: { zero_max: 102100, fifteen_max: 633600 },
    married_filing_separately: { zero_max: 51050, fifteen_max: 316800 },
    head_of_household: { zero_max: 68350, fifteen_max: 598400 },
    single: { zero_max: 51050, fifteen_max: 563200 },
    estates_and_trusts: { zero_max: 3400, fifteen_max: 16750 },
  },
  2026: {
    married_filing_jointly: { zero_max: 98900, fifteen_max: 613700 },
    married_filing_separately: { zero_max: 49450, fifteen_max: 306850 },
    head_of_household: { zero_max: 66200, fifteen_max: 579600 },
    single: { zero_max: 49450, fifteen_max: 545500 },
    estates_and_trusts: { zero_max: 3300, fifteen_max: 16250 },
  },
};

export type Topic = 'capital_gains' | 'child_tax_credit' | 'earned_income_credit' | 'amt' | 'estate_and_gift' | 'business' | 'other';

export interface Amount { topic: Topic; key: string; label: string; section: string; y2027: number; y2026: number; note?: string; source2026?: string }

/** Single-value adjusted items. Section numbers are the Code sections named in the revenue procedures. */
export const AMOUNTS: Amount[] = [
  { topic: 'child_tax_credit', key: 'child_tax_credit', label: 'Child tax credit, maximum per qualifying child', section: '24(a)', y2027: 2300, y2026: 2200 },
  { topic: 'child_tax_credit', key: 'child_tax_credit_refundable', label: 'Child tax credit, refundable portion', section: '24(d)(1)(A)', y2027: 1800, y2026: 1700 },
  { topic: 'child_tax_credit', key: 'adoption_credit', label: 'Adoption credit, maximum', section: '23', y2027: 18250, y2026: 17670 },
  { topic: 'child_tax_credit', key: 'adoption_credit_refundable', label: 'Adoption credit, refundable portion', section: '23(a)(4)', y2027: 5280, y2026: 5120 },
  { topic: 'child_tax_credit', key: 'adoption_credit_phaseout_start', label: 'Adoption credit, phase-out starts at modified AGI', section: '23(b)(2)(A)', y2027: 273680, y2026: 265080 },
  { topic: 'child_tax_credit', key: 'adoption_credit_phaseout_end', label: 'Adoption credit, fully phased out at modified AGI', section: '23(b)(2)(A)', y2027: 313680, y2026: 305080 },
  { topic: 'earned_income_credit', key: 'eitc_investment_income_limit', label: 'Earned income credit, investment income limit', section: '32(i)', y2027: 12600, y2026: 12200 },
  { topic: 'amt', key: 'amt_exemption_joint', label: 'AMT exemption, married filing jointly and surviving spouses', section: '55(d)(1)', y2027: 144700, y2026: 140200 },
  { topic: 'amt', key: 'amt_exemption_single', label: 'AMT exemption, unmarried individuals', section: '55(d)(1)', y2027: 93000, y2026: 90100 },
  { topic: 'amt', key: 'amt_exemption_separate', label: 'AMT exemption, married filing separately', section: '55(d)(1)', y2027: 72350, y2026: 70100 },
  { topic: 'amt', key: 'amt_exemption_estate_trust', label: 'AMT exemption, estates and trusts', section: '55(d)(1)', y2027: 32500, y2026: 31400 },
  { topic: 'amt', key: 'amt_28_percent_threshold', label: 'AMT 28 percent rate applies above, all taxpayers except married filing separately', section: '55(b)(1)', y2027: 252500, y2026: 244500 },
  { topic: 'amt', key: 'amt_28_percent_threshold_separate', label: 'AMT 28 percent rate applies above, married filing separately', section: '55(b)(1)', y2027: 126250, y2026: 122250 },
  { topic: 'amt', key: 'amt_phaseout_start_joint', label: 'AMT exemption phase-out starts, married filing jointly', section: '55(d)(2)', y2027: 1031900, y2026: 1000000 },
  { topic: 'amt', key: 'amt_phaseout_end_joint', label: 'AMT exemption fully phased out, married filing jointly', section: '55(d)(2)', y2027: 1321300, y2026: 1280400 },
  { topic: 'amt', key: 'amt_phaseout_start_single', label: 'AMT exemption phase-out starts, unmarried individuals and married filing separately', section: '55(d)(2)', y2027: 515950, y2026: 500000 },
  { topic: 'amt', key: 'amt_phaseout_end_single', label: 'AMT exemption fully phased out, unmarried individuals', section: '55(d)(2)', y2027: 701950, y2026: 680200 },
  { topic: 'amt', key: 'amt_phaseout_end_separate', label: 'AMT exemption fully phased out, married filing separately', section: '55(d)(2)', y2027: 660650, y2026: 640200 },
  { topic: 'estate_and_gift', key: 'estate_basic_exclusion', label: 'Estate tax basic exclusion amount (also the gift tax and GST exemption)', section: '2010(c)(3)', y2027: 15480000, y2026: 15000000, note: 'The 2026 figure is the statutory $15,000,000 stated in IR-2026-133 as "up from" for 2026.', source2026: 'IR-2026-133' },
  { topic: 'estate_and_gift', key: 'gift_annual_exclusion', label: 'Gift tax annual exclusion per recipient', section: '2503(b)', y2027: 20000, y2026: 19000 },
  { topic: 'estate_and_gift', key: 'gift_annual_exclusion_noncitizen_spouse', label: 'Gift tax annual exclusion, spouse who is not a US citizen', section: '2523(i)(2)', y2027: 201000, y2026: 194000 },
  { topic: 'estate_and_gift', key: 'special_use_valuation_limit', label: 'Special use valuation, maximum decrease in value of qualified real property', section: '2032A', y2027: 1500000, y2026: 1460000 },
  { topic: 'business', key: 'section_179_limit', label: 'Section 179 expensing limit', section: '179(b)(1)', y2027: 2640000, y2026: 2560000 },
  { topic: 'business', key: 'section_179_suv_limit', label: 'Section 179 limit for sport utility vehicles', section: '179(b)(5)(A)', y2027: 33100, y2026: 32000 },
  { topic: 'business', key: 'section_179_phaseout_start', label: 'Section 179 limit is reduced when property placed in service exceeds', section: '179(b)(2)', y2027: 4230000, y2026: 4090000 },
  { topic: 'business', key: 'qbi_threshold_joint', label: 'Qualified business income deduction, threshold, married filing jointly', section: '199A(e)(2)', y2027: 416600, y2026: 403500 },
  { topic: 'business', key: 'qbi_threshold_other', label: 'Qualified business income deduction, threshold, all other returns', section: '199A(e)(2)', y2027: 208300, y2026: 201750 },
  { topic: 'business', key: 'qbi_threshold_separate', label: 'Qualified business income deduction, threshold, married filing separately', section: '199A(e)(2)', y2027: 208325, y2026: 201775 },
  { topic: 'business', key: 'qbi_phase_in_joint', label: 'Qualified business income deduction, end of phase-in range, married filing jointly', section: '199A(b)(3)(B)', y2027: 566600, y2026: 553500 },
  { topic: 'business', key: 'qbi_phase_in_other', label: 'Qualified business income deduction, end of phase-in range, all other returns', section: '199A(b)(3)(B)', y2027: 283300, y2026: 276750 },
  { topic: 'business', key: 'employer_childcare_credit', label: 'Employer-provided child care credit, maximum', section: '45F(b)', y2027: 515943.67, y2026: 500000, note: 'The 2026 figure is the $500,000 stated in IR-2026-133 as "up from" for 2026.', source2026: 'IR-2026-133' },
  { topic: 'other', key: 'kiddie_tax_threshold', label: 'Kiddie tax, unearned income threshold (also the dependent standard deduction floor)', section: '1(g)(4)(A)(ii)(I)', y2027: 1400, y2026: 1350 },
  { topic: 'other', key: 'health_fsa_limit', label: 'Health flexible spending arrangement, salary reduction limit', section: '125(i)', y2027: 3500, y2026: 3400 },
  { topic: 'other', key: 'health_fsa_carryover', label: 'Health FSA, maximum carryover', section: '125', y2027: 700, y2026: 680 },
  { topic: 'other', key: 'transit_parking_monthly', label: 'Qualified transportation fringe (transit pass and parking), monthly limit', section: '132(f)', y2027: 350, y2026: 340 },
  { topic: 'other', key: 'educator_expense', label: 'Educator expense deduction', section: '62(a)(2)(D)', y2027: 350, y2026: 350 },
  { topic: 'other', key: 'foreign_earned_income_exclusion', label: 'Foreign earned income exclusion', section: '911(b)(2)(D)(i)', y2027: 137300, y2026: 132900 },
];

export interface EitcRow { children: '0' | '1' | '2' | '3_or_more'; earned_income_amount: number; max_credit: number; phaseout_start_joint: number; phaseout_end_joint: number; phaseout_start_other: number; phaseout_end_other: number }

/** Earned income credit parameters. Rev. Proc. 2026-35 section 3.06; Rev. Proc. 2025-32 section 4.06. */
export const EITC: Record<TaxYear, EitcRow[]> = {
  2027: [
    { children: '0', earned_income_amount: 8960, max_credit: 685, phaseout_start_joint: 18730, phaseout_end_joint: 27684, phaseout_start_other: 11210, phaseout_end_other: 20164 },
    { children: '1', earned_income_amount: 13450, max_credit: 4573, phaseout_start_joint: 32170, phaseout_end_joint: 60787, phaseout_start_other: 24660, phaseout_end_other: 53277 },
    { children: '2', earned_income_amount: 18880, max_credit: 7552, phaseout_start_joint: 32170, phaseout_end_joint: 68029, phaseout_start_other: 24660, phaseout_end_other: 60519 },
    { children: '3_or_more', earned_income_amount: 18880, max_credit: 8496, phaseout_start_joint: 32170, phaseout_end_joint: 72512, phaseout_start_other: 24660, phaseout_end_other: 65002 },
  ],
  2026: [
    { children: '0', earned_income_amount: 8680, max_credit: 664, phaseout_start_joint: 18140, phaseout_end_joint: 26820, phaseout_start_other: 10860, phaseout_end_other: 19540 },
    { children: '1', earned_income_amount: 13020, max_credit: 4427, phaseout_start_joint: 31160, phaseout_end_joint: 58863, phaseout_start_other: 23890, phaseout_end_other: 51593 },
    { children: '2', earned_income_amount: 18290, max_credit: 7316, phaseout_start_joint: 31160, phaseout_end_joint: 65899, phaseout_start_other: 23890, phaseout_end_other: 58629 },
    { children: '3_or_more', earned_income_amount: 18290, max_credit: 8231, phaseout_start_joint: 31160, phaseout_end_joint: 70244, phaseout_start_other: 23890, phaseout_end_other: 62974 },
  ],
};
