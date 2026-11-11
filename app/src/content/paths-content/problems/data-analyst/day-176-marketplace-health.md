---
id: da-day-176
title: Case study: marketplace health by month
order: 176
difficulty: advanced
topic: Case studies
summary: Combine GMV, take rate, active buyers and sellers, and repeat buyers in one monthly report.
module: data-analyst
duration: 18
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Build a multi-metric marketplace report
  - Apply one filter consistently to every metric
prerequisites:
  - Day 150
  - Day 137
---

## Task

A marketplace's monthly review (data in the starter query) uses **completed** orders only; refunded orders are excluded everywhere. For each month return:

- `month`, `gmv` (total order value), `take_rate_pct` (fees ÷ GMV as a percentage, rounded to 1 decimal place),
- `active_buyers` and `active_sellers` (distinct, with at least one completed order that month),
- `repeat_buyer_pct`: active buyers who also had a completed order in an **earlier** month, as a percentage of active buyers, rounded to 1 decimal place,
- `gmv_per_buyer` (rounded to 2 decimal places).

Sort by `month`.

## Starter query

```sql
WITH market_orders(order_id, buyer, seller, month, gmv, fee, status) AS (
  VALUES
    (1, 'b1', 's1', '2025-01', 1000, 100, 'complete'), (2, 'b2', 's1', '2025-01', 500, 50, 'complete'),
    (3, 'b3', 's2', '2025-01', 300, 24, 'refunded'),
    (4, 'b1', 's2', '2025-02', 800, 64, 'complete'), (5, 'b4', 's3', '2025-02', 400, 40, 'complete'),
    (6, 'b1', 's3', '2025-02', 200, 20, 'complete'),
    (7, 'b3', 's1', '2025-03', 600, 60, 'complete'), (8, 'b5', 's2', '2025-03', 900, 72, 'complete'),
    (9, 'b2', 's3', '2025-03', 300, 30, 'refunded'), (10, 'b4', 's3', '2025-03', 200, 20, 'complete')
)
SELECT order_id, buyer, seller, month, gmv, fee, status
FROM market_orders
ORDER BY month, order_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Start with a CTE of completed orders. Monthly totals: `SUM(gmv)`, `SUM(fee)`, `COUNT(DISTINCT buyer)` and `COUNT(DISTINCT seller)`.
3. For repeat buyers, list distinct (month, buyer) pairs and flag `EXISTS` a completed order by the same buyer in an earlier month (`c.month < b.month`). Average the flag per month, or count it and divide.

## Solution

```sql
WITH market_orders(order_id, buyer, seller, month, gmv, fee, status) AS (
  VALUES
    (1, 'b1', 's1', '2025-01', 1000, 100, 'complete'), (2, 'b2', 's1', '2025-01', 500, 50, 'complete'),
    (3, 'b3', 's2', '2025-01', 300, 24, 'refunded'),
    (4, 'b1', 's2', '2025-02', 800, 64, 'complete'), (5, 'b4', 's3', '2025-02', 400, 40, 'complete'),
    (6, 'b1', 's3', '2025-02', 200, 20, 'complete'),
    (7, 'b3', 's1', '2025-03', 600, 60, 'complete'), (8, 'b5', 's2', '2025-03', 900, 72, 'complete'),
    (9, 'b2', 's3', '2025-03', 300, 30, 'refunded'), (10, 'b4', 's3', '2025-03', 200, 20, 'complete')
),
completed AS (
  SELECT * FROM market_orders WHERE status = 'complete'
),
monthly AS (
  SELECT month, SUM(gmv) AS gmv, SUM(fee) AS fees,
    COUNT(DISTINCT buyer) AS active_buyers, COUNT(DISTINCT seller) AS active_sellers
  FROM completed
  GROUP BY month
),
buyer_months AS (
  SELECT DISTINCT b.month, b.buyer,
    EXISTS (SELECT 1 FROM completed AS c WHERE c.buyer = b.buyer AND c.month < b.month) AS is_repeat
  FROM completed AS b
),
repeats AS (
  SELECT month, SUM(is_repeat) AS repeat_buyers FROM buyer_months GROUP BY month
)
SELECT m.month, m.gmv,
  ROUND(100.0 * m.fees / m.gmv, 1) AS take_rate_pct,
  m.active_buyers, m.active_sellers,
  ROUND(100.0 * r.repeat_buyers / m.active_buyers, 1) AS repeat_buyer_pct,
  ROUND(1.0 * m.gmv / m.active_buyers, 2) AS gmv_per_buyer
FROM monthly AS m
JOIN repeats AS r ON r.month = m.month
ORDER BY m.month;
```

## Expected result

| month | gmv | take_rate_pct | active_buyers | active_sellers | repeat_buyer_pct | gmv_per_buyer |
| --- | --- | --- | --- | --- | --- | --- |
| 2025-01 | 1500 | 10 | 2 | 1 | 0 | 750 |
| 2025-02 | 1400 | 8.9 | 2 | 2 | 50 | 700 |
| 2025-03 | 1700 | 8.9 | 3 | 3 | 33.3 | 566.67 |

## Explanation

Marketplace health needs more than GMV. The take rate shows how much of the value the platform keeps, active buyers and sellers show both sides of the market, and the repeat-buyer share shows whether buyers come back.

Excluding refunds everywhere is what makes the metrics agree with each other. In March, b2's refunded order would otherwise count b2 as an active, repeat buyer. b3 is the opposite case: their only January order was refunded, so their March purchase is their first completed order and they are **not** a repeat buyer.

February's GMV fell, but half its buyers were returning ones, and March recovered with two new buyers.

**Common mistake:** filtering refunds out of GMV but not out of the buyer counts, so the "per buyer" figures divide one population by another.

## Wrong answers

Feedback: incorrect-output

```sql
WITH market_orders(order_id, buyer, seller, month, gmv, fee, status) AS ( VALUES (1, 'b1', 's1', '2025-01', 1000, 100, 'complete'), (2, 'b2', 's1', '2025-01', 500, 50, 'complete'), (3, 'b3', 's2', '2025-01', 300, 24, 'refunded'), (4, 'b1', 's2', '2025-02', 800, 64, 'complete'), (5, 'b4', 's3', '2025-02', 400, 40, 'complete'), (6, 'b1', 's3', '2025-02', 200, 20, 'complete'), (7, 'b3', 's1', '2025-03', 600, 60, 'complete'), (8, 'b5', 's2', '2025-03', 900, 72, 'complete'), (9, 'b2', 's3', '2025-03', 300, 30, 'refunded'), (10, 'b4', 's3', '2025-03', 200, 20, 'complete') ), completed AS (SELECT * FROM market_orders WHERE status = 'complete'), monthly AS (SELECT month, SUM(CASE WHEN status = 'complete' THEN gmv END) AS gmv, SUM(CASE WHEN status = 'complete' THEN fee END) AS fees, COUNT(DISTINCT buyer) AS active_buyers, COUNT(DISTINCT seller) AS active_sellers FROM market_orders GROUP BY month), buyer_months AS (SELECT DISTINCT b.month, b.buyer, EXISTS (SELECT 1 FROM market_orders AS c WHERE c.buyer = b.buyer AND c.month < b.month) AS is_repeat FROM market_orders AS b), repeats AS (SELECT month, SUM(is_repeat) AS repeat_buyers FROM buyer_months GROUP BY month) SELECT m.month, m.gmv, ROUND(100.0 * m.fees / m.gmv, 1) AS take_rate_pct, m.active_buyers, m.active_sellers, ROUND(100.0 * r.repeat_buyers / m.active_buyers, 1) AS repeat_buyer_pct, ROUND(1.0 * m.gmv / m.active_buyers, 2) AS gmv_per_buyer FROM monthly AS m JOIN repeats AS r ON r.month = m.month ORDER BY m.month;
```
