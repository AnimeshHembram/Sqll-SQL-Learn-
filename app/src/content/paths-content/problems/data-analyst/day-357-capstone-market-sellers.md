---
id: da-day-357
title: Capstone (marketplace) 2: seller health scores
order: 357
difficulty: advanced
topic: Capstone
summary: Score every seller on volume, problem rate and buyer reach, including sellers with no problems.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Score entities on several measures
  - Keep every seller in the report
prerequisites:
  - Day 178
  - Day 315
---

## Task

Same marketplace. For **every seller**, return `seller`, `orders`, `buyers` (distinct), `gmv`, `problem_orders` (returned or disputed), `problem_pct` (problem orders ÷ orders × 100, rounded to 1 decimal place) and `health`: `'at risk'` when the problem rate is 30% or more, `'watch'` when above 0%, otherwise `'good'`. Sort by `problem_pct` from highest, then `seller`.

## Starter query

```sql
WITH sellers(seller, category, joined) AS (
  VALUES ('Kala Crafts', 'Home', '2024-06-01'), ('Tea Trails', 'Food', '2024-08-15'), ('Gadget Guru', 'Electronics', '2024-03-10'),
         ('Loom Story', 'Fashion', '2024-11-20'), ('Spice Route', 'Food', '2025-01-05')
),
orders(order_id, seller, buyer, ordered_on, gmv, status) AS (
  VALUES
    (1, 'Kala Crafts', 'b1', '2025-03-01', 2400, 'delivered'), (2, 'Kala Crafts', 'b2', '2025-03-03', 1800, 'delivered'),
    (3, 'Tea Trails', 'b1', '2025-03-04', 900, 'delivered'), (4, 'Gadget Guru', 'b3', '2025-03-05', 12000, 'disputed'),
    (5, 'Gadget Guru', 'b4', '2025-03-06', 8500, 'delivered'), (6, 'Loom Story', 'b2', '2025-03-08', 3200, 'returned'),
    (7, 'Tea Trails', 'b5', '2025-03-09', 650, 'delivered'), (8, 'Gadget Guru', 'b1', '2025-03-12', 15000, 'delivered'),
    (9, 'Spice Route', 'b5', '2025-03-14', 450, 'delivered'), (10, 'Kala Crafts', 'b6', '2025-03-15', 2100, 'disputed'),
    (11, 'Loom Story', 'b7', '2025-03-18', 2800, 'delivered'), (12, 'Tea Trails', 'b2', '2025-03-20', 1200, 'delivered'),
    (13, 'Gadget Guru', 'b8', '2025-03-22', 9800, 'returned'), (14, 'Kala Crafts', 'b1', '2025-03-25', 2600, 'delivered')
),
commission(category, take_rate_pct) AS (
  VALUES ('Home', 12), ('Food', 8), ('Electronics', 5), ('Fashion', 15)
)
SELECT seller, order_id, buyer, gmv, status
FROM orders
ORDER BY seller, order_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Start from `sellers` with a `LEFT JOIN` to orders so every seller appears; count with `COUNT(o.order_id)` and `COUNT(DISTINCT o.buyer)`.
3. `SUM(o.status IN ('returned', 'disputed'))` counts problems; protect the rate with `NULLIF(COUNT(o.order_id), 0)`.

## Solution

```sql
WITH sellers(seller, category, joined) AS (
  VALUES ('Kala Crafts', 'Home', '2024-06-01'), ('Tea Trails', 'Food', '2024-08-15'), ('Gadget Guru', 'Electronics', '2024-03-10'),
         ('Loom Story', 'Fashion', '2024-11-20'), ('Spice Route', 'Food', '2025-01-05')
),
orders(order_id, seller, buyer, ordered_on, gmv, status) AS (
  VALUES
    (1, 'Kala Crafts', 'b1', '2025-03-01', 2400, 'delivered'), (2, 'Kala Crafts', 'b2', '2025-03-03', 1800, 'delivered'),
    (3, 'Tea Trails', 'b1', '2025-03-04', 900, 'delivered'), (4, 'Gadget Guru', 'b3', '2025-03-05', 12000, 'disputed'),
    (5, 'Gadget Guru', 'b4', '2025-03-06', 8500, 'delivered'), (6, 'Loom Story', 'b2', '2025-03-08', 3200, 'returned'),
    (7, 'Tea Trails', 'b5', '2025-03-09', 650, 'delivered'), (8, 'Gadget Guru', 'b1', '2025-03-12', 15000, 'delivered'),
    (9, 'Spice Route', 'b5', '2025-03-14', 450, 'delivered'), (10, 'Kala Crafts', 'b6', '2025-03-15', 2100, 'disputed'),
    (11, 'Loom Story', 'b7', '2025-03-18', 2800, 'delivered'), (12, 'Tea Trails', 'b2', '2025-03-20', 1200, 'delivered'),
    (13, 'Gadget Guru', 'b8', '2025-03-22', 9800, 'returned'), (14, 'Kala Crafts', 'b1', '2025-03-25', 2600, 'delivered')
),
commission(category, take_rate_pct) AS (
  VALUES ('Home', 12), ('Food', 8), ('Electronics', 5), ('Fashion', 15)
),
per_seller AS (
  SELECT s.seller, COUNT(o.order_id) AS orders, COUNT(DISTINCT o.buyer) AS buyers, COALESCE(SUM(o.gmv), 0) AS gmv,
    COALESCE(SUM(o.status IN ('returned', 'disputed')), 0) AS problem_orders
  FROM sellers AS s
  LEFT JOIN orders AS o ON o.seller = s.seller
  GROUP BY s.seller
)
SELECT seller, orders, buyers, gmv, problem_orders,
  ROUND(100.0 * problem_orders / NULLIF(orders, 0), 1) AS problem_pct,
  CASE WHEN 100.0 * problem_orders / NULLIF(orders, 0) >= 30 THEN 'at risk'
       WHEN problem_orders > 0 THEN 'watch' ELSE 'good' END AS health
FROM per_seller
ORDER BY problem_pct DESC, seller;
```

## Expected result

| seller | orders | buyers | gmv | problem_orders | problem_pct | health |
| --- | --- | --- | --- | --- | --- | --- |
| Gadget Guru | 4 | 4 | 45300 | 2 | 50 | at risk |
| Loom Story | 2 | 2 | 6000 | 1 | 50 | at risk |
| Kala Crafts | 4 | 3 | 8900 | 1 | 25 | watch |
| Spice Route | 1 | 1 | 450 | 0 | 0 | good |
| Tea Trails | 3 | 3 | 2750 | 0 | 0 | good |

## Explanation

Seller health combines volume with quality. Gadget Guru is the marketplace's biggest seller (45,300 of GMV) but half its orders ended in a return or a dispute, so it is at risk; Loom Story has the same problem rate on far fewer orders. Kala Crafts had one dispute in four orders, worth watching.

Starting from `sellers` with a `LEFT JOIN` keeps every seller, and counting distinct buyers shows reach: Kala Crafts sold four orders to three buyers. Both returns **and** disputes count as problems, since either means a customer was unhappy.

**Common mistake:** counting only returns as problems. Disputes disappear, Kala Crafts looks healthy and Gadget Guru's problem rate halves.

## Wrong answers

Feedback: incorrect-output

```sql
WITH sellers(seller, category, joined) AS ( VALUES ('Kala Crafts', 'Home', '2024-06-01'), ('Tea Trails', 'Food', '2024-08-15'), ('Gadget Guru', 'Electronics', '2024-03-10'), ('Loom Story', 'Fashion', '2024-11-20'), ('Spice Route', 'Food', '2025-01-05') ), orders(order_id, seller, buyer, ordered_on, gmv, status) AS ( VALUES (1, 'Kala Crafts', 'b1', '2025-03-01', 2400, 'delivered'), (2, 'Kala Crafts', 'b2', '2025-03-03', 1800, 'delivered'), (3, 'Tea Trails', 'b1', '2025-03-04', 900, 'delivered'), (4, 'Gadget Guru', 'b3', '2025-03-05', 12000, 'disputed'), (5, 'Gadget Guru', 'b4', '2025-03-06', 8500, 'delivered'), (6, 'Loom Story', 'b2', '2025-03-08', 3200, 'returned'), (7, 'Tea Trails', 'b5', '2025-03-09', 650, 'delivered'), (8, 'Gadget Guru', 'b1', '2025-03-12', 15000, 'delivered'), (9, 'Spice Route', 'b5', '2025-03-14', 450, 'delivered'), (10, 'Kala Crafts', 'b6', '2025-03-15', 2100, 'disputed'), (11, 'Loom Story', 'b7', '2025-03-18', 2800, 'delivered'), (12, 'Tea Trails', 'b2', '2025-03-20', 1200, 'delivered'), (13, 'Gadget Guru', 'b8', '2025-03-22', 9800, 'returned'), (14, 'Kala Crafts', 'b1', '2025-03-25', 2600, 'delivered') ), commission(category, take_rate_pct) AS ( VALUES ('Home', 12), ('Food', 8), ('Electronics', 5), ('Fashion', 15) ), per_seller AS (SELECT s.seller, COUNT(o.order_id) AS orders, COUNT(o.buyer) AS buyers, COALESCE(SUM(o.gmv), 0) AS gmv, COALESCE(SUM(o.status = 'returned'), 0) AS problem_orders FROM sellers AS s LEFT JOIN orders AS o ON o.seller = s.seller GROUP BY s.seller) SELECT seller, orders, buyers, gmv, problem_orders, ROUND(100.0 * problem_orders / NULLIF(orders, 0), 1) AS problem_pct, CASE WHEN 100.0 * problem_orders / NULLIF(orders, 0) >= 30 THEN 'at risk' WHEN problem_orders > 0 THEN 'watch' ELSE 'good' END AS health FROM per_seller ORDER BY problem_pct DESC, seller;
```
