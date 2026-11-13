---
id: da-day-313
title: Benford's law check on expense claims
order: 313
difficulty: advanced
topic: Risk analytics
summary: Compare the first digits of expense claims with the distribution Benford's law predicts.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Extract a leading digit
  - Compare a distribution with a reference
prerequisites:
  - Day 155
  - Day 289
---

## Task

In many natural sets of amounts, the first digit `d` appears with probability `log10(1 + 1/d)` (**Benford's law**): about 30% start with 1 and under 5% with 9. Large departures can point to invented numbers.

For the claims in the starter query, return one row per first digit 1 to 9: `digit`, `claims`, `actual_pct` and `expected_pct` (both rounded to 1 decimal place) and `difference_pct` (actual − expected, rounded to 1 decimal place). Include digits with no claims. Sort by `digit`.

The expected Benford percentages, rounded to 1 decimal place, are 30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1 and 4.6 for digits 1 to 9.

## Starter query

```sql
WITH claims(claim_id, amount) AS (
  VALUES
    (1, 1820), (2, 245), (3, 1190), (4, 310), (5, 4999), (6, 152), (7, 1375), (8, 2210), (9, 199), (10, 1005),
    (11, 168), (12, 3120), (13, 1450), (14, 990), (15, 5100), (16, 125), (17, 1730), (18, 289), (19, 1640), (20, 870)
)
SELECT claim_id, amount, SUBSTR(CAST(amount AS TEXT), 1, 1) AS first_digit
FROM claims
ORDER BY claim_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Add the nine digits with their Benford percentages as `VALUES`.
2. First digit: `CAST(SUBSTR(CAST(amount AS TEXT), 1, 1) AS INTEGER)` for positive whole amounts.
3. `LEFT JOIN` the digit list to the claims grouped by first digit, so digits nobody used show 0.

## Solution

```sql
WITH claims(claim_id, amount) AS (
  VALUES
    (1, 1820), (2, 245), (3, 1190), (4, 310), (5, 4999), (6, 152), (7, 1375), (8, 2210), (9, 199), (10, 1005),
    (11, 168), (12, 3120), (13, 1450), (14, 990), (15, 5100), (16, 125), (17, 1730), (18, 289), (19, 1640), (20, 870)
),
benford(digit, expected_pct) AS (
  VALUES (1, 30.1), (2, 17.6), (3, 12.5), (4, 9.7), (5, 7.9), (6, 6.7), (7, 5.8), (8, 5.1), (9, 4.6)
),
digits AS (
  SELECT CAST(SUBSTR(CAST(amount AS TEXT), 1, 1) AS INTEGER) AS digit, COUNT(*) AS claims FROM claims GROUP BY 1
)
SELECT b.digit, COALESCE(d.claims, 0) AS claims,
  ROUND(100.0 * COALESCE(d.claims, 0) / (SELECT COUNT(*) FROM claims), 1) AS actual_pct,
  b.expected_pct,
  ROUND(100.0 * COALESCE(d.claims, 0) / (SELECT COUNT(*) FROM claims) - b.expected_pct, 1) AS difference_pct
FROM benford AS b
LEFT JOIN digits AS d ON d.digit = b.digit
ORDER BY b.digit;
```

## Expected result

| digit | claims | actual_pct | expected_pct | difference_pct |
| --- | --- | --- | --- | --- |
| 1 | 11 | 55 | 30.1 | 24.9 |
| 2 | 3 | 15 | 17.6 | -2.6 |
| 3 | 2 | 10 | 12.5 | -2.5 |
| 4 | 1 | 5 | 9.7 | -4.7 |
| 5 | 1 | 5 | 7.9 | -2.9 |
| 6 | 0 | 0 | 6.7 | -6.7 |
| 7 | 0 | 0 | 5.8 | -5.8 |
| 8 | 1 | 5 | 5.1 | -0.1 |
| 9 | 1 | 5 | 4.6 | 0.4 |

## Explanation

Benford's law describes leading digits in many real-world amounts: about 30% start with 1, falling to under 5% for 9. Fabricated numbers rarely follow it, because people pick digits more evenly, so auditors use it to choose what to review.

These claims depart sharply: 55% start with 1, against 30.1% expected, and no claims start with 6 or 7. With only 20 claims, the pattern could be chance, but it fits a common story: many claims just over 1,000, perhaps because a policy threshold sits there. The `LEFT JOIN` from the digit list keeps digits with no claims, which are part of the evidence.

**Common mistake:** joining digits with an inner join. The missing 6s and 7s disappear from the report, and the distribution looks closer to Benford than it is.

## Wrong answers

Feedback: missing-rows

```sql
WITH claims(claim_id, amount) AS ( VALUES (1, 1820), (2, 245), (3, 1190), (4, 310), (5, 4999), (6, 152), (7, 1375), (8, 2210), (9, 199), (10, 1005), (11, 168), (12, 3120), (13, 1450), (14, 990), (15, 5100), (16, 125), (17, 1730), (18, 289), (19, 1640), (20, 870) ), benford(digit, expected_pct) AS (VALUES (1, 30.1), (2, 17.6), (3, 12.5), (4, 9.7), (5, 7.9), (6, 6.7), (7, 5.8), (8, 5.1), (9, 4.6)), digits AS (SELECT CAST(SUBSTR(CAST(amount AS TEXT), 1, 1) AS INTEGER) AS digit, COUNT(*) AS claims FROM claims GROUP BY 1) SELECT b.digit, d.claims, ROUND(100.0 * d.claims / (SELECT COUNT(*) FROM claims), 1) AS actual_pct, b.expected_pct, ROUND(100.0 * d.claims / (SELECT COUNT(*) FROM claims) - b.expected_pct, 1) AS difference_pct FROM benford AS b JOIN digits AS d ON d.digit = b.digit ORDER BY b.digit;
```
