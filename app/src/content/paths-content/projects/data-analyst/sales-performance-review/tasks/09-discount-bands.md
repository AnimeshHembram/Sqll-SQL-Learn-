---
id: spr-09-discount-bands
title: Do discounts pay off?
order: 9
difficulty: advanced
topic: Pricing analysis
summary: Band 2024 orders by discount depth and compare return rate, order value and margin across the bands.
module: growth-drivers
duration: 30
dataset: kalaa-home
tables:
  - orders
  - order_items
  - products
orderMatters: true
checkColumnNames: true
objectives:
  - Band continuous values with CASE
  - Measure different populations with conditional aggregates
prerequisites:
  - CASE expressions
  - Common table expressions
  - Aggregates ignore NULL
---

## Task

Marketing gave bigger discounts in 2024. Did they pay off? Take every 2024 order that was **not cancelled** (delivered or returned) and put it in a discount band, using the order's total discount as a share of its gross value (`quantity * unit_price` summed over the order):

- `'1. No discount'`: no discount at all,
- `'2. Under 15%'`: a discount below 15% of gross value,
- `'3. 15% or more'`.

For each `discount_band` return `orders`, `return_rate_pct` (returned orders as a percentage of the band's orders), `avg_order_value` (average net revenue of the band's **delivered** orders, rounded to a whole rupee) and `margin_pct` (gross margin of the delivered orders, rounded to one decimal). Sort by `discount_band`.

## Starter query

```sql
SELECT o.order_id, o.status,
       SUM(i.quantity * i.unit_price) AS gross,
       SUM(i.discount) AS discount
FROM orders AS o
JOIN order_items AS i ON i.order_id = o.order_id
WHERE o.order_date >= '2024-01-01' AND o.status <> 'cancelled'
GROUP BY o.order_id
LIMIT 10;
```

## Hints

1. The band belongs to the **order**, so build one row per order first (gross, discount, net revenue and cost) in a CTE, then add the band with `CASE` in a second CTE.
2. Return rate needs both delivered and returned orders: `SUM(status = 'returned')` counts returns, because a true comparison is 1 in SQLite.
3. Order value and margin are about delivered orders only. Use `CASE WHEN status = 'delivered' THEN ... END` inside `AVG` and `SUM`, so returned orders are skipped (a `CASE` without `ELSE` gives NULL, which aggregates ignore).

## Solution

```sql
WITH order_totals AS (
  SELECT o.order_id, o.status,
         SUM(i.quantity * i.unit_price) AS gross,
         SUM(i.discount) AS discount,
         SUM(i.quantity * i.unit_price - i.discount) AS revenue,
         SUM(i.quantity * p.unit_cost) AS cost
  FROM orders AS o
  JOIN order_items AS i ON i.order_id = o.order_id
  JOIN products AS p ON p.product_id = i.product_id
  WHERE o.order_date >= '2024-01-01' AND o.status <> 'cancelled'
  GROUP BY o.order_id
),
banded AS (
  SELECT *,
         CASE
           WHEN discount = 0 THEN '1. No discount'
           WHEN 100.0 * discount / gross < 15 THEN '2. Under 15%'
           ELSE '3. 15% or more'
         END AS discount_band
  FROM order_totals
)
SELECT discount_band,
       COUNT(*) AS orders,
       ROUND(100.0 * SUM(status = 'returned') / COUNT(*), 1) AS return_rate_pct,
       ROUND(AVG(CASE WHEN status = 'delivered' THEN revenue END), 0) AS avg_order_value,
       ROUND(100.0 * SUM(CASE WHEN status = 'delivered' THEN revenue - cost END)
             / SUM(CASE WHEN status = 'delivered' THEN revenue END), 1) AS margin_pct
FROM banded
GROUP BY discount_band
ORDER BY discount_band;
```

## Expected result

| discount_band | orders | return_rate_pct | avg_order_value | margin_pct |
| --- | --- | --- | --- | --- |
| 1. No discount | 127 | 8.7 | 5177 | 55.4 |
| 2. Under 15% | 97 | 4.1 | 5767 | 51.1 |
| 3. 15% or more | 99 | 16.2 | 4896 | 43.1 |

## Explanation

The query works at the order level, because a discount band describes a whole order. Conditional aggregates then measure different populations in one pass: all non-cancelled orders for the return rate, delivered orders for value and margin.

**What it tells the business:** deep discounts did not pay off. Orders discounted **15% or more had a 16.2% return rate**, against 8.7% with no discount and 4.1% with a small discount. Their average delivered order was the smallest (₹4,896) and their margin the lowest (43.1% against 55.4%). Small discounts look healthy; deep ones attract buyers who send things back.

**Common mistake:** keeping only delivered orders from the start (`WHERE status = 'delivered'`). Every return rate then becomes 0%, and the most important finding disappears.

## Wrong answers

Feedback: incorrect-output

```sql
WITH order_totals AS (
  SELECT o.order_id, o.status, SUM(i.quantity * i.unit_price) AS gross, SUM(i.discount) AS discount,
         SUM(i.quantity * i.unit_price - i.discount) AS revenue, SUM(i.quantity * p.unit_cost) AS cost
  FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id JOIN products AS p ON p.product_id = i.product_id
  WHERE o.order_date >= '2024-01-01' AND o.status = 'delivered'
  GROUP BY o.order_id
),
banded AS (
  SELECT *, CASE WHEN discount = 0 THEN '1. No discount' WHEN 100.0 * discount / gross < 15 THEN '2. Under 15%' ELSE '3. 15% or more' END AS discount_band
  FROM order_totals
)
SELECT discount_band, COUNT(*) AS orders, ROUND(100.0 * SUM(status = 'returned') / COUNT(*), 1) AS return_rate_pct,
       ROUND(AVG(CASE WHEN status = 'delivered' THEN revenue END), 0) AS avg_order_value,
       ROUND(100.0 * SUM(CASE WHEN status = 'delivered' THEN revenue - cost END) / SUM(CASE WHEN status = 'delivered' THEN revenue END), 1) AS margin_pct
FROM banded GROUP BY discount_band ORDER BY discount_band;
```

Feedback: incorrect-output

```sql
WITH order_totals AS (
  SELECT o.order_id, o.status, SUM(i.quantity * i.unit_price) AS gross, SUM(i.discount) AS discount,
         SUM(i.quantity * i.unit_price - i.discount) AS revenue, SUM(i.quantity * p.unit_cost) AS cost
  FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id JOIN products AS p ON p.product_id = i.product_id
  WHERE o.order_date >= '2024-01-01' AND o.status <> 'cancelled'
  GROUP BY o.order_id
),
banded AS (
  SELECT *, CASE WHEN discount = 0 THEN '1. No discount' WHEN 100.0 * discount / gross < 15 THEN '2. Under 15%' ELSE '3. 15% or more' END AS discount_band
  FROM order_totals
)
SELECT discount_band, COUNT(*) AS orders, ROUND(100.0 * SUM(status = 'returned') / COUNT(*), 1) AS return_rate_pct,
       ROUND(AVG(revenue), 0) AS avg_order_value,
       ROUND(100.0 * SUM(revenue - cost) / SUM(revenue), 1) AS margin_pct
FROM banded GROUP BY discount_band ORDER BY discount_band;
```
