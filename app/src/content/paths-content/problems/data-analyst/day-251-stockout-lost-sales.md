---
id: da-day-251
title: Stock-out days and the sales they cost
order: 251
difficulty: intermediate
topic: Supply chain
summary: Count days each SKU ended with no stock and estimate the revenue lost from its usual demand.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Count stock-out days
  - Estimate lost sales from demand
prerequisites:
  - Day 165
  - Day 117
---

## Task

The closing stock of each SKU for five days is in the starter query, with each SKU's average daily demand and price. A day that **closed at 0** is a stock-out day. Estimate the sales lost on those days as `avg_daily_units` per stock-out day.

Return `sku`, `stockout_days`, `availability_pct` (days not out of stock ÷ days recorded × 100, rounded to 1 decimal place), `lost_units` and `lost_revenue`. Include SKUs with no stock-outs. Sort by `lost_revenue` from highest, then `sku`.

## Starter query

```sql
WITH inventory(day, sku, closing_stock) AS (
  VALUES
    ('2025-03-01', 'S1', 12), ('2025-03-02', 'S1', 5), ('2025-03-03', 'S1', 0), ('2025-03-04', 'S1', 0), ('2025-03-05', 'S1', 30),
    ('2025-03-01', 'S2', 40), ('2025-03-02', 'S2', 35), ('2025-03-03', 'S2', 31), ('2025-03-04', 'S2', 26), ('2025-03-05', 'S2', 20),
    ('2025-03-01', 'S3', 3), ('2025-03-02', 'S3', 0), ('2025-03-03', 'S3', 0), ('2025-03-04', 'S3', 0), ('2025-03-05', 'S3', 0)
),
demand(sku, avg_daily_units, price) AS (
  VALUES ('S1', 6, 250), ('S2', 5, 120), ('S3', 2, 900)
)
SELECT i.day, i.sku, i.closing_stock
FROM inventory AS i
ORDER BY i.sku, i.day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Count stock-out days per SKU with `SUM(closing_stock = 0)`, and recorded days with `COUNT(*)`.
3. Join `demand` and multiply: `stockout_days * avg_daily_units` units, times `price` for revenue.

## Solution

```sql
WITH inventory(day, sku, closing_stock) AS (
  VALUES
    ('2025-03-01', 'S1', 12), ('2025-03-02', 'S1', 5), ('2025-03-03', 'S1', 0), ('2025-03-04', 'S1', 0), ('2025-03-05', 'S1', 30),
    ('2025-03-01', 'S2', 40), ('2025-03-02', 'S2', 35), ('2025-03-03', 'S2', 31), ('2025-03-04', 'S2', 26), ('2025-03-05', 'S2', 20),
    ('2025-03-01', 'S3', 3), ('2025-03-02', 'S3', 0), ('2025-03-03', 'S3', 0), ('2025-03-04', 'S3', 0), ('2025-03-05', 'S3', 0)
),
demand(sku, avg_daily_units, price) AS (
  VALUES ('S1', 6, 250), ('S2', 5, 120), ('S3', 2, 900)
),
outs AS (
  SELECT sku, COUNT(*) AS days, SUM(closing_stock = 0) AS stockout_days FROM inventory GROUP BY sku
)
SELECT o.sku, o.stockout_days,
  ROUND(100.0 * (o.days - o.stockout_days) / o.days, 1) AS availability_pct,
  o.stockout_days * d.avg_daily_units AS lost_units,
  o.stockout_days * d.avg_daily_units * d.price AS lost_revenue
FROM outs AS o
JOIN demand AS d ON d.sku = o.sku
ORDER BY lost_revenue DESC, o.sku;
```

## Expected result

| sku | stockout_days | availability_pct | lost_units | lost_revenue |
| --- | --- | --- | --- | --- |
| S3 | 4 | 20 | 8 | 7200 |
| S1 | 2 | 60 | 12 | 3000 |
| S2 | 0 | 100 | 0 | 0 |

## Explanation

A stock-out day is a day the shelf closed empty, and during it, sales that would have happened did not. Multiplying stock-out days by the usual daily demand estimates the loss: S3 was out for four of five days and, at 900 each, lost about 7,200 of sales, more than twice S1's loss although S1 sells three times as many units a day.

S2 never ran out, and keeping it in the report (100% availability, no loss) shows that the problem is concentrated. The estimate assumes demand during a stock-out matches normal demand; in practice some customers wait or buy a substitute, so it is an upper bound.

**Common mistake:** filtering to stock-out days with `WHERE` before grouping. S2 disappears, and the availability for the others has to be guessed instead of counted.

## Wrong answers

Feedback: missing-rows

```sql
WITH inventory(day, sku, closing_stock) AS ( VALUES ('2025-03-01', 'S1', 12), ('2025-03-02', 'S1', 5), ('2025-03-03', 'S1', 0), ('2025-03-04', 'S1', 0), ('2025-03-05', 'S1', 30), ('2025-03-01', 'S2', 40), ('2025-03-02', 'S2', 35), ('2025-03-03', 'S2', 31), ('2025-03-04', 'S2', 26), ('2025-03-05', 'S2', 20), ('2025-03-01', 'S3', 3), ('2025-03-02', 'S3', 0), ('2025-03-03', 'S3', 0), ('2025-03-04', 'S3', 0), ('2025-03-05', 'S3', 0) ), demand(sku, avg_daily_units, price) AS ( VALUES ('S1', 6, 250), ('S2', 5, 120), ('S3', 2, 900) ), outs AS (SELECT sku, COUNT(*) AS stockout_days FROM inventory WHERE closing_stock = 0 GROUP BY sku) SELECT o.sku, o.stockout_days, ROUND(100.0 * (5 - o.stockout_days) / 5, 1) AS availability_pct, o.stockout_days * d.avg_daily_units AS lost_units, o.stockout_days * d.avg_daily_units * d.price AS lost_revenue FROM outs AS o JOIN demand AS d ON d.sku = o.sku ORDER BY lost_revenue DESC, o.sku;
```
