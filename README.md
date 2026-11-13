# tax-brackets-standard-deduction-2027-mcp

The 2027 federal income tax brackets and standard deduction for AI assistants. Ask for the brackets for your filing status, the standard deduction with the extra for age 65 or blindness, or the tax on an income, and get the figures from IRS Revenue Procedure 2026-35 with the 2026 numbers beside them.

This is a Model Context Protocol (MCP) server. It holds a dated table copied from the IRS revenue procedures, so it makes no network calls and needs no API key.

## Tools

| Tool | What it returns |
| --- | --- |
| `get_tax_brackets` | The seven brackets for 2027 or 2026 by filing status (or estates and trusts), the tax at the bottom of each bracket and how each threshold moved from the other year. |
| `get_standard_deduction` | The standard deduction for a filing status, the extra for each filer who is 65 or older or blind, the dependent rule and the change from the other year. |
| `calculate_federal_income_tax` | Federal income tax on an income or taxable income, with the bracket breakdown, marginal and average rate, long-term capital gains stacking, and the same facts under the other year. |
| `get_tax_amounts` | 2027 amounts beside 2026 for capital gains thresholds, child tax credit, adoption credit, earned income credit, AMT, estate and gift tax, section 179, QBI thresholds, health FSA and more. |

Every result has structured JSON, a one-paragraph summary, `as_of`, `source` and `more` (a page on [mcpstamp.com](https://www.mcpstamp.com/servers/?utm_source=mcp&utm_medium=tax-brackets-standard-deduction-2027-mcp)). Every tool is marked read-only.

## What it knows that your model does not

- The IRS announced the 2027 adjustments on November 5, 2026 (IR-2026-133). A model trained earlier has no 2027 brackets. The 2027 standard deduction is $16,600 single, $33,200 married filing jointly and $24,925 head of household.
- The exact thresholds for every bracket. The top 37 percent bracket starts at $661,375 for single filers and $793,650 for joint filers.
- The 2026 figures from Revenue Procedure 2025-32, so a question such as "how much does the 2027 change save me" has a worked answer.

## Install

### Hosted (Claude.ai custom connector, ChatGPT developer mode)

Paste this URL. No token, no sign-up.

```
https://tax-brackets-standard-deduction-2027-mcp.lipmichal.workers.dev/mcp
```

### Claude Code

```
claude mcp add --transport http tax-brackets-2027 https://tax-brackets-standard-deduction-2027-mcp.lipmichal.workers.dev/mcp
```

### Claude Desktop

Claude Desktop adds remote servers under Settings, Connectors, Add custom connector. Paste the URL above.

### Cursor

Add to `~/.cursor/mcp.json`.

```json
{
  "mcpServers": {
    "tax-brackets-2027": { "url": "https://tax-brackets-standard-deduction-2027-mcp.lipmichal.workers.dev/mcp" }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`.

```json
{
  "servers": {
    "tax-brackets-2027": { "type": "http", "url": "https://tax-brackets-standard-deduction-2027-mcp.lipmichal.workers.dev/mcp" }
  }
}
```

### Local stdio

The npm package is not published. Build it from this repository with Node 20 or newer.

```
git clone https://github.com/theluckystrike/tax-brackets-standard-deduction-2027-mcp && cd tax-brackets-standard-deduction-2027-mcp
npm install && npm run build
claude mcp add tax-brackets-2027 -- node $(pwd)/dist/stdio.js
```

## Example prompts

- "What are the 2027 tax brackets for a married couple filing jointly?"
- "What is the standard deduction for 2027 if I am single and over 65?"
- "How much federal income tax do I owe in 2027 on $100,000 of income, and how does that compare with 2026?"
- "At what income does the 0 percent capital gains rate end in 2027?"
- "What is the 2027 child tax credit?"

## Data sources

Full list with fetch dates in [DATA_SOURCES.md](DATA_SOURCES.md).

- [IRS Revenue Procedure 2026-35](https://www.irs.gov/pub/irs-drop/rp-26-35.pdf) for tax year 2027.
- [IR-2026-133](https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2027-taxpayers-continue-to-benefit-from-the-working-families-tax-cuts), the IRS news release of November 5, 2026.
- [IRS Revenue Procedure 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf) for tax year 2026.

The tests check that every number in the code is printed in the IRS text kept in `test/fixtures/`, and that each printed "tax is" amount equals the cumulative tax of the brackets below it.

## Limitations

- Federal income tax only. The calculator leaves out credits, self-employment tax, the net investment income tax, the alternative minimum tax and state tax.
- Only tax years 2026 and 2027 are held.
- The revenue procedure says that if Congress changes the Code after its release date, further IRS guidance applies. The server does not track new laws.
- This is general information, not tax advice.

## More

More MCP servers that answer questions your assistant cannot answer alone are on [mcpstamp.com](https://www.mcpstamp.com/servers/?utm_source=mcp&utm_medium=tax-brackets-standard-deduction-2027-mcp).

Part of the Zovo MCP collection at https://mcp.zovo.one

Built by [theluckystrike](https://github.com/theluckystrike).

## Development

```
npm install
npm test                              # builds, then runs the fixture tests and an offline stdio test
node scripts/stdio-transcript.mjs     # stdio round trip, writes .live/stdio-transcript.jsonl
```

## License

MIT

## More from zovo

- [All free zovo VS Code extensions](https://marketplace.visualstudio.com/publishers/zovo) — file viewers, database clients, formatters. Offline, no telemetry, no sign-up.
- [Full MCP server catalogue](https://theluckystrike.github.io/mcp/) — local-first MCP servers for back-office work: invoices, VAT, PDFs, spreadsheets, payroll.
- [Hosted no-install MCP endpoints](https://mcp.zovo.one) — paste a URL in Claude / Cursor, nothing to install.
