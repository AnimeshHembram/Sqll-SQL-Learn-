---
id: da-day-093
title: Author scorecard, including authors with no sales
order: 93
difficulty: advanced
topic: Joins
summary: Chain LEFT JOINs without losing rows or counting a book twice.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - authors
  - books
  - order_items
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Keep every row through a chain of LEFT JOINs
  - Avoid fan-out when counting after a join
prerequisites:
  - Day 31
  - Day 47
---

## Task

Build a scorecard with **one row for every author**: `name`, `titles` (how many of their books we stock), `units_sold` and `revenue` from non-cancelled orders (revenue rounded to 2 decimal places). Authors with nothing sold show `0`, not `NULL`. Sort by `revenue` from highest to lowest, then `name`.

## Starter query

```sql
SELECT a.name, b.title
FROM authors AS a
LEFT JOIN books AS b ON b.author = a.name;
```

## Hints

1. Keep every author with `LEFT JOIN books`, then `LEFT JOIN order_items` so books without sales stay too.
2. Cancelled orders must not count, but a `WHERE o.status <> 'cancelled'` would remove authors with no orders. Put the condition in the join instead, for example `AND oi.order_id IN (SELECT id FROM orders WHERE status <> 'cancelled')`.
3. After joining order lines, one book appears once per line, so count titles with `COUNT(DISTINCT b.id)`, and wrap the sums in `COALESCE(..., 0)`.

## Solution

```sql
SELECT a.name,
  COUNT(DISTINCT b.id) AS titles,
  COALESCE(SUM(oi.quantity), 0) AS units_sold,
  ROUND(COALESCE(SUM(oi.quantity * oi.unit_price), 0), 2) AS revenue
FROM authors AS a
LEFT JOIN books AS b ON b.author = a.name
LEFT JOIN order_items AS oi
  ON oi.book_id = b.id
 AND oi.order_id IN (SELECT id FROM orders WHERE status <> 'cancelled')
GROUP BY a.name
ORDER BY revenue DESC, a.name;
```

## Expected result

| name | titles | units_sold | revenue |
| --- | --- | --- | --- |
| Tomas Varga | 1 | 3 | 46.5 |
| Mira Das | 2 | 2 | 30.99 |
| Priya Nair | 1 | 3 | 29.97 |
| Ana Ruiz | 1 | 1 | 14.75 |
| Ken Ito | 1 | 1 | 11.25 |
| Leo Brandt | 0 | 0 | 0 |

## Explanation

Three things can go wrong in a chain of joins, and this query avoids all of them:

- **Losing rows.** Leo Brandt has no books. `LEFT JOIN` keeps him, and the cancelled-order condition sits in `ON`, so it cannot remove him later.
- **Counting twice.** *Rivers of Glass* was sold in two orders, so after the join it appears on two rows. `COUNT(DISTINCT b.id)` still counts it as one title.
- **NULL totals.** `SUM` of no rows is `NULL`; `COALESCE` turns it into 0 so the scorecard reads cleanly.

Tomas Varga leads with 46.50 from one title. Mira Das has two titles but sold only one copy of each.

**Common mistake:** `COUNT(b.id)` instead of `COUNT(DISTINCT b.id)`. It counts order lines, not books, so Tomas Varga would appear to have two titles.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT a.name, COUNT(b.id) AS titles, COALESCE(SUM(oi.quantity), 0) AS units_sold, ROUND(COALESCE(SUM(oi.quantity * oi.unit_price), 0), 2) AS revenue FROM authors AS a LEFT JOIN books AS b ON b.author = a.name LEFT JOIN order_items AS oi ON oi.book_id = b.id AND oi.order_id IN (SELECT id FROM orders WHERE status <> 'cancelled') GROUP BY a.name ORDER BY revenue DESC, a.name;
```

Feedback: missing-rows

```sql
SELECT a.name, COUNT(DISTINCT b.id) AS titles, COALESCE(SUM(oi.quantity), 0) AS units_sold, ROUND(COALESCE(SUM(oi.quantity * oi.unit_price), 0), 2) AS revenue FROM authors AS a LEFT JOIN books AS b ON b.author = a.name LEFT JOIN order_items AS oi ON oi.book_id = b.id LEFT JOIN orders AS o ON o.id = oi.order_id WHERE o.status <> 'cancelled' GROUP BY a.name ORDER BY revenue DESC, a.name;
```
