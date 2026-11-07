# Data sources

All sources below were fetched on 2026-11-07 while building version 1.0.0.

| Data | URL | Notes |
|---|---|---|
| Tax year 2027 adjusted items | https://www.irs.gov/pub/irs-drop/rp-26-35.pdf | Rev. Proc. 2026-35. Section 3.01 rate tables (single 12,800 / 52,025 / 109,125 / 208,325 / 264,550 / 661,375; joint 25,600 / 104,050 / 218,250 / 416,650 / 529,100 / 793,650; head of household 18,250 / 69,650 / 109,100 / 208,300 / 264,550 / 661,350; separate as single to 264,550 then 396,825; estates and trusts 3,400 / 12,100 / 16,500), 3.03 capital gains, 3.05 child tax credit, 3.06 earned income credit, 3.11 AMT, 3.15 standard deduction (33,200 / 24,925 / 16,600 / 16,600; extra 1,700 or 2,100; dependent 1,400 or 500 plus earned income), 3.26 section 179, 3.28 QBI, 3.41 FEIE, 3.44 estate exclusion, 3.46 gift exclusion. |
| Tax year 2027 news release | https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2027-taxpayers-continue-to-benefit-from-the-working-families-tax-cuts | IR-2026-133, Nov. 5, 2026. Cross-check of the standard deduction, rates and thresholds. Also the source of the 2026 estate exclusion ($15,000,000) and employer child care credit ($500,000) "up from" figures. |
| Tax year 2026 adjusted items | https://www.irs.gov/pub/irs-drop/rp-25-32.pdf | Rev. Proc. 2025-32, as amended for the One, Big, Beautiful Bill Act. Section 4.01 rate tables, 4.02 kiddie tax, 4.03 capital gains, 4.05 child tax credit, 4.06 earned income credit, 4.10 AMT, 4.14 standard deduction (32,200 / 24,150 / 16,100 / 16,100). |
| Tax year 2026 news release | https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill | IR-2025-103, Oct. 9, 2025. |

The test fixtures in `test/fixtures/` are the text of the two revenue procedures (pdftotext, whitespace collapsed) and the text of IR-2026-133, downloaded on 2026-11-07. The revenue procedure 2026-35 text still shows the placeholder "[Release Date, 2026]" in section 1.

Not included because the 2026 revenue procedure does not print it, so no 2026 comparison could be sourced: the employer educational assistance exclusion.
