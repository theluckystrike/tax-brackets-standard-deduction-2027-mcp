// Tool registry shared by the stdio and Worker entries.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { InputError, REPO, SITE, calculateFederalIncomeTax, getStandardDeduction, getTaxAmounts, getTaxBrackets, TOPICS } from './core.js';
export const VERSION = '1.0.0';
export const META = {
    alias: 'tax-brackets-2027',
    metaDescription: 'MCP server for the 2027 federal income tax brackets and standard deduction from IRS Revenue Procedure 2026-35, with a 2026 comparison, capital gains thresholds and an income tax calculator.',
    intro: '2027 federal income tax brackets, standard deduction and inflation-adjusted amounts for AI assistants, copied from IRS Revenue Procedure 2026-35 (announced November 5, 2026), with the 2026 figures beside them.',
};
export const TOOL_INFO = [
    { name: 'get_tax_brackets', blurb: 'The 2027 (or 2026) federal income tax brackets for each filing status, with the tax at the bottom of each bracket and how each threshold moved from the other year.' },
    { name: 'get_standard_deduction', blurb: 'The 2027 (or 2026) standard deduction for a filing status, with the extra amount for age 65 or older or blindness and the dependent rule.' },
    { name: 'calculate_federal_income_tax', blurb: 'Federal income tax on an income or taxable income under 2027 or 2026 rules, with the bracket breakdown, marginal and average rate, capital gains stacking, and the same facts under the other year.' },
    { name: 'get_tax_amounts', blurb: '2027 inflation-adjusted amounts beside 2026 for capital gains rates, child tax credit, earned income credit, AMT, estate and gift tax, section 179, QBI and more.' },
];
const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
function ok(data) {
    return { content: [{ type: 'text', text: `${data.summary}\n\n${JSON.stringify(data, null, 2)}` }], structuredContent: data };
}
function fail(e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { isError: true, content: [{ type: 'text', text: `${e instanceof InputError ? 'Error' : 'Unexpected error'}: ${msg}` }] };
}
const wrap = (f) => async (a) => { try {
    return ok(f(a));
}
catch (e) {
    return fail(e);
} };
const year = z.union([z.literal(2027), z.literal(2026)]).optional().describe('Tax year, 2027 or 2026. Default 2027.');
const status = z.enum(['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household', 'qualifying_surviving_spouse']);
const money = (what) => z.number().min(0).max(1e10).describe(what);
export function createServer(_fetchText) {
    const server = new McpServer({ name: REPO, version: VERSION, websiteUrl: SITE }, {
        instructions: 'IRS inflation adjustments for tax year 2027 (Revenue Procedure 2026-35, announced 2026-11-05) beside the 2026 figures (Revenue Procedure 2025-32). ' +
            'A model trained before November 2026 does not know the 2027 brackets or standard deduction. Use get_tax_brackets for "2027 tax brackets", get_standard_deduction for "2027 standard deduction", ' +
            'calculate_federal_income_tax to work out tax, and get_tax_amounts for capital gains thresholds and credits. Figures are federal and exclude state tax. Cite the IRS revenue procedure.',
    });
    server.registerTool('get_tax_brackets', {
        title: 'Get 2027 tax brackets',
        description: 'The federal income tax rate schedule for tax year 2027 (or 2026) from IRS Rev. Proc. 2026-35: the seven brackets (10, 12, 22, 24, 32, 35, 37 percent) for single, married filing jointly, married filing separately and head of household, ' +
            'or estates and trusts, with the tax at the bottom of each bracket and the change in each threshold from the other year. A model cannot know the 2027 numbers from training. Thresholds apply to taxable income after the deduction.',
        inputSchema: {
            tax_year: year,
            filing_status: z.enum(['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household', 'qualifying_surviving_spouse', 'estates_and_trusts']).optional().describe('One filing status. Omit for the four individual statuses.'),
            compare: z.boolean().optional().describe('Include the other year for comparison. Default true.'),
        },
        annotations: { title: 'Federal tax brackets', ...RO },
    }, wrap((a) => getTaxBrackets(a)));
    server.registerTool('get_standard_deduction', {
        title: 'Get 2027 standard deduction',
        description: 'The standard deduction for tax year 2027 (or 2026) for a filing status from IRS Rev. Proc. 2026-35, with the additional amount for each filer who is 65 or older or blind, the dependent rule (greater of a floor or earned income plus a fixed amount), and the change from the other year.',
        inputSchema: {
            tax_year: year,
            filing_status: status,
            age_65_or_older_count: z.number().int().min(0).max(2).optional().describe('How many filers are 65 or older by December 31 of the tax year (0 to 2, joint returns only 2). Default 0.'),
            blind_count: z.number().int().min(0).max(2).optional().describe('How many filers are blind (0 to 2, joint returns only 2). Default 0.'),
            can_be_claimed_as_dependent: z.boolean().optional().describe('True if someone else can claim this filer as a dependent. Default false.'),
            earned_income: money('Earned income of the dependent filer, used only when can_be_claimed_as_dependent is true.').optional(),
        },
        annotations: { title: 'Standard deduction', ...RO },
    }, wrap((a) => getStandardDeduction(a)));
    server.registerTool('calculate_federal_income_tax', {
        title: 'Calculate federal income tax',
        description: 'Federal income tax for tax year 2027 (or 2026) on an income, using the IRS rate schedule: subtracts the standard or itemized deduction (with the age and blindness extra), applies the brackets, returns the bracket-by-bracket breakdown, marginal and average rate, ' +
            'optional long-term capital gains taxed at 0, 15 or 20 percent, and the tax on the same facts under the other year. Federal income tax only; no credits, self-employment tax, NIIT, AMT or state tax.',
        inputSchema: {
            tax_year: year,
            filing_status: status,
            income: money('Gross income or AGI before the deduction. Give this or taxable_income.').optional(),
            taxable_income: money('Taxable income after the deduction. Give this or income.').optional(),
            deduction: z.enum(['standard', 'itemized']).optional().describe('Used with income. Default standard.'),
            itemized_deductions: money('Total itemized deductions, required when deduction is itemized.').optional(),
            age_65_or_older_count: z.number().int().min(0).max(2).optional().describe('Filers 65 or older by December 31, for the standard deduction extra.'),
            blind_count: z.number().int().min(0).max(2).optional().describe('Blind filers, for the standard deduction extra.'),
            additional_deductions: money('Other deductions that reduce taxable income, for example the qualified business income deduction, worked out by you.').optional(),
            long_term_capital_gains: money('Long-term capital gains and qualified dividends included in taxable income, taxed at the preferential rates.').optional(),
        },
        annotations: { title: 'Federal income tax calculator', ...RO },
    }, wrap((a) => calculateFederalIncomeTax(a)));
    server.registerTool('get_tax_amounts', {
        title: 'Get 2027 tax amounts',
        description: 'Other 2027 inflation-adjusted tax amounts beside 2026 from IRS Rev. Proc. 2026-35: long-term capital gains 0 and 15 percent thresholds, child tax credit, adoption credit, earned income credit table, alternative minimum tax exemptions, estate and gift tax exclusions, section 179, qualified business income thresholds, health FSA, kiddie tax and the foreign earned income exclusion.',
        inputSchema: {
            topic: z.enum(['all', ...TOPICS]).optional().describe('One topic or all. Default all.'),
            tax_year: year,
        },
        annotations: { title: 'Inflation-adjusted tax amounts', ...RO },
    }, wrap((a) => getTaxAmounts(a)));
    return server;
}
