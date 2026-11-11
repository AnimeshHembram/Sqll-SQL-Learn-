---
id: da-day-204
title: Split a budget so the parts add up exactly
order: 204
difficulty: advanced
topic: Financial analysis
summary: Allocate whole amounts in proportion to weights with the largest remainder method.
module: data-analyst
duration: 13
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Allocate whole amounts proportionally
  - Use the largest remainder method
prerequisites:
  - Day 182
  - Day 135
---

## Task

A training budget of **1,000** (whole rupees) is split between teams in proportion to headcount (in the starter query). Rounding each share separately would not add up to 1,000, so use the **largest remainder** method: give each team the whole-number part of its exact share, then hand out the rupees still left over, one each, to the teams with the largest fractional parts (ties: alphabetical by team).

Return `team`, `headcount`, `exact_share` (rounded to 4 decimal places) and `allocation`. Sort by `team`.

## Starter query

```sql
WITH teams(team, headcount) AS (
  VALUES ('Data', 7), ('Design', 3), ('Platform', 5), ('Support', 6)
)
SELECT team, headcount, 1000.0 * headcount / (SELECT SUM(headcount) FROM teams) AS exact_share
FROM teams;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Exact share: `1000.0 * headcount / SUM(headcount) OVER ()`. Its whole part is `CAST(exact AS INTEGER)` and its remainder `exact - whole`.
3. Leftover rupees = `1000 - SUM(whole) OVER ()`. Rank teams by `remainder DESC, team` and add 1 to the teams ranked within the leftover count.

## Solution

```sql
WITH teams(team, headcount) AS (
  VALUES ('Data', 7), ('Design', 3), ('Platform', 5), ('Support', 6)
),
shares AS (
  SELECT team, headcount, 1000.0 * headcount / SUM(headcount) OVER () AS exact FROM teams
),
floored AS (
  SELECT team, headcount, exact, CAST(exact AS INTEGER) AS whole, exact - CAST(exact AS INTEGER) AS remainder FROM shares
),
ranked AS (
  SELECT team, headcount, exact, whole,
    1000 - SUM(whole) OVER () AS leftover,
    ROW_NUMBER() OVER (ORDER BY remainder DESC, team) AS remainder_rank
  FROM floored
)
SELECT team, headcount, ROUND(exact, 4) AS exact_share,
  whole + CASE WHEN remainder_rank <= leftover THEN 1 ELSE 0 END AS allocation
FROM ranked
ORDER BY team;
```

## Expected result

| team | headcount | exact_share | allocation |
| --- | --- | --- | --- |
| Data | 7 | 333.3333 | 333 |
| Design | 3 | 142.8571 | 143 |
| Platform | 5 | 238.0952 | 238 |
| Support | 6 | 285.7143 | 286 |

## Explanation

Rounding each share independently is the classic "the percentages add up to 101%" bug: it happens to give exactly 1,000 for these headcounts, but change one team's size and it is easily off by a rupee or two. With 21 people the exact shares are 333.33, 142.86, 238.10 and 285.71. The largest remainder method first gives each team its whole rupees (333 + 142 + 238 + 285 = 998), then hands the 2 rupees left over to the teams closest to their next rupee: Design (.86) and Support (.71).

The method guarantees the total is exact and no team is more than one rupee from its exact share, which is why it is used for invoices split across cost centres and for seat allocations.

**Common mistake:** `ROUND(exact)` per team, which cannot guarantee the sum.

## Wrong answers

Feedback: incorrect-output

```sql
WITH teams(team, headcount) AS ( VALUES ('Data', 7), ('Design', 3), ('Platform', 5), ('Support', 6) ), shares AS (SELECT team, headcount, 1000.0 * headcount / SUM(headcount) OVER () AS exact FROM teams) SELECT team, headcount, ROUND(exact, 4) AS exact_share, CAST(exact AS INTEGER) AS allocation FROM shares ORDER BY team;
```
