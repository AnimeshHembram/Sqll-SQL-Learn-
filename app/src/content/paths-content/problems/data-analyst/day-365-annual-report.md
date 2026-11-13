---
id: da-day-365
title: Case study: Day 365, the annual report in one query
order: 365
difficulty: advanced
topic: Case studies
summary: Finish the year with one query that reports the bookstore's headline numbers as a labelled list.
module: data-analyst
duration: 18
dataset: bookstore
tables:
  - books
  - authors
  - customers
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Assemble a report from many one-row figures
  - Format numbers as labelled text
prerequisites:
  - Day 89
  - Day 361
---

## Task

Day 365. Write the bookstore's annual report as **one query** returning a labelled list of headline figures, using non-cancelled orders unless stated. Return `section`, `metric` and `value` (as text), in this order:

1. `Sales` / `revenue`: total revenue, rounded to 2 decimal places,
2. `Sales` / `orders`: number of orders,
3. `Sales` / `average order value`: revenue ÷ orders, rounded to 2 decimal places,
4. `Sales` / `cancellation rate`: cancelled orders ÷ all orders × 100, rounded to 1 decimal place, followed by `'%'`,
5. `Customers` / `buyers`: customers with at least one order,
6. `Customers` / `repeat buyers`: customers with two or more orders,
7. `Catalogue` / `best-selling book`: the title with the most units (ties alphabetical),
8. `Catalogue` / `top author by revenue`: the author with the highest revenue (ties alphabetical),
9. `Catalogue` / `top genre share`: the genre with the highest revenue and its share, as `'Fantasy (43.3%)'` style text.

## Starter query

```sql
SELECT o.id, o.customer_id, o.status, b.title, b.author, b.genre, oi.quantity, oi.unit_price
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
JOIN books AS b ON b.id = oi.book_id
ORDER BY o.id;
```

## Hints

1. Build one CTE of non-cancelled order lines with title, author and genre, and compute each figure as a one-row `SELECT`.
2. Stack the nine figures with `UNION ALL` and a sort number, casting numbers to text (`CAST(x AS TEXT)` or `printf('%.2f', x)`) so that `value` has one type.
3. Top items: `ORDER BY SUM(...) DESC, name LIMIT 1` inside a scalar subquery. The genre label: `genre || ' (' || printf('%.1f', share) || '%)'`.

## Solution

```sql
WITH lines AS (
  SELECT o.id AS order_id, o.customer_id, b.title, b.author, b.genre, oi.quantity, oi.quantity * oi.unit_price AS amount
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  JOIN books AS b ON b.id = oi.book_id
  WHERE o.status <> 'cancelled'
),
report AS (
  SELECT 1 AS n, 'Sales' AS section, 'revenue' AS metric, printf('%.2f', (SELECT SUM(amount) FROM lines)) AS value
  UNION ALL SELECT 2, 'Sales', 'orders', CAST((SELECT COUNT(DISTINCT order_id) FROM lines) AS TEXT)
  UNION ALL SELECT 3, 'Sales', 'average order value', printf('%.2f', (SELECT SUM(amount) / COUNT(DISTINCT order_id) FROM lines))
  UNION ALL SELECT 4, 'Sales', 'cancellation rate', printf('%.1f', (SELECT 100.0 * SUM(status = 'cancelled') / COUNT(*) FROM orders)) || '%'
  UNION ALL SELECT 5, 'Customers', 'buyers', CAST((SELECT COUNT(DISTINCT customer_id) FROM lines) AS TEXT)
  UNION ALL SELECT 6, 'Customers', 'repeat buyers',
    CAST((SELECT COUNT(*) FROM (SELECT customer_id FROM lines GROUP BY customer_id HAVING COUNT(DISTINCT order_id) >= 2)) AS TEXT)
  UNION ALL SELECT 7, 'Catalogue', 'best-selling book', (SELECT title FROM lines GROUP BY title ORDER BY SUM(quantity) DESC, title LIMIT 1)
  UNION ALL SELECT 8, 'Catalogue', 'top author by revenue', (SELECT author FROM lines GROUP BY author ORDER BY SUM(amount) DESC, author LIMIT 1)
  UNION ALL SELECT 9, 'Catalogue', 'top genre share',
    (SELECT genre || ' (' || printf('%.1f', 100.0 * SUM(amount) / (SELECT SUM(amount) FROM lines)) || '%)'
     FROM lines GROUP BY genre ORDER BY SUM(amount) DESC, genre LIMIT 1)
)
SELECT section, metric, value
FROM report
ORDER BY n;
```

## Expected result

| section | metric | value |
| --- | --- | --- |
| Sales | revenue | 133.46 |
| Sales | orders | 5 |
| Sales | average order value | 26.69 |
| Sales | cancellation rate | 16.7% |
| Customers | buyers | 3 |
| Customers | repeat buyers | 2 |
| Catalogue | best-selling book | Counting Stars |
| Catalogue | top author by revenue | Tomas Varga |
| Catalogue | top genre share | Fantasy (43.3%) |

## Explanation

Day 365 brings a year of SQL together in one query: a CTE of clean order lines, one-row aggregates for each figure, scalar subqueries with `ORDER BY ... LIMIT 1` for the "top" items, and `UNION ALL` with a sort number to lay out the report. Converting every value to text gives the column one type, so numbers and names can share it.

The bookstore's year: 133.46 of revenue from five orders, an average of 26.69, one order in six cancelled, three buyers of whom two came back, Counting Stars as the best seller, Tomas Varga as the top author and Fantasy as the leading genre with 43.3% of revenue. Every one of those figures can be traced back to an earlier day's technique, which is the real result of the path.

**Common mistake:** counting order lines as orders, or including cancelled orders. Lines inflate the order count to 9 and shrink the average order value, and the cancelled order adds revenue the bookstore never kept.

## Wrong answers

Feedback: incorrect-output

```sql
WITH lines AS (SELECT o.id AS order_id, o.customer_id, o.status, b.title, b.author, b.genre, oi.quantity, oi.quantity * oi.unit_price AS amount FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id JOIN books AS b ON b.id = oi.book_id), report AS (SELECT 1 AS n, 'Sales' AS section, 'revenue' AS metric, printf('%.2f', (SELECT SUM(amount) FROM lines)) AS value UNION ALL SELECT 2, 'Sales', 'orders', CAST((SELECT COUNT(*) FROM lines) AS TEXT) UNION ALL SELECT 3, 'Sales', 'average order value', printf('%.2f', (SELECT AVG(amount) FROM lines)) UNION ALL SELECT 4, 'Sales', 'cancellation rate', printf('%.1f', (SELECT 100.0 * SUM(status = 'cancelled') / COUNT(*) FROM orders)) || '%' UNION ALL SELECT 5, 'Customers', 'buyers', CAST((SELECT COUNT(DISTINCT customer_id) FROM lines) AS TEXT) UNION ALL SELECT 6, 'Customers', 'repeat buyers', CAST((SELECT COUNT(*) FROM (SELECT customer_id FROM lines GROUP BY customer_id HAVING COUNT(DISTINCT order_id) >= 2)) AS TEXT) UNION ALL SELECT 7, 'Catalogue', 'best-selling book', (SELECT title FROM lines GROUP BY title ORDER BY SUM(quantity) DESC, title LIMIT 1) UNION ALL SELECT 8, 'Catalogue', 'top author by revenue', (SELECT author FROM lines GROUP BY author ORDER BY SUM(amount) DESC, author LIMIT 1) UNION ALL SELECT 9, 'Catalogue', 'top genre share', (SELECT genre || ' (' || printf('%.1f', 100.0 * SUM(amount) / (SELECT SUM(amount) FROM lines)) || '%)' FROM lines GROUP BY genre ORDER BY SUM(amount) DESC, genre LIMIT 1)) SELECT section, metric, value FROM report ORDER BY n;
```
