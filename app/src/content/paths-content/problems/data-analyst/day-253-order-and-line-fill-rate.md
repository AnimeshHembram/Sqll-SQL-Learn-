---
id: da-day-253
title: Unit, line and order fill rates
order: 253
difficulty: intermediate
topic: Supply chain
summary: Measure fulfilment three ways and see why the order fill rate is always the harshest.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: false
checkColumnNames: true
objectives:
  - Measure fulfilment at several levels
  - Combine one-row summaries
prerequisites:
  - Day 231
  - Day 54
---

## Task

Warehouse shipments against orders are in the starter query. Report three fill rates in one row:

- `unit_fill_pct`: units shipped ÷ units ordered,
- `line_fill_pct`: lines shipped complete ÷ all lines,
- `order_fill_pct`: orders with **every** line shipped complete ÷ all orders.

Also return `orders` and `lines`. Round the rates to 1 decimal place.

## Starter query

```sql
WITH order_lines(order_id, sku, ordered, shipped) AS (
  VALUES
    (1, 'A', 10, 10), (1, 'B', 5, 5), (1, 'C', 2, 2),
    (2, 'A', 20, 15), (2, 'D', 4, 4),
    (3, 'B', 8, 8),
    (4, 'C', 6, 0), (4, 'A', 3, 3), (4, 'E', 1, 1), (4, 'B', 2, 2),
    (5, 'D', 12, 12)
)
SELECT order_id, sku, ordered, shipped
FROM order_lines
ORDER BY order_id, sku;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Units and lines come straight from the lines: `SUM(shipped) / SUM(ordered)` and `SUM(shipped >= ordered) / COUNT(*)` (with `100.0 *`).
3. Orders need a step first: in a CTE grouped by order, `MIN(shipped >= ordered)` is 1 only when every line was complete. Combine both levels in one `SELECT` with scalar subqueries or a join of two one-row CTEs.

## Solution

```sql
WITH order_lines(order_id, sku, ordered, shipped) AS (
  VALUES
    (1, 'A', 10, 10), (1, 'B', 5, 5), (1, 'C', 2, 2),
    (2, 'A', 20, 15), (2, 'D', 4, 4),
    (3, 'B', 8, 8),
    (4, 'C', 6, 0), (4, 'A', 3, 3), (4, 'E', 1, 1), (4, 'B', 2, 2),
    (5, 'D', 12, 12)
),
lines AS (
  SELECT COUNT(*) AS lines, SUM(shipped) AS shipped, SUM(ordered) AS ordered, SUM(shipped >= ordered) AS complete_lines FROM order_lines
),
orders AS (
  SELECT COUNT(*) AS orders, SUM(complete) AS complete_orders
  FROM (SELECT order_id, MIN(shipped >= ordered) AS complete FROM order_lines GROUP BY order_id)
)
SELECT o.orders, l.lines,
  ROUND(100.0 * l.shipped / l.ordered, 1) AS unit_fill_pct,
  ROUND(100.0 * l.complete_lines / l.lines, 1) AS line_fill_pct,
  ROUND(100.0 * o.complete_orders / o.orders, 1) AS order_fill_pct
FROM lines AS l, orders AS o;
```

## Expected result

| orders | lines | unit_fill_pct | line_fill_pct | order_fill_pct |
| --- | --- | --- | --- | --- |
| 5 | 11 | 84.9 | 81.8 | 60 |

## Explanation

The three fill rates measure the same shipments at different levels, and each is harsher than the last. By units, 84.9% of what was ordered shipped. By lines, 81.8% of lines were complete. By orders, only 60% of customers got everything they asked for, because one short line spoils the whole order: order 4 shipped three of its four lines in full, yet counts as a failure.

Customers experience the order fill rate, while warehouses often report the unit fill rate because it looks best. The query needs an order-level step (`MIN(shipped >= ordered)` per order) before the order rate can be computed; the line and unit rates come straight from the lines.

**Common mistake:** using the line rate as the order rate. It ignores that an order with one short line is still incomplete, and reports 81.8% where customers saw 60%.

## Wrong answers

Feedback: incorrect-output

```sql
WITH order_lines(order_id, sku, ordered, shipped) AS ( VALUES (1, 'A', 10, 10), (1, 'B', 5, 5), (1, 'C', 2, 2), (2, 'A', 20, 15), (2, 'D', 4, 4), (3, 'B', 8, 8), (4, 'C', 6, 0), (4, 'A', 3, 3), (4, 'E', 1, 1), (4, 'B', 2, 2), (5, 'D', 12, 12) ) SELECT COUNT(DISTINCT order_id) AS orders, COUNT(*) AS lines, ROUND(100.0 * SUM(shipped) / SUM(ordered), 1) AS unit_fill_pct, ROUND(100.0 * SUM(shipped >= ordered) / COUNT(*), 1) AS line_fill_pct, ROUND(100.0 * SUM(shipped >= ordered) / COUNT(*), 1) AS order_fill_pct FROM order_lines;
```
