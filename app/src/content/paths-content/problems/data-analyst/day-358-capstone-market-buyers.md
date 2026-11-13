---
id: da-day-358
title: Capstone (marketplace) 3: cross-category buyers
order: 358
difficulty: intermediate
topic: Capstone
summary: Find buyers who bought from more than one category and how much of the GMV they bring.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Count distinct categories per buyer
  - Compare buyer groups by value
prerequisites:
  - Day 245
  - Day 309
---

## Task

Same marketplace. Some buyers shop across categories. For each buyer, count the **distinct categories** they bought from (all orders count). Return one row per breadth: `categories` (1, 2, 3 …), `buyers`, `gmv` and `gmv_share_pct` (rounded to 1 decimal place), sorted by `categories`.

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
SELECT o.buyer, s.category, o.gmv
FROM orders AS o
JOIN sellers AS s ON s.seller = o.seller
ORDER BY o.buyer;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Per buyer: `COUNT(DISTINCT s.category)` and `SUM(o.gmv)`, joining orders to sellers for the category.
3. Group the buyers by their category count; the share uses `SUM(SUM(gmv)) OVER ()`.

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
per_buyer AS (
  SELECT o.buyer, COUNT(DISTINCT s.category) AS categories, SUM(o.gmv) AS gmv
  FROM orders AS o
  JOIN sellers AS s ON s.seller = o.seller
  GROUP BY o.buyer
)
SELECT categories, COUNT(*) AS buyers, SUM(gmv) AS gmv, ROUND(100.0 * SUM(gmv) / SUM(SUM(gmv)) OVER (), 1) AS gmv_share_pct
FROM per_buyer
GROUP BY categories
ORDER BY categories;
```

## Expected result

| categories | buyers | gmv | gmv_share_pct |
| --- | --- | --- | --- |
| 1 | 6 | 36300 | 57.3 |
| 3 | 2 | 27100 | 42.7 |

## Explanation

Buyers who shop across categories are often a marketplace's most valuable: here two buyers bought from three categories and brought 42.7% of GMV, almost as much as the five single-category buyers together. Counting **distinct categories** per buyer requires the seller table, because the category belongs to the seller, not to the order.

Group shares come from a window over the grouped rows, `SUM(SUM(gmv)) OVER ()`. Most of the single-category GMV comes from electronics buyers with large baskets, which is a reminder to look at both counts and values.

**Common mistake:** counting distinct sellers instead of categories. b5 bought from Tea Trails and Spice Route, both Food sellers: two sellers but one category, so they would wrongly be counted as a cross-category buyer.

## Wrong answers

Feedback: incorrect-output

```sql
WITH sellers(seller, category, joined) AS ( VALUES ('Kala Crafts', 'Home', '2024-06-01'), ('Tea Trails', 'Food', '2024-08-15'), ('Gadget Guru', 'Electronics', '2024-03-10'), ('Loom Story', 'Fashion', '2024-11-20'), ('Spice Route', 'Food', '2025-01-05') ), orders(order_id, seller, buyer, ordered_on, gmv, status) AS ( VALUES (1, 'Kala Crafts', 'b1', '2025-03-01', 2400, 'delivered'), (2, 'Kala Crafts', 'b2', '2025-03-03', 1800, 'delivered'), (3, 'Tea Trails', 'b1', '2025-03-04', 900, 'delivered'), (4, 'Gadget Guru', 'b3', '2025-03-05', 12000, 'disputed'), (5, 'Gadget Guru', 'b4', '2025-03-06', 8500, 'delivered'), (6, 'Loom Story', 'b2', '2025-03-08', 3200, 'returned'), (7, 'Tea Trails', 'b5', '2025-03-09', 650, 'delivered'), (8, 'Gadget Guru', 'b1', '2025-03-12', 15000, 'delivered'), (9, 'Spice Route', 'b5', '2025-03-14', 450, 'delivered'), (10, 'Kala Crafts', 'b6', '2025-03-15', 2100, 'disputed'), (11, 'Loom Story', 'b7', '2025-03-18', 2800, 'delivered'), (12, 'Tea Trails', 'b2', '2025-03-20', 1200, 'delivered'), (13, 'Gadget Guru', 'b8', '2025-03-22', 9800, 'returned'), (14, 'Kala Crafts', 'b1', '2025-03-25', 2600, 'delivered') ), commission(category, take_rate_pct) AS ( VALUES ('Home', 12), ('Food', 8), ('Electronics', 5), ('Fashion', 15) ), per_buyer AS (SELECT o.buyer, COUNT(DISTINCT o.seller) AS categories, SUM(o.gmv) AS gmv FROM orders AS o GROUP BY o.buyer) SELECT categories, COUNT(*) AS buyers, SUM(gmv) AS gmv, ROUND(100.0 * SUM(gmv) / SUM(SUM(gmv)) OVER (), 1) AS gmv_share_pct FROM per_buyer GROUP BY categories ORDER BY categories;
```
