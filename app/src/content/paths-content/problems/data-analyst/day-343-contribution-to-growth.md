---
id: da-day-343
title: Which segments drove the quarter's growth?
order: 343
difficulty: intermediate
topic: Reporting
summary: Express each segment's change as a share of the total change and as percentage points of total growth.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Attribute total growth to segments
  - Distinguish growth rate from contribution
prerequisites:
  - Day 80
  - Day 149
---

## Task

Total revenue grew from Q4 2024 to Q1 2025 (starter query). For each segment, return `segment`, `change` (Q1 − Q4), `segment_growth_pct` (its own growth, rounded to 1 decimal place), `share_of_change_pct` (its change ÷ the total change × 100) and `contribution_pp` (its change ÷ **total Q4 revenue** × 100: the percentage points it added to total growth). Add a final row `'Total'` with total change, total growth in `segment_growth_pct`, 100 in `share_of_change_pct` and total growth in `contribution_pp`. Round to 1 decimal place. Sort by `contribution_pp` from highest, with `'Total'` last.

## Starter query

```sql
WITH segment_revenue(segment, q4_2024, q1_2025) AS (
  VALUES ('Enterprise', 1200000, 1260000), ('Mid-market', 800000, 960000), ('Small business', 500000, 470000), ('Consumer', 300000, 410000)
)
SELECT segment, q4_2024, q1_2025
FROM segment_revenue;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Totals over all segments with `SUM(...) OVER ()` give the denominators: total change and total Q4 revenue.
3. The contributions in percentage points add up to the total growth rate; the shares of change add up to 100 (a segment that shrank has a negative share). Add the total row with `UNION ALL` inside a subquery so you can sort.

## Solution

```sql
WITH segment_revenue(segment, q4_2024, q1_2025) AS (
  VALUES ('Enterprise', 1200000, 1260000), ('Mid-market', 800000, 960000), ('Small business', 500000, 470000), ('Consumer', 300000, 410000)
),
parts AS (
  SELECT segment, q4_2024, q1_2025, q1_2025 - q4_2024 AS change,
    SUM(q1_2025 - q4_2024) OVER () AS total_change, SUM(q4_2024) OVER () AS total_q4
  FROM segment_revenue
)
SELECT segment, change, segment_growth_pct, share_of_change_pct, contribution_pp FROM (
  SELECT 0 AS sort_key, segment, change, ROUND(100.0 * change / q4_2024, 1) AS segment_growth_pct,
    ROUND(100.0 * change / total_change, 1) AS share_of_change_pct, ROUND(100.0 * change / total_q4, 1) AS contribution_pp
  FROM parts
  UNION ALL
  SELECT 1, 'Total', SUM(change), ROUND(100.0 * SUM(change) / SUM(q4_2024), 1), 100.0, ROUND(100.0 * SUM(change) / SUM(q4_2024), 1)
  FROM parts
)
ORDER BY sort_key, contribution_pp DESC;
```

## Expected result

| segment | change | segment_growth_pct | share_of_change_pct | contribution_pp |
| --- | --- | --- | --- | --- |
| Mid-market | 160000 | 20 | 53.3 | 5.7 |
| Consumer | 110000 | 36.7 | 36.7 | 3.9 |
| Enterprise | 60000 | 5 | 20 | 2.1 |
| Small business | -30000 | -6 | -10 | -1.1 |
| Total | 300000 | 10.7 | 100 | 10.7 |

## Explanation

Growth rates and contributions answer different questions. Consumer grew fastest (36.7%), but Mid-market contributed most to total growth: 5.7 of the 10.7 percentage points, because it was a bigger business to begin with. Contribution in percentage points is a segment's change divided by the **total** starting revenue, so the contributions add up to the total growth rate.

Shares of change add up to 100%, which is why Small business, which shrank, has a negative share (−10%): the other segments together grew by 110% of the net change. Both views belong in a growth review, because a fast-growing small segment and a slow-growing large one can matter equally.

**Common mistake:** dividing each segment's change by its own starting revenue and calling it a contribution. That is just the segment's growth rate, and the "contributions" no longer add up to the total.

## Wrong answers

Feedback: incorrect-output

```sql
WITH segment_revenue(segment, q4_2024, q1_2025) AS ( VALUES ('Enterprise', 1200000, 1260000), ('Mid-market', 800000, 960000), ('Small business', 500000, 470000), ('Consumer', 300000, 410000) ), parts AS (SELECT segment, q4_2024, q1_2025, q1_2025 - q4_2024 AS change, SUM(q1_2025 - q4_2024) OVER () AS total_change, SUM(q4_2024) OVER () AS total_q4 FROM segment_revenue) SELECT segment, change, segment_growth_pct, share_of_change_pct, contribution_pp FROM (SELECT 0 AS sort_key, segment, change, ROUND(100.0 * change / q4_2024, 1) AS segment_growth_pct, ROUND(100.0 * change / total_change, 1) AS share_of_change_pct, ROUND(100.0 * change / q4_2024, 1) AS contribution_pp FROM parts UNION ALL SELECT 1, 'Total', SUM(change), ROUND(100.0 * SUM(change) / SUM(q4_2024), 1), 100.0, ROUND(100.0 * SUM(change) / SUM(q4_2024), 1) FROM parts) ORDER BY sort_key, contribution_pp DESC;
```
