---
id: da-day-098
title: Each customer's favourite genre, keeping ties
order: 98
difficulty: intermediate
topic: Subqueries and CTEs
summary: Break a question into CTE steps: units per customer and genre, the best per customer, then the matching rows.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - customers
  - orders
  - order_items
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Decompose a question into CTE steps
  - Keep ties by joining on a maximum
prerequisites:
  - Day 24
  - Day 59
---

## Task

For each customer, find the genre they bought **most copies** of in non-cancelled orders. If two genres tie, list both. Return `name`, `genre` and `units`. Sort by `name`, then `genre`.

Solve it in steps with CTEs; window functions are not needed.

## Starter query

```sql
SELECT c.name, b.genre, oi.quantity
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
JOIN order_items AS oi ON oi.order_id = o.id
JOIN books AS b ON b.id = oi.book_id;
```

## Hints

1. Step 1: a CTE `units` with one row per customer and genre: `SUM(oi.quantity)`, non-cancelled orders only.
2. Step 2: a CTE `best` with each customer's highest number: `SELECT customer_id, MAX(units) AS top_units FROM units GROUP BY customer_id`.
3. Step 3: join `units` to `best` on the customer and `u.units = b.top_units`, so every genre that reaches the maximum is kept.

## Solution

```sql
WITH units AS (
  SELECT o.customer_id, b.genre, SUM(oi.quantity) AS units
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  JOIN books AS b ON b.id = oi.book_id
  WHERE o.status <> 'cancelled'
  GROUP BY o.customer_id, b.genre
),
best AS (
  SELECT customer_id, MAX(units) AS top_units
  FROM units
  GROUP BY customer_id
)
SELECT c.name, u.genre, u.units
FROM units AS u
JOIN best AS bt ON bt.customer_id = u.customer_id AND u.units = bt.top_units
JOIN customers AS c ON c.id = u.customer_id
ORDER BY c.name, u.genre;
```

## Expected result

| name | genre | units |
| --- | --- | --- |
| Aisha Khan | Science | 2 |
| Daniel Kim | Fantasy | 2 |
| Rahul Mehta | Fantasy | 1 |
| Rahul Mehta | Science | 1 |

## Explanation

Each CTE answers one small question, and each can be run and checked on its own: what each customer bought per genre, what their maximum is, and which genres reach it. That is **query decomposition**: a long question becomes a few short, testable steps.

Joining on the maximum keeps ties naturally. Rahul Mehta bought one Fantasy and one Science book, so both are his favourite.

**Common mistakes:** taking one row per customer with `LIMIT 1` or `GROUP BY` alone, which drops Rahul's tie; and forgetting the cancelled filter, which adds Sofia Rossi with the Mystery book from her cancelled order.

## Other accepted answers

```sql
WITH units AS (
  SELECT o.customer_id, b.genre, SUM(oi.quantity) AS units,
    RANK() OVER (PARTITION BY o.customer_id ORDER BY SUM(oi.quantity) DESC) AS rnk
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  JOIN books AS b ON b.id = oi.book_id
  WHERE o.status <> 'cancelled'
  GROUP BY o.customer_id, b.genre
)
SELECT c.name, u.genre, u.units
FROM units AS u JOIN customers AS c ON c.id = u.customer_id
WHERE u.rnk = 1
ORDER BY c.name, u.genre;
```

## Wrong answers

Feedback: extra-rows

```sql
WITH units AS (SELECT o.customer_id, b.genre, SUM(oi.quantity) AS units FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id JOIN books AS b ON b.id = oi.book_id GROUP BY o.customer_id, b.genre), best AS (SELECT customer_id, MAX(units) AS top_units FROM units GROUP BY customer_id) SELECT c.name, u.genre, u.units FROM units AS u JOIN best AS bt ON bt.customer_id = u.customer_id AND u.units = bt.top_units JOIN customers AS c ON c.id = u.customer_id ORDER BY c.name, u.genre;
```
