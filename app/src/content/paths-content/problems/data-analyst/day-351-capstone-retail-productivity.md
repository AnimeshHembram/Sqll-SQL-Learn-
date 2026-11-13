---
id: da-day-351
title: Capstone (retail) 1: store productivity
order: 351
difficulty: intermediate
topic: Capstone
summary: Compare stores of different sizes on revenue per square foot, per staff hour and per transaction.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Normalise performance by capacity
  - Divide totals by totals
prerequisites:
  - Day 266
  - Day 177
---

## Task

The next five days follow a four-store retail chain (the same data each day, starter query). For the quarter (January to March 2025), compare the stores: `store`, `city`, `revenue`, `revenue_per_sqft`, `revenue_per_staff_hour` and `avg_basket` (revenue ÷ transactions), all rounded to 2 decimal places. Sort by `revenue_per_sqft` from highest.

## Starter query

```sql
WITH stores(store, city, opened, sq_ft) AS (
  VALUES ('S1', 'Pune', '2021-04-01', 2400), ('S2', 'Pune', '2023-09-15', 1800), ('S3', 'Nagpur', '2022-01-10', 2000), ('S4', 'Nashik', '2024-11-01', 1500)
),
sales(store, month, revenue, transactions, staff_hours) AS (
  VALUES
    ('S1', '2025-01', 1820000, 6100, 1450), ('S1', '2025-02', 1700000, 5800, 1400), ('S1', '2025-03', 1950000, 6400, 1480),
    ('S2', '2025-01', 980000, 4200, 1100), ('S2', '2025-02', 1010000, 4300, 1080), ('S2', '2025-03', 1100000, 4500, 1120),
    ('S3', '2025-01', 1250000, 4900, 1200), ('S3', '2025-02', 1150000, 4500, 1210), ('S3', '2025-03', 1180000, 4600, 1190),
    ('S4', '2025-01', 420000, 2100, 900), ('S4', '2025-02', 510000, 2400, 880), ('S4', '2025-03', 640000, 2900, 870)
)
SELECT s.store, s.city, s.sq_ft, x.month, x.revenue, x.transactions, x.staff_hours
FROM stores AS s
JOIN sales AS x ON x.store = s.store
ORDER BY s.store, x.month;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Total each store's quarter first: `SUM(revenue)`, `SUM(transactions)` and `SUM(staff_hours)`.
3. Divide totals by totals (not averages of monthly ratios), and divide revenue by the store's floor area once.

## Solution

```sql
WITH stores(store, city, opened, sq_ft) AS (
  VALUES ('S1', 'Pune', '2021-04-01', 2400), ('S2', 'Pune', '2023-09-15', 1800), ('S3', 'Nagpur', '2022-01-10', 2000), ('S4', 'Nashik', '2024-11-01', 1500)
),
sales(store, month, revenue, transactions, staff_hours) AS (
  VALUES
    ('S1', '2025-01', 1820000, 6100, 1450), ('S1', '2025-02', 1700000, 5800, 1400), ('S1', '2025-03', 1950000, 6400, 1480),
    ('S2', '2025-01', 980000, 4200, 1100), ('S2', '2025-02', 1010000, 4300, 1080), ('S2', '2025-03', 1100000, 4500, 1120),
    ('S3', '2025-01', 1250000, 4900, 1200), ('S3', '2025-02', 1150000, 4500, 1210), ('S3', '2025-03', 1180000, 4600, 1190),
    ('S4', '2025-01', 420000, 2100, 900), ('S4', '2025-02', 510000, 2400, 880), ('S4', '2025-03', 640000, 2900, 870)
),
quarter AS (
  SELECT store, SUM(revenue) AS revenue, SUM(transactions) AS transactions, SUM(staff_hours) AS staff_hours FROM sales GROUP BY store
)
SELECT s.store, s.city, q.revenue,
  ROUND(1.0 * q.revenue / s.sq_ft, 2) AS revenue_per_sqft,
  ROUND(1.0 * q.revenue / q.staff_hours, 2) AS revenue_per_staff_hour,
  ROUND(1.0 * q.revenue / q.transactions, 2) AS avg_basket
FROM stores AS s
JOIN quarter AS q ON q.store = s.store
ORDER BY revenue_per_sqft DESC;
```

## Expected result

| store | city | revenue | revenue_per_sqft | revenue_per_staff_hour | avg_basket |
| --- | --- | --- | --- | --- | --- |
| S1 | Pune | 5470000 | 2279.17 | 1263.28 | 298.91 |
| S3 | Nagpur | 3580000 | 1790 | 994.44 | 255.71 |
| S2 | Pune | 3090000 | 1716.67 | 936.36 | 237.69 |
| S4 | Nashik | 1570000 | 1046.67 | 592.45 | 212.16 |

## Explanation

Store productivity normalises revenue by what each store has to work with: floor space, staff hours and customers. S1 leads on every measure, earning 2,279 per square foot and 1,263 per staff hour. S4, the newest store, earns less than half as much per square foot, and its staff hours produce the least revenue, a store still building its customer base.

Ratios are totals divided by totals for the quarter, so a store's busy month weighs more than a quiet one. The average basket shows another difference: S1's customers spend about 299 per visit, S4's about 212.

**Common mistake:** averaging monthly ratios. Each month counts equally regardless of its revenue, so the figures drift away from the quarter's real productivity.

## Wrong answers

Feedback: incorrect-output

```sql
WITH stores(store, city, opened, sq_ft) AS ( VALUES ('S1', 'Pune', '2021-04-01', 2400), ('S2', 'Pune', '2023-09-15', 1800), ('S3', 'Nagpur', '2022-01-10', 2000), ('S4', 'Nashik', '2024-11-01', 1500) ), sales(store, month, revenue, transactions, staff_hours) AS ( VALUES ('S1', '2025-01', 1820000, 6100, 1450), ('S1', '2025-02', 1700000, 5800, 1400), ('S1', '2025-03', 1950000, 6400, 1480), ('S2', '2025-01', 980000, 4200, 1100), ('S2', '2025-02', 1010000, 4300, 1080), ('S2', '2025-03', 1100000, 4500, 1120), ('S3', '2025-01', 1250000, 4900, 1200), ('S3', '2025-02', 1150000, 4500, 1210), ('S3', '2025-03', 1180000, 4600, 1190), ('S4', '2025-01', 420000, 2100, 900), ('S4', '2025-02', 510000, 2400, 880), ('S4', '2025-03', 640000, 2900, 870) ) SELECT s.store, s.city, SUM(x.revenue) AS revenue, ROUND(AVG(1.0 * x.revenue / s.sq_ft), 2) AS revenue_per_sqft, ROUND(AVG(1.0 * x.revenue / x.staff_hours), 2) AS revenue_per_staff_hour, ROUND(AVG(1.0 * x.revenue / x.transactions), 2) AS avg_basket FROM stores AS s JOIN sales AS x ON x.store = s.store GROUP BY s.store, s.city ORDER BY revenue_per_sqft DESC;
```
