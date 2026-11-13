---
id: da-day-234
title: Typical and worst-case supplier lead times
order: 234
difficulty: advanced
topic: Operations
summary: Report the median and 90th-percentile lead time per supplier with the nearest-rank method.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute nearest-rank percentiles
  - Pick ranked values with conditional aggregation
prerequisites:
  - Day 84
  - Day 151
---

## Task

Planning needs each supplier's typical and worst-case lead time (purchase orders in the starter query). Use the **nearest-rank** percentile: sort the supplier's lead times, and the p-th percentile is the value at position `CEIL(p × n)` (counting from 1), where `n` is the number of orders.

Return `supplier`, `orders`, `p50_days`, `p90_days` and `max_days`. Sort by `p90_days` from longest, then `supplier`.

## Starter query

```sql
WITH purchase_orders(po, supplier, lead_days) AS (
  VALUES
    (1, 'Northwind', 4), (2, 'Northwind', 5), (3, 'Northwind', 5), (4, 'Northwind', 6), (5, 'Northwind', 7),
    (6, 'Northwind', 9), (7, 'Northwind', 14), (8, 'Northwind', 5), (9, 'Northwind', 6), (10, 'Northwind', 5),
    (11, 'Sunrise', 10), (12, 'Sunrise', 11), (13, 'Sunrise', 12),
    (14, 'Tidewater', 3)
)
SELECT supplier, po, lead_days
FROM purchase_orders
ORDER BY supplier, lead_days;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Number each supplier's orders by lead time with `ROW_NUMBER() OVER (PARTITION BY supplier ORDER BY lead_days, po)` and count them with `COUNT(*) OVER (PARTITION BY supplier)`.
3. Pick the values with conditional aggregation: `MAX(CASE WHEN rn = CEIL(0.5 * n) THEN lead_days END)` and the same with `0.9`.

## Solution

```sql
WITH purchase_orders(po, supplier, lead_days) AS (
  VALUES
    (1, 'Northwind', 4), (2, 'Northwind', 5), (3, 'Northwind', 5), (4, 'Northwind', 6), (5, 'Northwind', 7),
    (6, 'Northwind', 9), (7, 'Northwind', 14), (8, 'Northwind', 5), (9, 'Northwind', 6), (10, 'Northwind', 5),
    (11, 'Sunrise', 10), (12, 'Sunrise', 11), (13, 'Sunrise', 12),
    (14, 'Tidewater', 3)
),
ranked AS (
  SELECT supplier, lead_days,
    ROW_NUMBER() OVER (PARTITION BY supplier ORDER BY lead_days, po) AS rn,
    COUNT(*) OVER (PARTITION BY supplier) AS n
  FROM purchase_orders
)
SELECT supplier, MAX(n) AS orders,
  MAX(CASE WHEN rn = CEIL(0.5 * n) THEN lead_days END) AS p50_days,
  MAX(CASE WHEN rn = CEIL(0.9 * n) THEN lead_days END) AS p90_days,
  MAX(lead_days) AS max_days
FROM ranked
GROUP BY supplier
ORDER BY p90_days DESC, supplier;
```

## Expected result

| supplier | orders | p50_days | p90_days | max_days |
| --- | --- | --- | --- | --- |
| Sunrise | 3 | 11 | 12 | 12 |
| Northwind | 10 | 5 | 9 | 14 |
| Tidewater | 1 | 3 | 3 | 3 |

## Explanation

Averages hide the long tail that planners worry about. Northwind usually delivers in 5 days (the median), but one order in ten takes 9 days or more, and one took 14; planning on the average of 6.6 days would leave you short whenever a slow order comes. Sunrise is slower but consistent (10 to 12 days).

The nearest-rank method needs no interpolation: number the sorted values per supplier and pick position `CEIL(p × n)`. For Northwind's 10 orders, the median is the 5th value (5 days) and p90 the 9th (9 days). With one order, Tidewater's every percentile is that order, a reminder to read `orders` before trusting a percentile.

**Common mistake:** reporting the average as the typical lead time and the maximum as the 90th percentile. One extreme order then sets the "p90", and the median is pulled up by the slow tail.

## Wrong answers

Feedback: incorrect-output

```sql
WITH purchase_orders(po, supplier, lead_days) AS ( VALUES (1, 'Northwind', 4), (2, 'Northwind', 5), (3, 'Northwind', 5), (4, 'Northwind', 6), (5, 'Northwind', 7), (6, 'Northwind', 9), (7, 'Northwind', 14), (8, 'Northwind', 5), (9, 'Northwind', 6), (10, 'Northwind', 5), (11, 'Sunrise', 10), (12, 'Sunrise', 11), (13, 'Sunrise', 12), (14, 'Tidewater', 3) ) SELECT supplier, COUNT(*) AS orders, ROUND(AVG(lead_days)) AS p50_days, MAX(lead_days) AS p90_days, MAX(lead_days) AS max_days FROM purchase_orders GROUP BY supplier ORDER BY p90_days DESC, supplier;
```
