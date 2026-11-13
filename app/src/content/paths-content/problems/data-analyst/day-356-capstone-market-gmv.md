---
id: da-day-356
title: Capstone (marketplace) 1: GMV, net GMV and take rate
order: 356
difficulty: intermediate
topic: Capstone
summary: Separate gross merchandise value from what was actually kept, and compute commission revenue per category.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Separate gross from net value
  - Compute an effective rate
prerequisites:
  - Day 115
  - Day 176
---

## Task

The last capstone follows an online marketplace (the same data each day, starter query). For each category, return `category`, `orders`, `gmv` (all orders), `net_gmv` (only `delivered` orders; returned and disputed orders are not kept), `commission` (net GMV × the category's take rate, rounded to 2 decimal places) and `effective_take_pct` (commission ÷ **gross** GMV × 100, rounded to 1 decimal place). Sort by `commission` from highest.

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
SELECT o.order_id, s.category, o.seller, o.gmv, o.status
FROM orders AS o
JOIN sellers AS s ON s.seller = o.seller
ORDER BY o.order_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Join orders to sellers for the category and to `commission` for the rate.
3. `SUM(CASE WHEN status = 'delivered' THEN gmv ELSE 0 END)` is net GMV; commission applies the rate to it.

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
by_category AS (
  SELECT s.category, COUNT(*) AS orders, SUM(o.gmv) AS gmv,
    SUM(CASE WHEN o.status = 'delivered' THEN o.gmv ELSE 0 END) AS net_gmv, MAX(c.take_rate_pct) AS take_rate_pct
  FROM orders AS o
  JOIN sellers AS s ON s.seller = o.seller
  JOIN commission AS c ON c.category = s.category
  GROUP BY s.category
)
SELECT category, orders, gmv, net_gmv, ROUND(net_gmv * take_rate_pct / 100.0, 2) AS commission,
  ROUND(100.0 * net_gmv * take_rate_pct / 100.0 / gmv, 1) AS effective_take_pct
FROM by_category
ORDER BY commission DESC;
```

## Expected result

| category | orders | gmv | net_gmv | commission | effective_take_pct |
| --- | --- | --- | --- | --- | --- |
| Electronics | 4 | 45300 | 23500 | 1175 | 2.6 |
| Home | 4 | 8900 | 6800 | 816 | 9.2 |
| Fashion | 2 | 6000 | 2800 | 420 | 7 |
| Food | 4 | 3200 | 3200 | 256 | 8 |

## Explanation

Gross merchandise value (GMV) counts every order; what the marketplace actually earns is commission on orders that were kept. Electronics has by far the highest GMV, 45,300, but disputes and returns cut its net GMV to 23,500, and its 5% take rate leaves 1,175 of commission. Home, with a fifth of the GMV, earns 816.

The effective take rate (commission ÷ gross GMV) combines the headline rate with the share of orders that stick: Electronics keeps only 2.6% of its GMV as revenue, Food the full 8% because none of its orders were returned or disputed.

**Common mistake:** applying the take rate to gross GMV. Returned and disputed orders earn commission they never pay, and Electronics' revenue is almost doubled.

## Wrong answers

Feedback: incorrect-output

```sql
WITH sellers(seller, category, joined) AS ( VALUES ('Kala Crafts', 'Home', '2024-06-01'), ('Tea Trails', 'Food', '2024-08-15'), ('Gadget Guru', 'Electronics', '2024-03-10'), ('Loom Story', 'Fashion', '2024-11-20'), ('Spice Route', 'Food', '2025-01-05') ), orders(order_id, seller, buyer, ordered_on, gmv, status) AS ( VALUES (1, 'Kala Crafts', 'b1', '2025-03-01', 2400, 'delivered'), (2, 'Kala Crafts', 'b2', '2025-03-03', 1800, 'delivered'), (3, 'Tea Trails', 'b1', '2025-03-04', 900, 'delivered'), (4, 'Gadget Guru', 'b3', '2025-03-05', 12000, 'disputed'), (5, 'Gadget Guru', 'b4', '2025-03-06', 8500, 'delivered'), (6, 'Loom Story', 'b2', '2025-03-08', 3200, 'returned'), (7, 'Tea Trails', 'b5', '2025-03-09', 650, 'delivered'), (8, 'Gadget Guru', 'b1', '2025-03-12', 15000, 'delivered'), (9, 'Spice Route', 'b5', '2025-03-14', 450, 'delivered'), (10, 'Kala Crafts', 'b6', '2025-03-15', 2100, 'disputed'), (11, 'Loom Story', 'b7', '2025-03-18', 2800, 'delivered'), (12, 'Tea Trails', 'b2', '2025-03-20', 1200, 'delivered'), (13, 'Gadget Guru', 'b8', '2025-03-22', 9800, 'returned'), (14, 'Kala Crafts', 'b1', '2025-03-25', 2600, 'delivered') ), commission(category, take_rate_pct) AS ( VALUES ('Home', 12), ('Food', 8), ('Electronics', 5), ('Fashion', 15) ), by_category AS (SELECT s.category, COUNT(*) AS orders, SUM(o.gmv) AS gmv, SUM(o.gmv) AS net_gmv, MAX(c.take_rate_pct) AS take_rate_pct FROM orders AS o JOIN sellers AS s ON s.seller = o.seller JOIN commission AS c ON c.category = s.category GROUP BY s.category) SELECT category, orders, gmv, net_gmv, ROUND(net_gmv * take_rate_pct / 100.0, 2) AS commission, ROUND(100.0 * net_gmv * take_rate_pct / 100.0 / gmv, 1) AS effective_take_pct FROM by_category ORDER BY commission DESC;
```
