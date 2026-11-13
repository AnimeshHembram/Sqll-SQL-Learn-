---
id: da-day-222
title: What share of customers spent the same or less?
order: 222
difficulty: intermediate
topic: Window functions
summary: Place every customer on the spending distribution with CUME_DIST, including those who spent nothing.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - customers
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Use CUME_DIST
  - Keep zero-spend customers in a distribution
prerequisites:
  - Day 66
  - Day 81
---

## Task

For each customer, compute total spend on non-cancelled orders (0 if none), then `at_or_below_pct`: the percentage of customers who spent **the same or less** (100 for the top spender).

Return `name`, `spent` (rounded to 2 decimal places) and `at_or_below_pct` (rounded to 1 decimal place). Sort by `spent` from highest to lowest, then `name`.

## Starter query

```sql
SELECT c.name, o.id AS order_id, o.status
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
ORDER BY c.name;
```

## Hints

1. Total spend per customer with `LEFT JOIN`s from `customers`, putting `o.status <> 'cancelled'` in the join condition so customers with only cancelled orders still appear with 0.
2. `CUME_DIST() OVER (ORDER BY spent)` is the fraction of rows whose value is less than or equal to the current one. Multiply by 100.
3. `PERCENT_RANK` answers a different question (the share strictly below, scaled from 0), so it gives other numbers.

## Solution

```sql
WITH spend AS (
  SELECT c.name, COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS spent
  FROM customers AS c
  LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status <> 'cancelled'
  LEFT JOIN order_items AS oi ON oi.order_id = o.id
  GROUP BY c.id, c.name
)
SELECT name, ROUND(spent, 2) AS spent, ROUND(100 * CUME_DIST() OVER (ORDER BY spent), 1) AS at_or_below_pct
FROM spend
ORDER BY spent DESC, name;
```

## Expected result

| name | spent | at_or_below_pct |
| --- | --- | --- |
| Aisha Khan | 62.22 | 100 |
| Daniel Kim | 45.75 | 80 |
| Rahul Mehta | 25.49 | 60 |
| Meera Pillai | 0 | 40 |
| Sofia Rossi | 0 | 40 |

## Explanation

`CUME_DIST()` answers "what share of rows have a value less than or equal to this one?", which is exactly "what share of customers spent the same or less". Aisha spent the most, so 100% spent at most her amount; Daniel's 45.75 is matched or beaten downwards by 4 of 5 customers, 80%.

Ties share a value: Meera has not ordered and Sofia's only order was cancelled, so both spent 0, and both sit at 40%, because 2 of 5 customers spent 0 or less. They only appear because the spend comes from `customers` with `LEFT JOIN`s and the status test sits in the join condition; filtering cancelled orders in `WHERE` would drop both Sofia's and Meera's rows and shift everyone else's percentage. `PERCENT_RANK` measures something else, the share strictly below scaled from 0 to 100, so it gives 0 for the lowest spenders and 75 for Daniel.

**Common mistake:** using inner joins to compute spend. Non-buyers disappear, the distribution only covers buyers, and every percentage comes out wrong.

## Wrong answers

Feedback: incorrect-output

```sql
WITH spend AS ( SELECT c.name, COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS spent FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status <> 'cancelled' LEFT JOIN order_items AS oi ON oi.order_id = o.id GROUP BY c.id, c.name ) SELECT name, ROUND(spent, 2) AS spent, ROUND(100 * PERCENT_RANK() OVER (ORDER BY spent), 1) AS at_or_below_pct FROM spend ORDER BY spent DESC, name;
```

Feedback: incorrect-output

```sql
WITH spend AS (SELECT c.name, SUM(oi.quantity * oi.unit_price) AS spent FROM customers AS c JOIN orders AS o ON o.customer_id = c.id JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY c.id, c.name) SELECT name, ROUND(spent, 2) AS spent, ROUND(100 * CUME_DIST() OVER (ORDER BY spent), 1) AS at_or_below_pct FROM spend ORDER BY spent DESC, name;
```
