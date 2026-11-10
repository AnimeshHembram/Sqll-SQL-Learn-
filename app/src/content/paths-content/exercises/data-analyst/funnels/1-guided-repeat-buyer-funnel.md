---
id: da-repeat-buyer-funnel
title: A funnel that ends with a second order
order: 1
difficulty: intermediate
topic: UNION ALL
summary: Stack three customer steps into one funnel table, ending with customers who ordered again.
module: data-analyst
duration: 9
dataset: bookstore
tables:
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Stack steps with UNION ALL
  - Use a grouped subquery as a funnel step
---

## Task

The retention team wants a funnel from first order to repeat order. Return three rows with `step_no`, `step` and `customers`:

1. `'Placed an order'`: customers with any order
2. `'Kept an order'`: customers with a non-cancelled order
3. `'Kept two or more'`: customers with at least two non-cancelled orders

Sort by `step_no`.

**Steps**

1. The starter query is step 1. Add `UNION ALL` and a second `SELECT` for step 2 with `WHERE status <> 'cancelled'`.
2. Step 3 needs a count of customers whose non-cancelled order count is 2 or more. Write a subquery that groups non-cancelled orders by `customer_id` with `HAVING COUNT(*) >= 2`, and count its rows.
3. Finish with `ORDER BY step_no`.

## Starter query

```sql
SELECT 1 AS step_no, 'Placed an order' AS step, COUNT(DISTINCT customer_id) AS customers
FROM orders;
```

## Hints

1. Each step is its own `SELECT` with three columns, joined by `UNION ALL`.
2. Step 3: `SELECT 3, 'Kept two or more', COUNT(*) FROM (SELECT customer_id FROM orders WHERE status <> 'cancelled' GROUP BY customer_id HAVING COUNT(*) >= 2)`.
3. The column names come from the first `SELECT`, so the later ones need no aliases.

## Solution

```sql
SELECT 1 AS step_no, 'Placed an order' AS step, COUNT(DISTINCT customer_id) AS customers FROM orders
UNION ALL
SELECT 2, 'Kept an order', COUNT(DISTINCT customer_id) FROM orders WHERE status <> 'cancelled'
UNION ALL
SELECT 3, 'Kept two or more', COUNT(*) FROM (
  SELECT customer_id FROM orders WHERE status <> 'cancelled' GROUP BY customer_id HAVING COUNT(*) >= 2
)
ORDER BY step_no;
```

## Expected result

| step_no | step | customers |
| --- | --- | --- |
| 1 | Placed an order | 4 |
| 2 | Kept an order | 3 |
| 3 | Kept two or more | 2 |

## Explanation

Four customers ordered, three kept an order and two came back for a second. A step can be any count, including one built from a grouped subquery. Each `SELECT` becomes one row of the funnel, and `step_no` keeps the rows in journey order.

## Wrong answers

Feedback: missing-rows

```sql
SELECT 1 AS step_no, 'Placed an order' AS step, COUNT(DISTINCT customer_id) AS customers FROM orders UNION ALL SELECT 2, 'Kept an order', COUNT(DISTINCT customer_id) FROM orders WHERE status <> 'cancelled' ORDER BY step_no;
```
