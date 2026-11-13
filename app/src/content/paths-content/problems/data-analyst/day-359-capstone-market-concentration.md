---
id: da-day-359
title: Capstone (marketplace) 4: how concentrated is GMV?
order: 359
difficulty: advanced
topic: Capstone
summary: Rank sellers by GMV, show cumulative shares, and compute a Herfindahl concentration index.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Measure concentration
  - Compute a cumulative share
prerequisites:
  - Day 135
  - Day 252
---

## Task

Same marketplace. Platforms worry when a few sellers bring most of the business. Rank sellers by GMV (all orders) and return `seller`, `gmv`, `share_pct`, `cumulative_share_pct` (both rounded to 1 decimal place) and, on every row, `hhi`: the **Herfindahl-Hirschman index**, the sum over all sellers of (share in %)², rounded to 0 decimal places (10,000 means one seller has everything; under 1,500 is usually considered unconcentrated). Sort by `gmv` from highest.

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
SELECT seller, SUM(gmv) AS gmv FROM orders GROUP BY seller ORDER BY gmv DESC;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Total GMV per seller, then the share with `100.0 * gmv / SUM(gmv) OVER ()`.
3. Cumulative share: `SUM(share) OVER (ORDER BY gmv DESC)`. HHI: `SUM(share * share) OVER ()`, computed on unrounded shares.

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
  SELECT seller, SUM(gmv) AS gmv FROM orders GROUP BY seller
),
shares AS (
  SELECT seller, gmv, 100.0 * gmv / SUM(gmv) OVER () AS share FROM per_seller
)
SELECT seller, gmv, ROUND(share, 1) AS share_pct,
  ROUND(SUM(share) OVER (ORDER BY gmv DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 1) AS cumulative_share_pct,
  ROUND(SUM(share * share) OVER ()) AS hhi
FROM shares
ORDER BY gmv DESC;
```

## Expected result

| seller | gmv | share_pct | cumulative_share_pct | hhi |
| --- | --- | --- | --- | --- |
| Gadget Guru | 45300 | 71.5 | 71.5 | 5411 |
| Kala Crafts | 8900 | 14 | 85.5 | 5411 |
| Loom Story | 6000 | 9.5 | 95 | 5411 |
| Tea Trails | 2750 | 4.3 | 99.3 | 5411 |
| Spice Route | 450 | 0.7 | 100 | 5411 |

## Explanation

Concentration measures how dependent the platform is on its largest sellers. Gadget Guru alone brings 71.5% of GMV, and the top three bring 95%. The Herfindahl-Hirschman index sums the squared shares: 5,411 here, far above the 2,500 that competition authorities treat as highly concentrated, and a real business risk if that one seller leaves.

The cumulative share uses a running window ordered by GMV; the HHI is a window over all rows with no ordering, so every row shows the same value. Squaring the shares is what makes the index sensitive to one dominant seller: five equal sellers would give 2,000.

**Common mistake:** squaring the total of the shares instead of summing the squares. The total share is always 100%, so the "index" is the same for any marketplace and says nothing about concentration.

## Wrong answers

Feedback: incorrect-output

```sql
WITH sellers(seller, category, joined) AS ( VALUES ('Kala Crafts', 'Home', '2024-06-01'), ('Tea Trails', 'Food', '2024-08-15'), ('Gadget Guru', 'Electronics', '2024-03-10'), ('Loom Story', 'Fashion', '2024-11-20'), ('Spice Route', 'Food', '2025-01-05') ), orders(order_id, seller, buyer, ordered_on, gmv, status) AS ( VALUES (1, 'Kala Crafts', 'b1', '2025-03-01', 2400, 'delivered'), (2, 'Kala Crafts', 'b2', '2025-03-03', 1800, 'delivered'), (3, 'Tea Trails', 'b1', '2025-03-04', 900, 'delivered'), (4, 'Gadget Guru', 'b3', '2025-03-05', 12000, 'disputed'), (5, 'Gadget Guru', 'b4', '2025-03-06', 8500, 'delivered'), (6, 'Loom Story', 'b2', '2025-03-08', 3200, 'returned'), (7, 'Tea Trails', 'b5', '2025-03-09', 650, 'delivered'), (8, 'Gadget Guru', 'b1', '2025-03-12', 15000, 'delivered'), (9, 'Spice Route', 'b5', '2025-03-14', 450, 'delivered'), (10, 'Kala Crafts', 'b6', '2025-03-15', 2100, 'disputed'), (11, 'Loom Story', 'b7', '2025-03-18', 2800, 'delivered'), (12, 'Tea Trails', 'b2', '2025-03-20', 1200, 'delivered'), (13, 'Gadget Guru', 'b8', '2025-03-22', 9800, 'returned'), (14, 'Kala Crafts', 'b1', '2025-03-25', 2600, 'delivered') ), commission(category, take_rate_pct) AS ( VALUES ('Home', 12), ('Food', 8), ('Electronics', 5), ('Fashion', 15) ), per_seller AS (SELECT seller, SUM(gmv) AS gmv FROM orders GROUP BY seller), shares AS (SELECT seller, gmv, 100.0 * gmv / SUM(gmv) OVER () AS share FROM per_seller) SELECT seller, gmv, ROUND(share, 1) AS share_pct, ROUND(SUM(share) OVER (ORDER BY gmv DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 1) AS cumulative_share_pct, ROUND(SUM(share) OVER () * SUM(share) OVER () / COUNT(*) OVER ()) AS hhi FROM shares ORDER BY gmv DESC;
```
