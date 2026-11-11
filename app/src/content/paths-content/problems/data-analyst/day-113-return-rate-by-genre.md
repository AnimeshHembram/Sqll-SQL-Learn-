---
id: da-day-113
title: Return rate by genre
order: 113
difficulty: intermediate
topic: Business analysis
summary: Aggregate returns to the order-line grain before joining, so sales are not counted twice.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - order_items
  - orders
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Match grains before joining two fact tables
  - Calculate a rate with zero-filled counts
prerequisites:
  - Day 93
  - Day 55
---

## Task

Returns are logged in the starter query, sometimes with **several rows for one order line** (one per returned copy). For every genre with non-cancelled sales, return `genre`, `units_sold`, `units_returned` and `return_pct` (returned units as a percentage of units sold, rounded to 1 decimal place). Returns against cancelled orders are ignored. Sort by `return_pct` from highest to lowest, then `genre`.

## Starter query

```sql
WITH returns(order_id, book_id, quantity, reason) AS (
  VALUES
    (5, 2, 1, 'damaged'), (5, 2, 1, 'arrived late'),
    (1, 3, 1, 'wrong item'), (6, 3, 1, 'changed mind'),
    (3, 5, 1, 'damaged'),
    (4, 1, 1, 'refund for cancelled order')
)
SELECT order_id, book_id, quantity, reason
FROM returns;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Add up the returns per order line first: `SELECT order_id, book_id, SUM(quantity) AS returned FROM returns GROUP BY order_id, book_id`.
3. Then start from the non-cancelled order lines, join `books` for the genre, `LEFT JOIN` the per-line returns on both `order_id` and `book_id`, and use `COALESCE(r.returned, 0)`.

## Solution

```sql
WITH returns(order_id, book_id, quantity, reason) AS (
  VALUES
    (5, 2, 1, 'damaged'), (5, 2, 1, 'arrived late'),
    (1, 3, 1, 'wrong item'), (6, 3, 1, 'changed mind'),
    (3, 5, 1, 'damaged'),
    (4, 1, 1, 'refund for cancelled order')
),
line_returns AS (
  SELECT order_id, book_id, SUM(quantity) AS returned
  FROM returns
  GROUP BY order_id, book_id
),
lines AS (
  SELECT b.genre, oi.quantity, COALESCE(r.returned, 0) AS returned
  FROM order_items AS oi
  JOIN orders AS o ON o.id = oi.order_id AND o.status <> 'cancelled'
  JOIN books AS b ON b.id = oi.book_id
  LEFT JOIN line_returns AS r ON r.order_id = oi.order_id AND r.book_id = oi.book_id
)
SELECT genre,
  SUM(quantity) AS units_sold,
  SUM(returned) AS units_returned,
  ROUND(100.0 * SUM(returned) / SUM(quantity), 1) AS return_pct
FROM lines
GROUP BY genre
ORDER BY return_pct DESC, genre;
```

## Expected result

| genre | units_sold | units_returned | return_pct |
| --- | --- | --- | --- |
| Fantasy | 4 | 3 | 75 |
| Science | 3 | 2 | 66.7 |
| Mystery | 2 | 0 | 0 |
| Science fiction | 1 | 0 | 0 |

## Explanation

Order 5's two copies of *Rivers of Glass* were both returned, logged as two rows. Joining those rows straight onto the order line would repeat the line, and the two copies sold would be counted four times. Aggregating returns to **one row per order line** first matches the grain of `order_items`, so the join cannot multiply anything.

Fantasy has the highest return rate, 3 of 4 copies. The return against cancelled order 4 is ignored because only non-cancelled lines are the starting point.

**Common mistake:** joining raw returns, which inflates `units_sold` for any line with more than one return row.

## Wrong answers

Feedback: incorrect-output

```sql
WITH returns(order_id, book_id, quantity, reason) AS ( VALUES (5, 2, 1, 'damaged'), (5, 2, 1, 'arrived late'), (1, 3, 1, 'wrong item'), (6, 3, 1, 'changed mind'), (3, 5, 1, 'damaged'), (4, 1, 1, 'refund for cancelled order') ), lines AS (SELECT b.genre, oi.quantity, COALESCE(r.quantity, 0) AS returned FROM order_items AS oi JOIN orders AS o ON o.id = oi.order_id AND o.status <> 'cancelled' JOIN books AS b ON b.id = oi.book_id LEFT JOIN returns AS r ON r.order_id = oi.order_id AND r.book_id = oi.book_id) SELECT genre, SUM(quantity) AS units_sold, SUM(returned) AS units_returned, ROUND(100.0 * SUM(returned) / SUM(quantity), 1) AS return_pct FROM lines GROUP BY genre ORDER BY return_pct DESC, genre;
```
