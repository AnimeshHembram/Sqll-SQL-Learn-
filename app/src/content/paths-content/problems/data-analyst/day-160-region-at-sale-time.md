---
id: da-day-160
title: Credit sales to the region at the time
order: 160
difficulty: advanced
topic: Temporal analysis
summary: Join facts to a history table (slowly changing dimension) using half-open validity ranges.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Join to a history table with validity ranges
  - Use half-open date ranges
prerequisites:
  - Day 127
  - Day 104
---

## Task

Sales reps move between regions; `rep_regions` keeps the history, valid from `valid_from` (included) until `valid_to` (**not** included), with `NULL` meaning "still current". Each sale must be credited to the region its rep belonged to **on the sale date**; a sale before the rep's first record is `'unassigned'`.

Return `region`, `orders` and `revenue`. Sort alphabetically by `region`, with `'unassigned'` last.

## Starter query

```sql
WITH rep_regions(rep, region, valid_from, valid_to) AS (
  VALUES
    ('R1', 'North', '2024-01-01', '2025-03-01'), ('R1', 'South', '2025-03-01', NULL),
    ('R2', 'East', '2024-06-01', NULL),
    ('R3', 'West', '2025-02-15', NULL)
),
sales(order_id, rep, sold_on, amount) AS (
  VALUES
    ('o1', 'R1', '2025-02-28', 100), ('o2', 'R1', '2025-03-01', 150), ('o3', 'R1', '2025-03-20', 80),
    ('o4', 'R2', '2025-03-05', 200), ('o5', 'R3', '2025-02-10', 60), ('o6', 'R3', '2025-02-20', 90),
    ('o7', 'R2', '2025-01-15', 40)
)
SELECT s.order_id, s.rep, s.sold_on, s.amount
FROM sales AS s
ORDER BY s.sold_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `LEFT JOIN rep_regions AS r ON r.rep = s.rep AND s.sold_on >= r.valid_from AND (r.valid_to IS NULL OR s.sold_on < r.valid_to)`: the end date is excluded, so a change date belongs to the new region only.
3. `COALESCE(r.region, 'unassigned')`, then group and sort with `ORDER BY region = 'unassigned', region`.

## Solution

```sql
WITH rep_regions(rep, region, valid_from, valid_to) AS (
  VALUES
    ('R1', 'North', '2024-01-01', '2025-03-01'), ('R1', 'South', '2025-03-01', NULL),
    ('R2', 'East', '2024-06-01', NULL),
    ('R3', 'West', '2025-02-15', NULL)
),
sales(order_id, rep, sold_on, amount) AS (
  VALUES
    ('o1', 'R1', '2025-02-28', 100), ('o2', 'R1', '2025-03-01', 150), ('o3', 'R1', '2025-03-20', 80),
    ('o4', 'R2', '2025-03-05', 200), ('o5', 'R3', '2025-02-10', 60), ('o6', 'R3', '2025-02-20', 90),
    ('o7', 'R2', '2025-01-15', 40)
),
credited AS (
  SELECT s.order_id, s.amount, COALESCE(r.region, 'unassigned') AS region
  FROM sales AS s
  LEFT JOIN rep_regions AS r
    ON r.rep = s.rep
   AND s.sold_on >= r.valid_from
   AND (r.valid_to IS NULL OR s.sold_on < r.valid_to)
)
SELECT region, COUNT(*) AS orders, SUM(amount) AS revenue
FROM credited
GROUP BY region
ORDER BY region = 'unassigned', region;
```

## Expected result

| region | orders | revenue |
| --- | --- | --- |
| East | 2 | 240 |
| North | 1 | 100 |
| South | 2 | 230 |
| West | 1 | 90 |
| unassigned | 1 | 60 |

## Explanation

A history table with validity dates (a "type 2 slowly changing dimension") lets reports show the world as it was. R1 moved from North to South on 1 March: the sale on 28 February stays with North, and the sale **on** 1 March belongs to South. Half-open ranges (`>=` start, `<` end) guarantee that every date matches exactly one record.

R3's first record starts on 15 February, so the sale on 10 February has no region. It is reported as unassigned rather than silently dropped, which keeps the total revenue equal to the sum of all sales (620).

**Common mistakes:** joining to the current region only (`valid_to IS NULL`), which rewrites history and moves all of R1's sales to South; and `BETWEEN valid_from AND valid_to`, which counts the 1 March sale in both regions.

## Wrong answers

Feedback: incorrect-output

```sql
WITH rep_regions(rep, region, valid_from, valid_to) AS ( VALUES ('R1', 'North', '2024-01-01', '2025-03-01'), ('R1', 'South', '2025-03-01', NULL), ('R2', 'East', '2024-06-01', NULL), ('R3', 'West', '2025-02-15', NULL) ), sales(order_id, rep, sold_on, amount) AS ( VALUES ('o1', 'R1', '2025-02-28', 100), ('o2', 'R1', '2025-03-01', 150), ('o3', 'R1', '2025-03-20', 80), ('o4', 'R2', '2025-03-05', 200), ('o5', 'R3', '2025-02-10', 60), ('o6', 'R3', '2025-02-20', 90), ('o7', 'R2', '2025-01-15', 40) ), credited AS (SELECT s.order_id, s.amount, COALESCE(r.region, 'unassigned') AS region FROM sales AS s LEFT JOIN rep_regions AS r ON r.rep = s.rep AND r.valid_to IS NULL) SELECT region, COUNT(*) AS orders, SUM(amount) AS revenue FROM credited GROUP BY region ORDER BY region = 'unassigned', region;
```

Feedback: incorrect-output

```sql
WITH rep_regions(rep, region, valid_from, valid_to) AS ( VALUES ('R1', 'North', '2024-01-01', '2025-03-01'), ('R1', 'South', '2025-03-01', NULL), ('R2', 'East', '2024-06-01', NULL), ('R3', 'West', '2025-02-15', NULL) ), sales(order_id, rep, sold_on, amount) AS ( VALUES ('o1', 'R1', '2025-02-28', 100), ('o2', 'R1', '2025-03-01', 150), ('o3', 'R1', '2025-03-20', 80), ('o4', 'R2', '2025-03-05', 200), ('o5', 'R3', '2025-02-10', 60), ('o6', 'R3', '2025-02-20', 90), ('o7', 'R2', '2025-01-15', 40) ), credited AS (SELECT s.order_id, s.amount, COALESCE(r.region, 'unassigned') AS region FROM sales AS s LEFT JOIN rep_regions AS r ON r.rep = s.rep AND s.sold_on BETWEEN r.valid_from AND COALESCE(r.valid_to, '9999-12-31')) SELECT region, COUNT(*) AS orders, SUM(amount) AS revenue FROM credited GROUP BY region ORDER BY region = 'unassigned', region;
```
