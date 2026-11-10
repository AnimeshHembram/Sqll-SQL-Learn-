---
id: query-review
title: Reviewing an analysis query
module: data-analyst
order: 13
level: advanced
duration: 45
summary: Read a query critically, find the mistakes that make its numbers wrong, and explain what it does in plain words.
objectives:
  - Read a query in the order SQLite runs it and state the grain of each step
  - Spot the most common silent errors, such as join fan-out, misplaced filters and integer division
  - Check a result with a quick sanity query against a number you already trust
  - Explain a query's logic and limits in plain words for someone who does not read SQL
---

The most dangerous query is not one that fails: an error message is easy to notice. The dangerous query runs, returns a plausible number and is wrong. This chapter brings the whole path together: you will review queries the way an experienced analyst reviews a colleague's work, or their own before sending it.

## Why analysts use this

A number that goes to a manager or a client becomes a decision. Reviewing the query behind it is part of the job, and teams often require a second person to review important analyses. A reviewer does not rewrite the query from scratch; they read it, ask what each step produces, and test the parts that could be wrong.

A short review checklist:

1. **Grain.** What does one row mean after each step: one order, one order line, one customer?
2. **Joins.** Can a join repeat rows (one order joined to many lines), or drop rows (an inner join where a `LEFT JOIN` was needed)?
3. **Filters.** Is each filter in the right place, `WHERE`, `ON` or `HAVING`, and does it match the metric's definition?
4. **NULLs.** What happens to missing values in filters, joins, counts and averages?
5. **Arithmetic.** Integer division, rounding too early, dividing by zero.
6. **Sanity check.** Does a simple total agree with a number you already trust?

## Syntax

Reviewing uses no new syntax. It uses the order in which SQLite processes a query, which differs from the order it is written in:

```sql syntax
-- Written order          Run order
SELECT ...             -- 5. calculate the output columns (and window functions)
FROM ... JOIN ...      -- 1. build the rows
WHERE ...              -- 2. remove rows
GROUP BY ...           -- 3. form groups
HAVING ...             -- 4. remove groups
ORDER BY ...           -- 6. sort
LIMIT ...              -- 7. cut
```

Reading a query in run order, and asking "what is one row now?" after each step, finds most mistakes.

## Examples

### Join fan-out: counting after a join

This query is meant to count each customer's orders:

```sql
SELECT c.name, COUNT(*) AS orders
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
JOIN order_items AS oi ON oi.order_id = o.id
GROUP BY c.id, c.name
ORDER BY c.name;
```

Expected output:

| name | orders |
| --- | --- |
| Aisha Khan | 4 |
| Daniel Kim | 2 |
| Rahul Mehta | 2 |
| Sofia Rossi | 1 |

Aisha Khan has 2 orders, not 4. Read it in run order: after joining `order_items`, one row is one **order line**, and Aisha's two orders have four lines between them. Either count distinct orders, or do not join the lines at all, because the question does not need them:

```sql
SELECT c.name, COUNT(*) AS orders
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;
```

| name | orders |
| --- | --- |
| Aisha Khan | 2 |
| Daniel Kim | 1 |
| Rahul Mehta | 2 |
| Sofia Rossi | 1 |

The best fix is often to remove what the question does not need.

### A filter in the wrong place

This query should list **every** customer with their number of delivered orders, including zero:

```sql
SELECT c.name, COUNT(o.id) AS delivered_orders
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
WHERE o.status = 'delivered'
GROUP BY c.id, c.name
ORDER BY c.name;
```

| name | delivered_orders |
| --- | --- |
| Aisha Khan | 1 |
| Daniel Kim | 1 |
| Rahul Mehta | 1 |

Only three customers appear. The `LEFT JOIN` kept Meera Pillai with a `NULL` order, but `WHERE o.status = 'delivered'` then removed her, along with every customer who has no delivered order. The condition belongs in the join:

```sql
SELECT c.name, COUNT(o.id) AS delivered_orders
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status = 'delivered'
GROUP BY c.id, c.name
ORDER BY c.name;
```

| name | delivered_orders |
| --- | --- |
| Aisha Khan | 1 |
| Daniel Kim | 1 |
| Meera Pillai | 0 |
| Rahul Mehta | 1 |
| Sofia Rossi | 0 |

### An average of averages

Is the average order value 26.69 or 29.87? This query averages each customer's average:

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id
),
per_customer AS (
  SELECT customer_id, AVG(order_value) AS customer_aov
  FROM order_values
  GROUP BY customer_id
)
SELECT ROUND(AVG(customer_aov), 2) AS avg_of_averages,
  (SELECT ROUND(AVG(order_value), 2) FROM order_values) AS avg_order_value
FROM per_customer;
```

| avg_of_averages | avg_order_value |
| --- | --- |
| 29.87 | 26.69 |

Both are valid numbers, but they answer different questions. The average of customer averages gives Daniel Kim's single order the same weight as Aisha Khan's two orders together. "Average order value" means the average over orders. A reviewer asks which question the report is meant to answer, and checks that the label matches.

### A sanity check

Before trusting a breakdown, check that its parts add up to a total you trust. Revenue by month must add up to total net revenue:

```sql
WITH monthly AS (
  SELECT strftime('%Y-%m', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS revenue
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY month
)
SELECT ROUND((SELECT SUM(revenue) FROM monthly), 2) AS sum_of_months,
  ROUND((SELECT SUM(oi.quantity * oi.unit_price)
         FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id
         WHERE o.status <> 'cancelled'), 2) AS total_revenue;
```

| sum_of_months | total_revenue |
| --- | --- |
| 133.46 | 133.46 |

They agree. If they did not, a month would be missing or a row would be counted twice.

### Explaining a query in plain words

A review ends with an explanation a non-technical reader can follow. For the corrected "delivered orders per customer" query:

> For every customer, including those who have never ordered, we count the orders that were delivered. Orders that are shipped or cancelled are not counted. Customers with no delivered orders show 0.

The explanation states the grain (every customer), the definition (delivered only) and the edge case (zero). If the explanation is hard to write, the query is probably doing something unclear.

## How the query runs

For the broken "delivered orders" query, in run order:

1. `FROM customers LEFT JOIN orders` builds one row per order, plus one row with `NULL` order columns for Meera Pillai.
2. `WHERE o.status = 'delivered'` keeps only delivered orders. `NULL = 'delivered'` is not true, so Meera's row goes, and so does every customer whose orders were all shipped or cancelled.
3. `GROUP BY` forms groups only for the customers who are left.

Moving the condition into `ON` changes step 1: orders that are not delivered never match, but every customer keeps a row.

## Common mistakes

**Trusting a result because it runs.** A query without errors can still be wrong. Review the logic, not just the output.

**Reviewing only the final `SELECT`.** Most errors are in joins and filters. Run each CTE on its own and look at its rows.

**Integer division hiding in a ratio.** Two whole numbers divide as whole numbers:

```sql
SELECT 2 * 100 / 3 AS integer_pct, ROUND(2 * 100.0 / 3, 1) AS decimal_pct;
```

| integer_pct | decimal_pct |
| --- | --- |
| 66 | 66.7 |

**Rounding before adding.** `SUM(ROUND(x, 2))` and `ROUND(SUM(x), 2)` can differ. Round once, at the end.

**`NULL` in `NOT IN`.** If the subquery of `NOT IN` returns a `NULL`, the condition is never true and the query returns no rows:

```sql
SELECT name FROM customers WHERE city NOT IN (SELECT city FROM customers WHERE name = 'Sofia Rossi');
```

| name |
| --- |

Sofia Rossi's city is `NULL`, so no city can be shown to be "not in" the list. `NOT EXISTS` does not have this problem.

## Key takeaways

- Read a query in run order and state the grain after each step.
- Look for join fan-out, filters in the wrong place, `NULL` traps and integer division.
- Remove joins the question does not need.
- Check that parts add up to a total you trust.
- Finish with a plain-language explanation that states the grain, the definition and the edge cases.
