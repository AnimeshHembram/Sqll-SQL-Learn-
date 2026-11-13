---
id: da-day-292
title: Split deal revenue across sales reps
order: 292
difficulty: advanced
topic: Data engineering
summary: Allocate revenue through a many-to-many bridge table, normalising splits that do not add up to 100%.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Allocate through a bridge table
  - Normalise weights within a group
prerequisites:
  - Day 239
  - Day 204
---

## Task

Deals can have several reps (starter query), each with a split percentage. Some deals' splits do not add up to 100 (D3 adds up to 120), so **normalise** them: each rep's credit is `amount × split_pct / (sum of the deal's splits)`. That way each deal's revenue is credited exactly once.

Return `rep`, `deals`, `credited_revenue` (rounded to 2 decimal places) and `share_pct` (share of all deal revenue, rounded to 1 decimal place). Sort by `credited_revenue` from highest, then `rep`.

## Starter query

```sql
WITH deals(deal, amount) AS (
  VALUES ('D1', 90000), ('D2', 40000), ('D3', 25000), ('D4', 60000)
),
deal_reps(deal, rep, split_pct) AS (
  VALUES
    ('D1', 'Asha', 50), ('D1', 'Ravi', 30), ('D1', 'Meera', 20),
    ('D2', 'Ravi', 100),
    ('D3', 'Asha', 60), ('D3', 'Kiran', 60),
    ('D4', 'Meera', 50), ('D4', 'Kiran', 50)
)
SELECT d.deal, d.amount, r.rep, r.split_pct
FROM deals AS d
JOIN deal_reps AS r ON r.deal = d.deal
ORDER BY d.deal, r.rep;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Each deal's split total is `SUM(split_pct) OVER (PARTITION BY r.deal)` on the joined rows.
3. Credit is `1.0 * d.amount * r.split_pct / split_total`. Group by rep, and divide by `(SELECT SUM(amount) FROM deals)` for the share.

## Solution

```sql
WITH deals(deal, amount) AS (
  VALUES ('D1', 90000), ('D2', 40000), ('D3', 25000), ('D4', 60000)
),
deal_reps(deal, rep, split_pct) AS (
  VALUES
    ('D1', 'Asha', 50), ('D1', 'Ravi', 30), ('D1', 'Meera', 20),
    ('D2', 'Ravi', 100),
    ('D3', 'Asha', 60), ('D3', 'Kiran', 60),
    ('D4', 'Meera', 50), ('D4', 'Kiran', 50)
),
weighted AS (
  SELECT r.rep, r.deal, 1.0 * d.amount * r.split_pct / SUM(r.split_pct) OVER (PARTITION BY r.deal) AS credit
  FROM deal_reps AS r
  JOIN deals AS d ON d.deal = r.deal
)
SELECT rep, COUNT(*) AS deals, ROUND(SUM(credit), 2) AS credited_revenue,
  ROUND(100.0 * SUM(credit) / (SELECT SUM(amount) FROM deals), 1) AS share_pct
FROM weighted
GROUP BY rep
ORDER BY credited_revenue DESC, rep;
```

## Expected result

| rep | deals | credited_revenue | share_pct |
| --- | --- | --- | --- |
| Ravi | 2 | 67000 | 31.2 |
| Asha | 2 | 57500 | 26.7 |
| Meera | 2 | 48000 | 22.3 |
| Kiran | 2 | 42500 | 19.8 |

## Explanation

A bridge table links each deal to several reps, which is a many-to-many relationship: summing deal amounts per rep through it would count D1's 90,000 three times. Allocating with split percentages fixes that, as long as each deal's splits add up to 100%.

D3's splits add up to 120% (60% each for Asha and Kiran, a data entry error), so normalising by the deal's own total turns them into 50% each and credits exactly 25,000. After normalising, the credited revenue adds up to the 215,000 of deals, and the shares to 100%. Ravi leads because he owns all of D2.

**Common mistake:** applying the percentages as given (dividing by 100). D3 is then credited 30,000 against its 25,000 value, so total credit exceeds total revenue.

## Wrong answers

Feedback: incorrect-output

```sql
WITH deals(deal, amount) AS ( VALUES ('D1', 90000), ('D2', 40000), ('D3', 25000), ('D4', 60000) ), deal_reps(deal, rep, split_pct) AS ( VALUES ('D1', 'Asha', 50), ('D1', 'Ravi', 30), ('D1', 'Meera', 20), ('D2', 'Ravi', 100), ('D3', 'Asha', 60), ('D3', 'Kiran', 60), ('D4', 'Meera', 50), ('D4', 'Kiran', 50) ), weighted AS (SELECT r.rep, r.deal, d.amount * r.split_pct / 100.0 AS credit FROM deal_reps AS r JOIN deals AS d ON d.deal = r.deal) SELECT rep, COUNT(*) AS deals, ROUND(SUM(credit), 2) AS credited_revenue, ROUND(100.0 * SUM(credit) / (SELECT SUM(amount) FROM deals), 1) AS share_pct FROM weighted GROUP BY rep ORDER BY credited_revenue DESC, rep;
```

Feedback: incorrect-output

```sql
WITH deals(deal, amount) AS ( VALUES ('D1', 90000), ('D2', 40000), ('D3', 25000), ('D4', 60000) ), deal_reps(deal, rep, split_pct) AS ( VALUES ('D1', 'Asha', 50), ('D1', 'Ravi', 30), ('D1', 'Meera', 20), ('D2', 'Ravi', 100), ('D3', 'Asha', 60), ('D3', 'Kiran', 60), ('D4', 'Meera', 50), ('D4', 'Kiran', 50) ), weighted AS (SELECT r.rep, r.deal, d.amount AS credit FROM deal_reps AS r JOIN deals AS d ON d.deal = r.deal) SELECT rep, COUNT(*) AS deals, ROUND(SUM(credit), 2) AS credited_revenue, ROUND(100.0 * SUM(credit) / (SELECT SUM(amount) FROM deals), 1) AS share_pct FROM weighted GROUP BY rep ORDER BY credited_revenue DESC, rep;
```
