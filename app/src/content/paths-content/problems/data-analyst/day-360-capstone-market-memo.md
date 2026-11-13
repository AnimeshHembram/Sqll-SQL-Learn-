---
id: da-day-360
title: Capstone (marketplace) 5: the numbers for the monthly memo
order: 360
difficulty: advanced
topic: Capstone
summary: Bring the marketplace analysis together in one row: GMV, net revenue, problems, the top seller's share and new sellers.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: false
checkColumnNames: true
objectives:
  - Combine one-row summaries
  - Report a top item next to totals
prerequisites:
  - Day 350
  - Day 176
---

## Task

Same marketplace, last day of the capstones. Produce **one row** for the March memo:

- `orders`, `buyers` (distinct), `gmv` and `net_gmv` (delivered orders only),
- `commission` (net GMV × each order's category take rate, summed, rounded to 2 decimal places),
- `problem_rate_pct` (returned or disputed orders ÷ orders × 100, rounded to 1 decimal place),
- `top_seller` and `top_seller_share_pct` (the seller with the highest GMV and their share of GMV, rounded to 1 decimal place),
- `new_sellers` (sellers who joined in 2025) and `new_seller_gmv` (their GMV).

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
SELECT o.*, s.category, s.joined
FROM orders AS o
JOIN sellers AS s ON s.seller = o.seller
ORDER BY o.order_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Build one enriched row per order (category, take rate, joined date) in a CTE, then aggregate it once for the totals.
3. Find the top seller in a separate CTE (`ORDER BY SUM(gmv) DESC LIMIT 1`) and combine the one-row CTEs with a `CROSS JOIN`.

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
enriched AS (
  SELECT o.order_id, o.seller, o.buyer, o.gmv, o.status, s.joined, c.take_rate_pct
  FROM orders AS o
  JOIN sellers AS s ON s.seller = o.seller
  JOIN commission AS c ON c.category = s.category
),
totals AS (
  SELECT COUNT(*) AS orders, COUNT(DISTINCT buyer) AS buyers, SUM(gmv) AS gmv,
    SUM(CASE WHEN status = 'delivered' THEN gmv ELSE 0 END) AS net_gmv,
    SUM(CASE WHEN status = 'delivered' THEN gmv * take_rate_pct / 100.0 ELSE 0 END) AS commission,
    100.0 * SUM(status IN ('returned', 'disputed')) / COUNT(*) AS problem_rate,
    SUM(CASE WHEN joined >= '2025-01-01' THEN gmv ELSE 0 END) AS new_seller_gmv
  FROM enriched
),
top AS (
  SELECT seller, SUM(gmv) AS seller_gmv FROM enriched GROUP BY seller ORDER BY seller_gmv DESC LIMIT 1
)
SELECT t.orders, t.buyers, t.gmv, t.net_gmv, ROUND(t.commission, 2) AS commission, ROUND(t.problem_rate, 1) AS problem_rate_pct,
  p.seller AS top_seller, ROUND(100.0 * p.seller_gmv / t.gmv, 1) AS top_seller_share_pct,
  (SELECT COUNT(*) FROM sellers WHERE joined >= '2025-01-01') AS new_sellers, t.new_seller_gmv
FROM totals AS t
CROSS JOIN top AS p;
```

## Expected result

| orders | buyers | gmv | net_gmv | commission | problem_rate_pct | top_seller | top_seller_share_pct | new_sellers | new_seller_gmv |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 14 | 8 | 63400 | 36300 | 2667 | 28.6 | Gadget Guru | 71.5 | 1 | 450 |

## Explanation

The final capstone memo brings the marketplace together: 14 orders from 8 buyers, 63,400 of GMV of which 36,300 was kept, and 2,667 of commission. More than a quarter of orders (28.6%) ended in a return or a dispute, and one seller provides 71.5% of GMV, the two numbers that belong in the first paragraph.

Building one enriched row per order (with category, take rate and joining date) and aggregating it once keeps every figure consistent. The top seller comes from its own one-row CTE combined with the totals by a `CROSS JOIN`. The one new seller of 2025, Spice Route, has brought only 450 so far.

**Common mistake:** charging commission on all orders. Disputed and returned orders add to commission they never generated, and revenue is overstated by about two thirds (4,489 instead of 2,667).

## Wrong answers

Feedback: incorrect-output

```sql
WITH sellers(seller, category, joined) AS ( VALUES ('Kala Crafts', 'Home', '2024-06-01'), ('Tea Trails', 'Food', '2024-08-15'), ('Gadget Guru', 'Electronics', '2024-03-10'), ('Loom Story', 'Fashion', '2024-11-20'), ('Spice Route', 'Food', '2025-01-05') ), orders(order_id, seller, buyer, ordered_on, gmv, status) AS ( VALUES (1, 'Kala Crafts', 'b1', '2025-03-01', 2400, 'delivered'), (2, 'Kala Crafts', 'b2', '2025-03-03', 1800, 'delivered'), (3, 'Tea Trails', 'b1', '2025-03-04', 900, 'delivered'), (4, 'Gadget Guru', 'b3', '2025-03-05', 12000, 'disputed'), (5, 'Gadget Guru', 'b4', '2025-03-06', 8500, 'delivered'), (6, 'Loom Story', 'b2', '2025-03-08', 3200, 'returned'), (7, 'Tea Trails', 'b5', '2025-03-09', 650, 'delivered'), (8, 'Gadget Guru', 'b1', '2025-03-12', 15000, 'delivered'), (9, 'Spice Route', 'b5', '2025-03-14', 450, 'delivered'), (10, 'Kala Crafts', 'b6', '2025-03-15', 2100, 'disputed'), (11, 'Loom Story', 'b7', '2025-03-18', 2800, 'delivered'), (12, 'Tea Trails', 'b2', '2025-03-20', 1200, 'delivered'), (13, 'Gadget Guru', 'b8', '2025-03-22', 9800, 'returned'), (14, 'Kala Crafts', 'b1', '2025-03-25', 2600, 'delivered') ), commission(category, take_rate_pct) AS ( VALUES ('Home', 12), ('Food', 8), ('Electronics', 5), ('Fashion', 15) ), enriched AS (SELECT o.order_id, o.seller, o.buyer, o.gmv, o.status, s.joined, c.take_rate_pct FROM orders AS o JOIN sellers AS s ON s.seller = o.seller JOIN commission AS c ON c.category = s.category), totals AS (SELECT COUNT(*) AS orders, COUNT(DISTINCT buyer) AS buyers, SUM(gmv) AS gmv, SUM(CASE WHEN status = 'delivered' THEN gmv ELSE 0 END) AS net_gmv, SUM(gmv * take_rate_pct / 100.0) AS commission, 100.0 * SUM(status IN ('returned', 'disputed')) / COUNT(*) AS problem_rate, SUM(CASE WHEN joined >= '2025-01-01' THEN gmv ELSE 0 END) AS new_seller_gmv FROM enriched), top AS (SELECT seller, SUM(gmv) AS seller_gmv FROM enriched GROUP BY seller ORDER BY seller_gmv DESC LIMIT 1) SELECT t.orders, t.buyers, t.gmv, t.net_gmv, ROUND(t.commission, 2) AS commission, ROUND(t.problem_rate, 1) AS problem_rate_pct, p.seller AS top_seller, ROUND(100.0 * p.seller_gmv / t.gmv, 1) AS top_seller_share_pct, (SELECT COUNT(*) FROM sellers WHERE joined >= '2025-01-01') AS new_sellers, t.new_seller_gmv FROM totals AS t CROSS JOIN top AS p;
```
