---
id: spr-05-quarterly-targets
title: Quarterly revenue against targets
order: 5
difficulty: intermediate
topic: Targets
summary: Compare each region's 2024 quarterly net revenue with its target and label each quarter Met or Missed.
module: revenue-and-growth
duration: 30
dataset: kalaa-home
tables:
  - orders
  - order_items
  - customers
  - targets
orderMatters: true
checkColumnNames: true
objectives:
  - Derive quarters from dates
  - Compare actuals with targets using a LEFT JOIN and CASE
prerequisites:
  - Joins on two columns
  - CASE expressions
  - COALESCE
---

## Task

Each region had a quarterly net revenue target for 2024 (the `targets` table). For every row of `targets` in 2024, return:

- `quarter` and `region`,
- `revenue`: the region's net revenue in that quarter (the customer's region; delivered orders only),
- `revenue_target`,
- `attainment_pct`: revenue as a percentage of the target, rounded to one decimal,
- `status`: `'Met'` when revenue is at least the target, otherwise `'Missed'`.

Sort by `quarter`, then `region`.

## Starter query

```sql
SELECT year, quarter, region, revenue_target
FROM targets
WHERE year = 2024
ORDER BY quarter, region;
```

## Hints

1. The quarter of a date is `(month + 2) / 3` with whole-number division, where the month is `CAST(substr(order_date, 6, 2) AS INTEGER)`.
2. In a CTE, total delivered 2024 revenue by quarter and region (join `orders`, `customers` and `order_items`). Then join it to `targets` on both quarter and region.
3. Start from `targets` with a `LEFT JOIN` to your CTE and `COALESCE(revenue, 0)`, so a region with no sales in a quarter would still show up, as Missed.

## Solution

```sql
WITH actuals AS (
  SELECT (CAST(substr(o.order_date, 6, 2) AS INTEGER) + 2) / 3 AS quarter,
         c.region,
         SUM(i.quantity * i.unit_price - i.discount) AS revenue
  FROM orders AS o
  JOIN customers AS c ON c.customer_id = o.customer_id
  JOIN order_items AS i ON i.order_id = o.order_id
  WHERE o.status = 'delivered' AND o.order_date BETWEEN '2024-01-01' AND '2024-12-31'
  GROUP BY quarter, c.region
)
SELECT t.quarter,
       t.region,
       COALESCE(a.revenue, 0) AS revenue,
       t.revenue_target,
       ROUND(100.0 * COALESCE(a.revenue, 0) / t.revenue_target, 1) AS attainment_pct,
       CASE WHEN COALESCE(a.revenue, 0) >= t.revenue_target THEN 'Met' ELSE 'Missed' END AS status
FROM targets AS t
LEFT JOIN actuals AS a ON a.quarter = t.quarter AND a.region = t.region
WHERE t.year = 2024
ORDER BY t.quarter, t.region;
```

## Expected result

| quarter | region | revenue | revenue_target | attainment_pct | status |
| --- | --- | --- | --- | --- | --- |
| 1 | East | 9661 | 55000 | 17.6 | Missed |
| 1 | North | 28987 | 95000 | 30.5 | Missed |
| 1 | South | 111135 | 90000 | 123.5 | Met |
| 1 | West | 100184 | 75000 | 133.6 | Met |
| 2 | East | 44356 | 55000 | 80.6 | Missed |
| 2 | North | 95459 | 95000 | 100.5 | Met |
| 2 | South | 81095 | 90000 | 90.1 | Missed |
| 2 | West | 78813 | 75000 | 105.1 | Met |
| 3 | East | 80172 | 60000 | 133.6 | Met |
| 3 | North | 68512 | 105000 | 65.2 | Missed |
| 3 | South | 204716 | 100000 | 204.7 | Met |
| 3 | West | 61666 | 85000 | 72.5 | Missed |
| 4 | East | 105290 | 105000 | 100.3 | Met |
| 4 | North | 141344 | 185000 | 76.4 | Missed |
| 4 | South | 213829 | 175000 | 122.2 | Met |
| 4 | West | 118017 | 145000 | 81.4 | Missed |

## Explanation

Targets drive the query: each of the 16 target rows looks up its actual revenue. Starting from `targets` with a `LEFT JOIN` means a quarter with no sales still appears (as 0 and Missed) instead of silently disappearing.

**What it tells the business:** the **South met its target in three of four quarters**, including 204.7% in Q3. The **North missed in three quarters**, with Q4 at 76.4% of a ₹1.85 lakh target. The West met its target in the first half and then missed in both the third and the festive fourth quarter. The East's Q1 is an outlier at 17.6%: almost no sales that quarter, which deserves a conversation with the regional team before anyone draws conclusions.

**Common mistake:** `CAST(substr(order_date, 6, 2) AS INTEGER) / 3` without the `+ 2`. That puts January and February in quarter 0 and March in quarter 1.

## Wrong answers

Feedback: incorrect-output

```sql
WITH actuals AS (
  SELECT CAST(substr(o.order_date, 6, 2) AS INTEGER) / 3 AS quarter, c.region,
         SUM(i.quantity * i.unit_price - i.discount) AS revenue
  FROM orders AS o JOIN customers AS c ON c.customer_id = o.customer_id JOIN order_items AS i ON i.order_id = o.order_id
  WHERE o.status = 'delivered' AND o.order_date BETWEEN '2024-01-01' AND '2024-12-31'
  GROUP BY quarter, c.region
)
SELECT t.quarter, t.region, COALESCE(a.revenue, 0) AS revenue, t.revenue_target,
       ROUND(100.0 * COALESCE(a.revenue, 0) / t.revenue_target, 1) AS attainment_pct,
       CASE WHEN COALESCE(a.revenue, 0) >= t.revenue_target THEN 'Met' ELSE 'Missed' END AS status
FROM targets AS t LEFT JOIN actuals AS a ON a.quarter = t.quarter AND a.region = t.region
WHERE t.year = 2024 ORDER BY t.quarter, t.region;
```

Feedback: incorrect-output

```sql
WITH actuals AS (
  SELECT (CAST(substr(o.order_date, 6, 2) AS INTEGER) + 2) / 3 AS quarter, c.region,
         SUM(i.quantity * i.unit_price - i.discount) AS revenue
  FROM orders AS o JOIN customers AS c ON c.customer_id = o.customer_id JOIN order_items AS i ON i.order_id = o.order_id
  WHERE o.status <> 'cancelled' AND o.order_date BETWEEN '2024-01-01' AND '2024-12-31'
  GROUP BY quarter, c.region
)
SELECT t.quarter, t.region, COALESCE(a.revenue, 0) AS revenue, t.revenue_target,
       ROUND(100.0 * COALESCE(a.revenue, 0) / t.revenue_target, 1) AS attainment_pct,
       CASE WHEN COALESCE(a.revenue, 0) >= t.revenue_target THEN 'Met' ELSE 'Missed' END AS status
FROM targets AS t LEFT JOIN actuals AS a ON a.quarter = t.quarter AND a.region = t.region
WHERE t.year = 2024 ORDER BY t.quarter, t.region;
```
