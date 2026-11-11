---
id: da-day-190
title: The longest run of monthly declines
order: 190
difficulty: advanced
topic: Temporal analysis
summary: Flag declines with LAG, then find the longest run of consecutive declines per product.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Find runs of a condition with a running count
  - Report the longest run per group, including zero
prerequisites:
  - Day 103
  - Day 125
---

## Task

For each product (in the starter query), find the **longest run of consecutive months** in which revenue fell compared with the previous month. A flat month (same revenue) ends a run. Return `product`, `longest_decline` (number of months; 0 if revenue never fell) and `run_ended` (the last month of that run, the earliest such run if there is a tie; `NULL` if none). Sort by `product`.

## Starter query

```sql
WITH product_months(product, month, revenue) AS (
  VALUES
    ('A', '2025-01', 100), ('A', '2025-02', 90), ('A', '2025-03', 80), ('A', '2025-04', 85), ('A', '2025-05', 70), ('A', '2025-06', 60),
    ('B', '2025-01', 50), ('B', '2025-02', 55), ('B', '2025-03', 55), ('B', '2025-04', 50), ('B', '2025-05', 45), ('B', '2025-06', 46),
    ('C', '2025-01', 30), ('C', '2025-02', 40), ('C', '2025-03', 50), ('C', '2025-04', 60), ('C', '2025-05', 70), ('C', '2025-06', 80)
)
SELECT product, month, revenue
FROM product_months
ORDER BY product, month;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Flag declines: `CASE WHEN revenue < LAG(revenue) OVER (PARTITION BY product ORDER BY month) THEN 1 ELSE 0 END`.
3. Number the rows, and give each run of declines a group key with `row_number - SUM(declined) OVER (... ORDER BY month)` on the declining rows (or count non-declining rows so far). Then group by product and key, and keep the longest run per product.

## Solution

```sql
WITH product_months(product, month, revenue) AS (
  VALUES
    ('A', '2025-01', 100), ('A', '2025-02', 90), ('A', '2025-03', 80), ('A', '2025-04', 85), ('A', '2025-05', 70), ('A', '2025-06', 60),
    ('B', '2025-01', 50), ('B', '2025-02', 55), ('B', '2025-03', 55), ('B', '2025-04', 50), ('B', '2025-05', 45), ('B', '2025-06', 46),
    ('C', '2025-01', 30), ('C', '2025-02', 40), ('C', '2025-03', 50), ('C', '2025-04', 60), ('C', '2025-05', 70), ('C', '2025-06', 80)
),
flagged AS (
  SELECT product, month,
    CASE WHEN revenue < LAG(revenue) OVER (PARTITION BY product ORDER BY month) THEN 1 ELSE 0 END AS declined
  FROM product_months
),
grouped AS (
  SELECT product, month, declined,
    SUM(CASE WHEN declined = 0 THEN 1 ELSE 0 END) OVER (PARTITION BY product ORDER BY month) AS run_key
  FROM flagged
),
runs AS (
  SELECT product, run_key, COUNT(*) AS months, MAX(month) AS run_ended
  FROM grouped
  WHERE declined = 1
  GROUP BY product, run_key
),
best AS (
  SELECT product, months, run_ended,
    ROW_NUMBER() OVER (PARTITION BY product ORDER BY months DESC, run_ended) AS n
  FROM runs
)
SELECT p.product, COALESCE(b.months, 0) AS longest_decline, b.run_ended
FROM (SELECT DISTINCT product FROM product_months) AS p
LEFT JOIN best AS b ON b.product = p.product AND b.n = 1
ORDER BY p.product;
```

## Expected result

| product | longest_decline | run_ended |
| --- | --- | --- |
| A | 2 | 2025-03 |
| B | 2 | 2025-05 |
| C | 0 | NULL |

## Explanation

Streaks of a condition are a "gaps and islands" problem: a running count of the rows that **break** the streak stays constant across each run of declines, so it works as the run's key. A falls for two months, recovers in April, then falls twice more; both runs are two months long, and the tie goes to the earlier one, ending in March.

B's flat March (55 to 55) is not a decline, so it splits B's months into separate runs; its longest is two months, April to May. C grows every month and still appears with 0, thanks to the list of all products and the `LEFT JOIN`.

**Common mistake:** counting all declining months per product (A would show 4), which reports separate dips as one long slide.

## Wrong answers

Feedback: incorrect-output

```sql
WITH product_months(product, month, revenue) AS ( VALUES ('A', '2025-01', 100), ('A', '2025-02', 90), ('A', '2025-03', 80), ('A', '2025-04', 85), ('A', '2025-05', 70), ('A', '2025-06', 60), ('B', '2025-01', 50), ('B', '2025-02', 55), ('B', '2025-03', 55), ('B', '2025-04', 50), ('B', '2025-05', 45), ('B', '2025-06', 46), ('C', '2025-01', 30), ('C', '2025-02', 40), ('C', '2025-03', 50), ('C', '2025-04', 60), ('C', '2025-05', 70), ('C', '2025-06', 80) ), flagged AS (SELECT product, month, CASE WHEN revenue < LAG(revenue) OVER (PARTITION BY product ORDER BY month) THEN 1 ELSE 0 END AS declined FROM product_months) SELECT product, SUM(declined) AS longest_decline, MAX(CASE WHEN declined = 1 THEN month END) AS run_ended FROM flagged GROUP BY product ORDER BY product;
```
