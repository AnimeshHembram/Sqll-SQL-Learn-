---
id: da-day-270
title: Case study: a quarterly statement for every customer
order: 270
difficulty: advanced
topic: Case studies
summary: Produce a Q1 2025 statement per customer with orders, cancellations, net spend and a running balance of spend.
module: data-analyst
duration: 16
dataset: bookstore
tables:
  - customers
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Combine detail and summary rows
  - Compute a running total that skips some rows
prerequisites:
  - Day 120
  - Day 181
---

## Task

The bookstore sends every customer a statement for **January to March 2025**. Produce one row per customer **and** order in the quarter, plus one summary row per customer (customers with no orders get only the summary row):

- order rows: `name`, `line` = `'order ' || order id`, `order_date`, `status`, `amount` (rounded to 2 decimal places) and `running_spend`: the customer's cumulative spend on **non-cancelled** orders up to and including this one,
- summary rows: `line` = `'total'`, `order_date` and `status` `NULL`, `amount` = net spend on non-cancelled orders (0 when none) and `running_spend` `NULL`.

Sort by `name`, then order rows by date with the summary row last.

## Starter query

```sql
SELECT c.name, o.id, o.order_date, o.status
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
ORDER BY c.name, o.order_date;
```

## Hints

1. Total each order in a CTE (orders joined to their lines, grouped by order). The running spend is a window over the customer's orders: `SUM(CASE WHEN status <> 'cancelled' THEN amount ELSE 0 END) OVER (PARTITION BY customer_id ORDER BY order_date, order_id)`.
2. Build the summary rows from `customers` with a `LEFT JOIN` to the order totals so everyone gets one, and stack both kinds with `UNION ALL`, adding a sort column (0 for orders, 1 for the total).
3. Remember the quarter filter on `order_date` for both parts.

## Solution

```sql
WITH lines AS (
  SELECT o.customer_id, o.id AS order_id, o.order_date, o.status, SUM(oi.quantity * oi.unit_price) AS amount
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  GROUP BY o.customer_id, o.id, o.order_date, o.status
),
q1 AS (
  SELECT * FROM lines WHERE order_date BETWEEN '2025-01-01' AND '2025-03-31'
),
statement AS (
  SELECT c.name, 0 AS sort_key, q.order_date AS sort_date, 'order ' || q.order_id AS line, q.order_date, q.status, q.amount,
    SUM(CASE WHEN q.status <> 'cancelled' THEN q.amount ELSE 0 END) OVER (PARTITION BY q.customer_id ORDER BY q.order_date, q.order_id) AS running_spend
  FROM q1 AS q
  JOIN customers AS c ON c.id = q.customer_id
  UNION ALL
  SELECT c.name, 1, NULL, 'total', NULL, NULL, COALESCE(SUM(CASE WHEN q.status <> 'cancelled' THEN q.amount END), 0), NULL
  FROM customers AS c
  LEFT JOIN q1 AS q ON q.customer_id = c.id
  GROUP BY c.id, c.name
)
SELECT name, line, order_date, status, ROUND(amount, 2) AS amount, ROUND(running_spend, 2) AS running_spend
FROM statement
ORDER BY name, sort_key, sort_date, line;
```

## Expected result

| name | line | order_date | status | amount | running_spend |
| --- | --- | --- | --- | --- | --- |
| Aisha Khan | order 1 | 2025-01-10 | delivered | 32.97 | 32.97 |
| Aisha Khan | order 3 | 2025-02-05 | shipped | 29.25 | 62.22 |
| Aisha Khan | total | NULL | NULL | 62.22 | NULL |
| Daniel Kim | order 5 | 2025-03-01 | delivered | 45.75 | 45.75 |
| Daniel Kim | total | NULL | NULL | 45.75 | NULL |
| Meera Pillai | total | NULL | NULL | 0 | NULL |
| Rahul Mehta | order 2 | 2025-01-18 | delivered | 15.5 | 15.5 |
| Rahul Mehta | order 6 | 2025-03-09 | shipped | 9.99 | 25.49 |
| Rahul Mehta | total | NULL | NULL | 25.49 | NULL |
| Sofia Rossi | order 4 | 2025-02-14 | cancelled | 12.99 | 0 |
| Sofia Rossi | total | NULL | NULL | 0 | NULL |

## Explanation

A statement combines detail rows (each order) with a summary row per customer, so it is two queries stacked with `UNION ALL`, held in order by a sort key that puts each customer's total after their orders. The running spend is a window over each customer's orders that adds non-cancelled amounts and adds 0 for cancelled ones, so the cancelled order still appears on the statement without increasing the balance.

Sofia's only order was cancelled: it is listed for her information, her running spend stays at 0, and her total is 0. Meera ordered nothing, so she gets only a summary row, which comes from `customers` with a `LEFT JOIN`; a statement that skipped her would leave a customer without a statement.

**Common mistake:** summing every order. Sofia's cancelled 12.99 then appears as spend, and her running total and statement total are both wrong.

## Wrong answers

Feedback: incorrect-output

```sql
WITH lines AS ( SELECT o.customer_id, o.id AS order_id, o.order_date, o.status, SUM(oi.quantity * oi.unit_price) AS amount FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id GROUP BY o.customer_id, o.id, o.order_date, o.status ), q1 AS (SELECT * FROM lines WHERE order_date BETWEEN '2025-01-01' AND '2025-03-31'), statement AS (SELECT c.name, 0 AS sort_key, q.order_date AS sort_date, 'order ' || q.order_id AS line, q.order_date, q.status, q.amount, SUM(q.amount) OVER (PARTITION BY q.customer_id ORDER BY q.order_date, q.order_id) AS running_spend FROM q1 AS q JOIN customers AS c ON c.id = q.customer_id UNION ALL SELECT c.name, 1, NULL, 'total', NULL, NULL, COALESCE(SUM(q.amount), 0), NULL FROM customers AS c LEFT JOIN q1 AS q ON q.customer_id = c.id GROUP BY c.id, c.name) SELECT name, line, order_date, status, ROUND(amount, 2) AS amount, ROUND(running_spend, 2) AS running_spend FROM statement ORDER BY name, sort_key, sort_date, line;
```

Feedback: missing-rows

```sql
WITH lines AS ( SELECT o.customer_id, o.id AS order_id, o.order_date, o.status, SUM(oi.quantity * oi.unit_price) AS amount FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id GROUP BY o.customer_id, o.id, o.order_date, o.status ), q1 AS (SELECT * FROM lines WHERE order_date BETWEEN '2025-01-01' AND '2025-03-31'), statement AS (SELECT c.name, 0 AS sort_key, q.order_date AS sort_date, 'order ' || q.order_id AS line, q.order_date, q.status, q.amount, SUM(CASE WHEN q.status <> 'cancelled' THEN q.amount ELSE 0 END) OVER (PARTITION BY q.customer_id ORDER BY q.order_date, q.order_id) AS running_spend FROM q1 AS q JOIN customers AS c ON c.id = q.customer_id UNION ALL SELECT c.name, 1, NULL, 'total', NULL, NULL, SUM(CASE WHEN q.status <> 'cancelled' THEN q.amount ELSE 0 END), NULL FROM q1 AS q JOIN customers AS c ON c.id = q.customer_id GROUP BY c.id, c.name) SELECT name, line, order_date, status, ROUND(amount, 2) AS amount, ROUND(running_spend, 2) AS running_spend FROM statement ORDER BY name, sort_key, sort_date, line;
```
