---
id: da-day-112
title: Read out an A/B test
order: 112
difficulty: advanced
topic: Business analysis
summary: Clean the assignment data before comparing conversion rates.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Clean experiment data before measuring
  - Count conversions with EXISTS
prerequisites:
  - Day 46
  - Day 68
---

## Task

An A/B test assigned visitors to variant A or B (in the starter query). Before comparing, apply the rules the analysts agreed:

- A visitor assigned to **both** variants is excluded entirely.
- A visitor assigned to the same variant twice counts **once**, from their first assignment date.
- A visitor **converted** if they placed an order **on or after** that first assignment date. Orders from visitors not in the test are ignored.

Return `variant`, `visitors`, `converters` and `conversion_pct` (rounded to 1 decimal place). Sort by `variant`.

## Starter query

```sql
WITH assignments(visitor, variant, assigned_on) AS (
  VALUES
    ('v01', 'A', '2025-03-01'), ('v02', 'A', '2025-03-01'), ('v03', 'A', '2025-03-02'), ('v04', 'A', '2025-03-02'),
    ('v05', 'A', '2025-03-03'), ('v05', 'A', '2025-03-04'),
    ('v06', 'B', '2025-03-01'), ('v07', 'B', '2025-03-01'), ('v08', 'B', '2025-03-02'), ('v09', 'B', '2025-03-03'),
    ('v10', 'A', '2025-03-02'), ('v10', 'B', '2025-03-05'),
    ('v11', 'B', '2025-03-04')
),
test_orders(visitor, ordered_on, amount) AS (
  VALUES
    ('v02', '2025-03-02', 30), ('v02', '2025-03-06', 25), ('v04', '2025-02-27', 40), ('v05', '2025-03-03', 55),
    ('v06', '2025-03-01', 20), ('v07', '2025-03-08', 35), ('v09', '2025-03-04', 15), ('v10', '2025-03-06', 50),
    ('v12', '2025-03-05', 10)
)
SELECT variant, COUNT(*) AS visitors
FROM assignments
GROUP BY variant;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Start with one row per visitor: `GROUP BY visitor`, keeping only visitors with `COUNT(DISTINCT variant) = 1`, and take `MIN(variant)` and `MIN(assigned_on)`.
2. A visitor converted if `EXISTS (SELECT 1 FROM test_orders AS o WHERE o.visitor = v.visitor AND o.ordered_on >= v.first_assigned)`.
3. Group the clean visitors by variant: `COUNT(*)`, `SUM(converted)` and `ROUND(100.0 * SUM(converted) / COUNT(*), 1)`.

## Solution

```sql
WITH assignments(visitor, variant, assigned_on) AS (
  VALUES
    ('v01', 'A', '2025-03-01'), ('v02', 'A', '2025-03-01'), ('v03', 'A', '2025-03-02'), ('v04', 'A', '2025-03-02'),
    ('v05', 'A', '2025-03-03'), ('v05', 'A', '2025-03-04'),
    ('v06', 'B', '2025-03-01'), ('v07', 'B', '2025-03-01'), ('v08', 'B', '2025-03-02'), ('v09', 'B', '2025-03-03'),
    ('v10', 'A', '2025-03-02'), ('v10', 'B', '2025-03-05'),
    ('v11', 'B', '2025-03-04')
),
test_orders(visitor, ordered_on, amount) AS (
  VALUES
    ('v02', '2025-03-02', 30), ('v02', '2025-03-06', 25), ('v04', '2025-02-27', 40), ('v05', '2025-03-03', 55),
    ('v06', '2025-03-01', 20), ('v07', '2025-03-08', 35), ('v09', '2025-03-04', 15), ('v10', '2025-03-06', 50),
    ('v12', '2025-03-05', 10)
),
clean_visitors AS (
  SELECT visitor, MIN(variant) AS variant, MIN(assigned_on) AS first_assigned
  FROM assignments
  GROUP BY visitor
  HAVING COUNT(DISTINCT variant) = 1
),
outcomes AS (
  SELECT v.variant,
    CASE WHEN EXISTS (
      SELECT 1 FROM test_orders AS o WHERE o.visitor = v.visitor AND o.ordered_on >= v.first_assigned
    ) THEN 1 ELSE 0 END AS converted
  FROM clean_visitors AS v
)
SELECT variant,
  COUNT(*) AS visitors,
  SUM(converted) AS converters,
  ROUND(100.0 * SUM(converted) / COUNT(*), 1) AS conversion_pct
FROM outcomes
GROUP BY variant
ORDER BY variant;
```

## Expected result

| variant | visitors | converters | conversion_pct |
| --- | --- | --- | --- |
| A | 5 | 2 | 40 |
| B | 5 | 3 | 60 |

## Explanation

An experiment's result is only as good as its cleaning. v10 saw both versions, so they cannot tell us anything about either and are removed. v05's duplicate assignment is collapsed to one visitor. v04 ordered two days **before** being assigned, so that order was not caused by the test. v02 ordered twice but converts once.

After cleaning, B converts 60.0% of five visitors against A's 40.0%. With samples this small the difference could easily be chance; a real readout would add a significance test before declaring a winner.

**Common mistakes:** counting assignment rows instead of visitors, and keeping visitors exposed to both variants.

## Wrong answers

Feedback: incorrect-output

```sql
WITH assignments(visitor, variant, assigned_on) AS ( VALUES ('v01', 'A', '2025-03-01'), ('v02', 'A', '2025-03-01'), ('v03', 'A', '2025-03-02'), ('v04', 'A', '2025-03-02'), ('v05', 'A', '2025-03-03'), ('v05', 'A', '2025-03-04'), ('v06', 'B', '2025-03-01'), ('v07', 'B', '2025-03-01'), ('v08', 'B', '2025-03-02'), ('v09', 'B', '2025-03-03'), ('v10', 'A', '2025-03-02'), ('v10', 'B', '2025-03-05'), ('v11', 'B', '2025-03-04') ), test_orders(visitor, ordered_on, amount) AS ( VALUES ('v02', '2025-03-02', 30), ('v02', '2025-03-06', 25), ('v04', '2025-02-27', 40), ('v05', '2025-03-03', 55), ('v06', '2025-03-01', 20), ('v07', '2025-03-08', 35), ('v09', '2025-03-04', 15), ('v10', '2025-03-06', 50), ('v12', '2025-03-05', 10) ), outcomes AS (SELECT a.variant, CASE WHEN EXISTS (SELECT 1 FROM test_orders AS o WHERE o.visitor = a.visitor AND o.ordered_on >= a.assigned_on) THEN 1 ELSE 0 END AS converted FROM assignments AS a) SELECT variant, COUNT(*) AS visitors, SUM(converted) AS converters, ROUND(100.0 * SUM(converted) / COUNT(*), 1) AS conversion_pct FROM outcomes GROUP BY variant ORDER BY variant;
```
