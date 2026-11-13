---
id: da-day-231
title: On time in full, by customer
order: 231
difficulty: intermediate
topic: Operations
summary: Score orders on time and in full across all their lines, then report OTIF rates per customer.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Score orders across their lines
  - Report OTIF
prerequisites:
  - Day 147
  - Day 35
---

## Task

An order (starter query) is **on time** when every line was delivered on or before its promised date, and **in full** when every line delivered at least the quantity ordered. An undelivered line (`delivered` is `NULL`) is neither. An order is **OTIF** when it is both.

For each customer, return `customer`, `orders`, `on_time_pct`, `in_full_pct` and `otif_pct` (percentages of their orders, rounded to 1 decimal place). Sort by `otif_pct` from highest, then `customer`.

## Starter query

```sql
WITH order_lines(order_id, customer, promised, delivered, qty_ordered, qty_delivered) AS (
  VALUES
    (1, 'Acme', '2025-03-03', '2025-03-03', 10, 10), (1, 'Acme', '2025-03-03', '2025-03-03', 5, 5),
    (2, 'Acme', '2025-03-05', '2025-03-06', 8, 8),
    (3, 'Acme', '2025-03-07', '2025-03-07', 6, 4),
    (4, 'Bolt', '2025-03-04', '2025-03-02', 12, 12),
    (5, 'Bolt', '2025-03-06', '2025-03-06', 3, 3), (5, 'Bolt', '2025-03-06', '2025-03-08', 2, 2),
    (6, 'Crest', '2025-03-05', NULL, 9, 0), (7, 'Crest', '2025-03-05', '2025-03-05', 4, 5)
)
SELECT order_id, customer, promised, delivered, qty_ordered, qty_delivered
FROM order_lines
ORDER BY order_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Score each **order** first: `MIN(CASE WHEN delivered IS NOT NULL AND delivered <= promised THEN 1 ELSE 0 END)` is 1 only when every line was on time. Do the same for in full with `qty_delivered >= qty_ordered`.
3. Then group the orders by customer: `100.0 * SUM(on_time) / COUNT(*)`, and OTIF is `SUM(on_time * in_full)`.

## Solution

```sql
WITH order_lines(order_id, customer, promised, delivered, qty_ordered, qty_delivered) AS (
  VALUES
    (1, 'Acme', '2025-03-03', '2025-03-03', 10, 10), (1, 'Acme', '2025-03-03', '2025-03-03', 5, 5),
    (2, 'Acme', '2025-03-05', '2025-03-06', 8, 8),
    (3, 'Acme', '2025-03-07', '2025-03-07', 6, 4),
    (4, 'Bolt', '2025-03-04', '2025-03-02', 12, 12),
    (5, 'Bolt', '2025-03-06', '2025-03-06', 3, 3), (5, 'Bolt', '2025-03-06', '2025-03-08', 2, 2),
    (6, 'Crest', '2025-03-05', NULL, 9, 0), (7, 'Crest', '2025-03-05', '2025-03-05', 4, 5)
),
scored AS (
  SELECT order_id, customer,
    MIN(CASE WHEN delivered IS NOT NULL AND delivered <= promised THEN 1 ELSE 0 END) AS on_time,
    MIN(CASE WHEN qty_delivered >= qty_ordered THEN 1 ELSE 0 END) AS in_full
  FROM order_lines
  GROUP BY order_id, customer
)
SELECT customer, COUNT(*) AS orders,
  ROUND(100.0 * SUM(on_time) / COUNT(*), 1) AS on_time_pct,
  ROUND(100.0 * SUM(in_full) / COUNT(*), 1) AS in_full_pct,
  ROUND(100.0 * SUM(on_time * in_full) / COUNT(*), 1) AS otif_pct
FROM scored
GROUP BY customer
ORDER BY otif_pct DESC, customer;
```

## Expected result

| customer | orders | on_time_pct | in_full_pct | otif_pct |
| --- | --- | --- | --- | --- |
| Bolt | 2 | 50 | 100 | 50 |
| Crest | 2 | 50 | 50 | 50 |
| Acme | 3 | 66.7 | 66.7 | 33.3 |

## Explanation

OTIF is an order-level measure built from line-level facts. An order is on time only if **every** line is, so `MIN(...)` of a 1/0 flag over its lines works as "all lines pass". Order 5 from Bolt delivered one line on time and one two days late, so the order is late; Acme's order 3 arrived on time but 2 units short, so it is not in full.

Rates then divide by orders, not lines. Bolt was always in full (100%) but late half the time; Acme's late order and its short order are different orders, so only 1 of 3 Acme orders was OTIF (33.3%). Crest's undelivered order fails both tests, and its over-delivery (5 for 4) still counts as in full.

**Common mistake:** computing rates over lines. Multi-line orders weigh more than single-line ones, Bolt's half-late order counts as half on time, and an undelivered line compares `NULL` and drops out of the sums.

## Wrong answers

Feedback: incorrect-output

```sql
WITH order_lines(order_id, customer, promised, delivered, qty_ordered, qty_delivered) AS ( VALUES (1, 'Acme', '2025-03-03', '2025-03-03', 10, 10), (1, 'Acme', '2025-03-03', '2025-03-03', 5, 5), (2, 'Acme', '2025-03-05', '2025-03-06', 8, 8), (3, 'Acme', '2025-03-07', '2025-03-07', 6, 4), (4, 'Bolt', '2025-03-04', '2025-03-02', 12, 12), (5, 'Bolt', '2025-03-06', '2025-03-06', 3, 3), (5, 'Bolt', '2025-03-06', '2025-03-08', 2, 2), (6, 'Crest', '2025-03-05', NULL, 9, 0), (7, 'Crest', '2025-03-05', '2025-03-05', 4, 5) ) SELECT customer, COUNT(DISTINCT order_id) AS orders, ROUND(100.0 * SUM(delivered <= promised) / COUNT(*), 1) AS on_time_pct, ROUND(100.0 * SUM(qty_delivered >= qty_ordered) / COUNT(*), 1) AS in_full_pct, ROUND(100.0 * SUM(delivered <= promised AND qty_delivered >= qty_ordered) / COUNT(*), 1) AS otif_pct FROM order_lines GROUP BY customer ORDER BY otif_pct DESC, customer;
```
