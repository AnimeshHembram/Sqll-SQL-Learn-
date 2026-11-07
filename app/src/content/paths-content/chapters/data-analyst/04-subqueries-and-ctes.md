---
id: subqueries-and-ctes
title: Subqueries and CTEs
module: data-analyst
order: 4
level: intermediate
duration: 35
summary: Break an analysis into steps by using the result of one query inside another, with subqueries and WITH (common table expressions).
objectives:
  - Compare each row with a value calculated from the whole table, using a scalar subquery
  - Filter with IN and a subquery
  - Name intermediate results with WITH, and build an analysis in readable steps
  - Choose between a join, a subquery and a CTE
---

Some questions need an answer **before** they can be asked. "Which books cost more than average?" needs the average first. "Which customers spend more than the typical customer?" needs every customer's spend first. A **subquery** is a query inside another query; a **CTE** (common table expression, written with `WITH`) is a subquery with a name, written before the main query.

## Why analysts use this

Real analysis happens in steps: calculate each customer's spend, then the average spend, then compare. Writing everything as one tangled query is hard to read and easy to get wrong. CTEs let you write those steps one after another, each with a clear name, and check each step on its own.

Analysts use them to:

- compare rows with a benchmark (above average, top 10 percent),
- filter by a list built from another table ("customers who bought fantasy"),
- build metrics on top of other metrics (spend per customer, then customers above a spend level).

## Syntax

```sql syntax
-- A scalar subquery returns one value
SELECT column FROM table_name WHERE column > (SELECT AVG(column) FROM table_name);

-- IN with a subquery returns a list
SELECT column FROM table_a WHERE key IN (SELECT key FROM table_b WHERE condition);

-- A CTE names a result, then the main query uses it like a table
WITH step_name AS (
  SELECT ...
)
SELECT ... FROM step_name;
```

- A subquery is always in brackets.
- A **scalar** subquery must return one value (one row, one column).
- Several CTEs are separated by commas: `WITH a AS (...), b AS (...) SELECT ...`. A later CTE can use an earlier one.
- A CTE exists only for the one statement that follows it.

## Examples

### Compare each row with the average

```sql
SELECT title, price
FROM books
WHERE price > (SELECT AVG(price) FROM books)
ORDER BY price DESC;
```

Expected output:

| title | price |
| --- | --- |
| The Last Signal | 18 |
| Rivers of Glass | 15.5 |
| A Quiet Ledger | 14.75 |

The subquery calculates the average price (about 13.75) once; the outer query keeps the books above it.

### Filter with a list from another table

Which customers have bought a fantasy book? The subquery builds the list of order ids that contain one:

```sql
SELECT DISTINCT c.name
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
WHERE o.id IN (
  SELECT oi.order_id
  FROM order_items AS oi
  JOIN books AS b ON oi.book_id = b.id
  WHERE b.genre = 'Fantasy'
)
ORDER BY c.name;
```

| name |
| --- |
| Aisha Khan |
| Daniel Kim |
| Rahul Mehta |

### Name a step with WITH

The same "spend per customer" calculation is useful in many analyses, so give it a name. The main query then reads like a sentence:

```sql
WITH customer_spend AS (
  SELECT o.customer_id, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS spend
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.customer_id
)
SELECT c.name, cs.spend
FROM customer_spend AS cs
JOIN customers AS c ON c.id = cs.customer_id
ORDER BY cs.spend DESC;
```

| name | spend |
| --- | --- |
| Aisha Khan | 62.22 |
| Daniel Kim | 45.75 |
| Rahul Mehta | 25.49 |

### Build on a step: customers above the average spend

A second CTE can use the first. Step 1 calculates each customer's spend; step 2 keeps customers above the average of step 1:

```sql
WITH customer_spend AS (
  SELECT o.customer_id, SUM(oi.quantity * oi.unit_price) AS spend
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.customer_id
),
above_average AS (
  SELECT customer_id, spend
  FROM customer_spend
  WHERE spend > (SELECT AVG(spend) FROM customer_spend)
)
SELECT c.name, ROUND(a.spend, 2) AS spend
FROM above_average AS a
JOIN customers AS c ON c.id = a.customer_id
ORDER BY spend DESC;
```

| name | spend |
| --- | --- |
| Aisha Khan | 62.22 |
| Daniel Kim | 45.75 |

Try running only the first step (`SELECT * FROM customer_spend` after its `WITH`) to check it before relying on it. Checking each step is the main advantage of writing an analysis this way.

### Share of the total

A CTE makes "each part as a percentage of the whole" easy: one step for the parts, one value for the total.

```sql
WITH genre_units AS (
  SELECT b.genre, SUM(oi.quantity) AS units
  FROM order_items AS oi
  JOIN books AS b ON oi.book_id = b.id
  GROUP BY b.genre
)
SELECT genre, units,
  ROUND(100.0 * units / (SELECT SUM(units) FROM genre_units), 1) AS pct_of_units
FROM genre_units
ORDER BY units DESC, genre;
```

| genre | units | pct_of_units |
| --- | --- | --- |
| Fantasy | 4 | 36.4 |
| Mystery | 3 | 27.3 |
| Science | 3 | 27.3 |
| Science fiction | 1 | 9.1 |

`100.0` (with a decimal point) makes SQLite divide as decimals. With `100`, integer division would round every share down.

## How the query runs

For "customers above the average spend":

1. `customer_spend` runs first: one row per customer with their total spend, cancelled orders excluded.
2. `above_average` reads `customer_spend`. Its subquery calculates the average spend over those rows (about 44.49), and the `WHERE` keeps the customers above it.
3. The main query joins the result to `customers` for the names and sorts it.

## Common mistakes

**Integer division.** `units / total` with two whole numbers is whole-number division in SQLite:

```sql
SELECT 3 / 10 AS integer_division, 3.0 / 10 AS decimal_division;
```

| integer_division | decimal_division |
| --- | --- |
| 0 | 0.3 |

Multiply by `100.0` or `1.0` first.

**A "scalar" subquery that returns several rows.** Most databases stop with an error. SQLite silently uses the first row, which hides the mistake:

```sql
SELECT title FROM books WHERE price = (SELECT price FROM books WHERE genre = 'Fantasy');
```

| title |
| --- |
| Rivers of Glass |

There are two fantasy books, but only one price was used. Use `IN` when the subquery can return several rows.

**A CTE without a main query.** `WITH` only names a step; a statement must end with the query that uses it:

```sql error
WITH cheap AS (SELECT * FROM books WHERE price < 12);
```

**Nesting instead of naming.** Subqueries inside subqueries quickly become unreadable. When a query has more than one step, write each step as a CTE.

## Key takeaways

- A subquery is a query in brackets inside another query. A scalar subquery returns one value; `IN (subquery)` uses a list.
- `WITH name AS (...)` names a step; later steps and the main query use it like a table.
- Build an analysis in small steps you can check one at a time.
- Use `100.0 * part / total` for percentages, to avoid integer division.
- Use a join when you need columns from both tables, `IN` or `EXISTS` when you only filter, and CTEs to keep multi-step logic readable.
