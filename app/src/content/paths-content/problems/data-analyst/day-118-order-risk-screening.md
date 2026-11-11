---
id: da-day-118
title: Case study: screen orders with risk rules
order: 118
difficulty: advanced
topic: Case studies
summary: Apply several window-based rules and list the reasons each order was flagged.
module: data-analyst
duration: 18
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute rule features with window functions
  - Combine several flags into a readable reason list
prerequisites:
  - Day 85
  - Day 107
---

## Task

The payments team screens web orders (in the starter query) with three rules:

1. **big amount**: the amount is more than 3 times the average of the customer's **other** orders (a customer's only order is never flagged by this rule),
2. **card abroad**: the card's country differs from the shipping country,
3. **rapid repeat**: it is the customer's third or later order within 24 hours (counting this order and any placed up to 24 hours before it).

Return only the flagged orders: `id`, `customer` and `reasons`, the names of the rules it broke, in the order above, separated by `', '` (for example `'big amount, rapid repeat'`). Sort by `id`.

## Starter query

```sql
WITH web_orders(id, customer, placed_at, amount, ship_country, card_country) AS (
  VALUES
    (1, 'c1', '2025-03-01 10:00', 25.00, 'IN', 'IN'),
    (2, 'c1', '2025-03-03 12:00', 30.00, 'IN', 'IN'),
    (3, 'c1', '2025-03-05 09:00', 120.00, 'IN', 'IN'),
    (4, 'c1', '2025-03-09 18:00', 20.00, 'IN', 'IN'),
    (5, 'c2', '2025-03-02 08:00', 40.00, 'IN', 'US'),
    (6, 'c2', '2025-03-02 09:30', 35.00, 'IN', 'IN'),
    (7, 'c2', '2025-03-02 20:00', 38.00, 'IN', 'IN'),
    (8, 'c2', '2025-03-03 07:00', 150.00, 'IN', 'IN'),
    (9, 'c3', '2025-03-04 11:00', 60.00, 'GB', 'GB'),
    (10, 'c4', '2025-03-06 10:00', 90.00, 'AE', 'IN')
)
SELECT id, customer, placed_at, amount, ship_country, card_country
FROM web_orders
ORDER BY id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Calculate each rule's ingredients in a CTE with window functions over `PARTITION BY customer`.
2. Average of the other orders: `(SUM(amount) OVER w - amount) / (COUNT(*) OVER w - 1)`; for a single order this divides by zero and gives `NULL`, so the rule is not met. Orders in the last 24 hours: `COUNT(*) OVER (PARTITION BY customer ORDER BY unixepoch(placed_at) RANGE BETWEEN 86400 PRECEDING AND CURRENT ROW)`.
3. Build the text by joining pieces that start with `', '`, then remove the first two characters: `substr(CASE WHEN ... THEN ', big amount' ELSE '' END || CASE ... END || CASE ... END, 3)`. Keep only rows where it is not empty.

## Solution

```sql
WITH web_orders(id, customer, placed_at, amount, ship_country, card_country) AS (
  VALUES
    (1, 'c1', '2025-03-01 10:00', 25.00, 'IN', 'IN'),
    (2, 'c1', '2025-03-03 12:00', 30.00, 'IN', 'IN'),
    (3, 'c1', '2025-03-05 09:00', 120.00, 'IN', 'IN'),
    (4, 'c1', '2025-03-09 18:00', 20.00, 'IN', 'IN'),
    (5, 'c2', '2025-03-02 08:00', 40.00, 'IN', 'US'),
    (6, 'c2', '2025-03-02 09:30', 35.00, 'IN', 'IN'),
    (7, 'c2', '2025-03-02 20:00', 38.00, 'IN', 'IN'),
    (8, 'c2', '2025-03-03 07:00', 150.00, 'IN', 'IN'),
    (9, 'c3', '2025-03-04 11:00', 60.00, 'GB', 'GB'),
    (10, 'c4', '2025-03-06 10:00', 90.00, 'AE', 'IN')
),
features AS (
  SELECT id, customer, amount, ship_country, card_country,
    (SUM(amount) OVER (PARTITION BY customer) - amount)
      / (COUNT(*) OVER (PARTITION BY customer) - 1) AS others_avg,
    COUNT(*) OVER (
      PARTITION BY customer ORDER BY unixepoch(placed_at)
      RANGE BETWEEN 86400 PRECEDING AND CURRENT ROW
    ) AS orders_24h
  FROM web_orders
),
flags AS (
  SELECT id, customer,
    substr(
      CASE WHEN amount > 3 * others_avg THEN ', big amount' ELSE '' END ||
      CASE WHEN card_country <> ship_country THEN ', card abroad' ELSE '' END ||
      CASE WHEN orders_24h >= 3 THEN ', rapid repeat' ELSE '' END,
      3) AS reasons
  FROM features
)
SELECT id, customer, reasons
FROM flags
WHERE reasons <> ''
ORDER BY id;
```

## Expected result

| id | customer | reasons |
| --- | --- | --- |
| 3 | c1 | big amount |
| 5 | c2 | card abroad |
| 7 | c2 | rapid repeat |
| 8 | c2 | big amount, rapid repeat |
| 10 | c4 | card abroad |

## Explanation

Rule engines in SQL usually follow this shape: one CTE computes every **feature** a rule needs, a second turns features into flags, and the final step keeps the flagged rows. Each rule can then be tested on its own.

Order 8 breaks two rules: c2's other orders average 37.67, and 150 is almost four times that; it is also c2's fourth order in 24 hours. c3 has a single order, so "the average of the other orders" does not exist: dividing by zero gives `NULL`, the comparison is not true, and the order is correctly not flagged.

**Common mistake:** comparing with the customer's average **including** the order itself. A large order raises its own benchmark, and order 3 would no longer look unusual.

## Wrong answers

Feedback: incorrect-output

```sql
WITH web_orders(id, customer, placed_at, amount, ship_country, card_country) AS ( VALUES (1, 'c1', '2025-03-01 10:00', 25.00, 'IN', 'IN'), (2, 'c1', '2025-03-03 12:00', 30.00, 'IN', 'IN'), (3, 'c1', '2025-03-05 09:00', 120.00, 'IN', 'IN'), (4, 'c1', '2025-03-09 18:00', 20.00, 'IN', 'IN'), (5, 'c2', '2025-03-02 08:00', 40.00, 'IN', 'US'), (6, 'c2', '2025-03-02 09:30', 35.00, 'IN', 'IN'), (7, 'c2', '2025-03-02 20:00', 38.00, 'IN', 'IN'), (8, 'c2', '2025-03-03 07:00', 150.00, 'IN', 'IN'), (9, 'c3', '2025-03-04 11:00', 60.00, 'GB', 'GB'), (10, 'c4', '2025-03-06 10:00', 90.00, 'AE', 'IN') ), features AS (SELECT id, customer, amount, ship_country, card_country, AVG(amount) OVER (PARTITION BY customer) AS others_avg, COUNT(*) OVER (PARTITION BY customer ORDER BY unixepoch(placed_at) RANGE BETWEEN 86400 PRECEDING AND CURRENT ROW) AS orders_24h FROM web_orders), flags AS (SELECT id, customer, substr(CASE WHEN amount > 3 * others_avg THEN ', big amount' ELSE '' END || CASE WHEN card_country <> ship_country THEN ', card abroad' ELSE '' END || CASE WHEN orders_24h >= 3 THEN ', rapid repeat' ELSE '' END, 3) AS reasons FROM features) SELECT id, customer, reasons FROM flags WHERE reasons <> '' ORDER BY id;
```
