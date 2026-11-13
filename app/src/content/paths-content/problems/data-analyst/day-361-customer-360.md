---
id: da-day-361
title: Case study: a customer 360 view
order: 361
difficulty: advanced
topic: Case studies
summary: Build one row per bookstore customer combining profile, orders, spend, favourite genre and recency.
module: data-analyst
duration: 16
dataset: bookstore
tables:
  - customers
  - orders
  - order_items
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Assemble a profile from several aggregates
  - Join pre-aggregated parts to avoid fan-out
prerequisites:
  - Day 60
  - Day 180
---

## Task

The final week returns to the bookstore. Build a **customer 360** with one row for **every customer**:

- `name`, `city` (`'unknown'` when missing) and `tenure_days` (days from `joined` to 2025-03-31; `NULL` if they join later),
- `orders` and `spent` (non-cancelled orders; 0 when none), `cancelled_orders`,
- `favourite_genre` (the genre with the most units in their non-cancelled orders; ties broken alphabetically; `NULL` if none),
- `days_since_last_order` (to 2025-03-31, from their latest non-cancelled order; `NULL` if none).

Round `spent` to 2 decimal places. Sort by `spent` from highest, then `name`.

## Starter query

```sql
SELECT id, name, city, joined
FROM customers
ORDER BY id;
```

## Hints

1. Compute each part in its own CTE grouped by customer (order totals, cancelled counts, favourite genre with `ROW_NUMBER()` over units per genre), then `LEFT JOIN` them all to `customers`.
2. Keep the status filter in each CTE: non-cancelled for spend, units and recency; cancelled for the cancelled count.
3. Tenure: `CASE WHEN joined <= '2025-03-31' THEN CAST(julianday('2025-03-31') - julianday(joined) AS INTEGER) END`.

## Solution

```sql
WITH order_totals AS (
  SELECT o.id, o.customer_id, o.order_date, o.status, SUM(oi.quantity * oi.unit_price) AS amount, SUM(oi.quantity) AS units
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  GROUP BY o.id, o.customer_id, o.order_date, o.status
),
spend AS (
  SELECT customer_id, COUNT(*) AS orders, SUM(amount) AS spent, MAX(order_date) AS last_order
  FROM order_totals WHERE status <> 'cancelled' GROUP BY customer_id
),
cancels AS (
  SELECT customer_id, COUNT(*) AS cancelled_orders FROM orders WHERE status = 'cancelled' GROUP BY customer_id
),
genres AS (
  SELECT o.customer_id, b.genre,
    ROW_NUMBER() OVER (PARTITION BY o.customer_id ORDER BY SUM(oi.quantity) DESC, b.genre) AS rnk
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  JOIN books AS b ON b.id = oi.book_id
  WHERE o.status <> 'cancelled'
  GROUP BY o.customer_id, b.genre
)
SELECT c.name, COALESCE(c.city, 'unknown') AS city,
  CASE WHEN c.joined <= '2025-03-31' THEN CAST(julianday('2025-03-31') - julianday(c.joined) AS INTEGER) END AS tenure_days,
  COALESCE(s.orders, 0) AS orders, ROUND(COALESCE(s.spent, 0), 2) AS spent, COALESCE(x.cancelled_orders, 0) AS cancelled_orders,
  g.genre AS favourite_genre,
  CAST(julianday('2025-03-31') - julianday(s.last_order) AS INTEGER) AS days_since_last_order
FROM customers AS c
LEFT JOIN spend AS s ON s.customer_id = c.id
LEFT JOIN cancels AS x ON x.customer_id = c.id
LEFT JOIN genres AS g ON g.customer_id = c.id AND g.rnk = 1
ORDER BY spent DESC, c.name;
```

## Expected result

| name | city | tenure_days | orders | spent | cancelled_orders | favourite_genre | days_since_last_order |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Aisha Khan | Bangalore | 441 | 2 | 62.22 | 0 | Science | 54 |
| Daniel Kim | Bangalore | 48 | 1 | 45.75 | 0 | Fantasy | 30 |
| Rahul Mehta | Mumbai | 394 | 2 | 25.49 | 0 | Fantasy | 22 |
| Meera Pillai | Chennai | NULL | 0 | 0 | 0 | NULL | NULL |
| Sofia Rossi | unknown | 315 | 0 | 0 | 1 | NULL | NULL |

## Explanation

A customer 360 assembles everything known about each customer into one row. Each part is computed in its own CTE at the customer level (spend, cancellations, favourite genre) and joined to `customers` with `LEFT JOIN`s, so nobody is lost and no join multiplies another part's rows.

The five bookstore customers show five different situations: Aisha is the best customer, Daniel is new but already the second-highest spender, Rahul buys small and often, Sofia's only order was cancelled, and Meera's join date is after the report date, so her tenure is `NULL` rather than negative. Favourite genres use units with an alphabetical tie-break: Aisha bought two copies of a Science title.

**Common mistake:** counting orders after joining orders to their lines. Each order is counted once per book in it, so Aisha appears to have placed four orders instead of two.

## Wrong answers

Feedback: incorrect-output

```sql
WITH spend AS (SELECT o.customer_id, COUNT(*) AS orders, SUM(oi.quantity * oi.unit_price) AS spent, MAX(o.order_date) AS last_order FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY o.customer_id), cancels AS (SELECT customer_id, COUNT(*) AS cancelled_orders FROM orders WHERE status = 'cancelled' GROUP BY customer_id), genres AS (SELECT o.customer_id, b.genre, ROW_NUMBER() OVER (PARTITION BY o.customer_id ORDER BY SUM(oi.quantity) DESC, b.genre) AS rnk FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id JOIN books AS b ON b.id = oi.book_id WHERE o.status <> 'cancelled' GROUP BY o.customer_id, b.genre) SELECT c.name, COALESCE(c.city, 'unknown') AS city, CASE WHEN c.joined <= '2025-03-31' THEN CAST(julianday('2025-03-31') - julianday(c.joined) AS INTEGER) END AS tenure_days, COALESCE(s.orders, 0) AS orders, ROUND(COALESCE(s.spent, 0), 2) AS spent, COALESCE(x.cancelled_orders, 0) AS cancelled_orders, g.genre AS favourite_genre, CAST(julianday('2025-03-31') - julianday(s.last_order) AS INTEGER) AS days_since_last_order FROM customers AS c LEFT JOIN spend AS s ON s.customer_id = c.id LEFT JOIN cancels AS x ON x.customer_id = c.id LEFT JOIN genres AS g ON g.customer_id = c.id AND g.rnk = 1 ORDER BY spent DESC, c.name;
```
