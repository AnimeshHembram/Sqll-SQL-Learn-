---
id: da-day-104
title: Each customer's first and latest order status
order: 104
difficulty: advanced
topic: Window functions
summary: Use FIRST_VALUE and LAST_VALUE, and give LAST_VALUE the frame it needs.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Read values from the first and last row of a partition
  - Set a window frame explicitly
prerequisites:
  - Day 64
  - Data Analyst chapter: Window functions
---

## Task

Support wants context next to every order. For each order, return `order_id`, `customer_id`, `status`, `first_status` (the status of that customer's **first** order) and `latest_status` (the status of their **most recent** order). Sort by `order_id`.

## Starter query

```sql
SELECT id AS order_id, customer_id, status, order_date
FROM orders
ORDER BY id;
```

## Hints

1. `FIRST_VALUE(status) OVER (PARTITION BY customer_id ORDER BY order_date)` gives the status of the customer's earliest order.
2. `LAST_VALUE` with the same window looks wrong: by default the window ends at the **current row**, so it returns the current order's own status.
3. Extend the frame to the end of the partition: `LAST_VALUE(status) OVER (PARTITION BY customer_id ORDER BY order_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)`.

## Solution

```sql
SELECT id AS order_id, customer_id, status,
  FIRST_VALUE(status) OVER (PARTITION BY customer_id ORDER BY order_date) AS first_status,
  LAST_VALUE(status) OVER (
    PARTITION BY customer_id ORDER BY order_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS latest_status
FROM orders
ORDER BY id;
```

## Expected result

| order_id | customer_id | status | first_status | latest_status |
| --- | --- | --- | --- | --- |
| 1 | 1 | delivered | delivered | shipped |
| 2 | 2 | delivered | delivered | shipped |
| 3 | 1 | shipped | delivered | shipped |
| 4 | 3 | cancelled | cancelled | cancelled |
| 5 | 4 | delivered | delivered | delivered |
| 6 | 2 | shipped | delivered | shipped |

## Explanation

With an `ORDER BY` and no frame, a window covers the rows from the start of the partition **up to the current row**. That is exactly right for `FIRST_VALUE` and for running totals, but `LAST_VALUE` then just returns the current row. Saying `UNBOUNDED FOLLOWING` makes the frame the whole partition.

Aisha Khan's first order was delivered and her latest is shipped, and both her rows show that. Sofia Rossi has one cancelled order, which is both her first and latest.

**Common mistake:** `LAST_VALUE` without a frame. An equally good alternative is `FIRST_VALUE(status) OVER (PARTITION BY customer_id ORDER BY order_date DESC)`.

## Other accepted answers

```sql
SELECT id AS order_id, customer_id, status,
  FIRST_VALUE(status) OVER (PARTITION BY customer_id ORDER BY order_date) AS first_status,
  FIRST_VALUE(status) OVER (PARTITION BY customer_id ORDER BY order_date DESC) AS latest_status
FROM orders
ORDER BY id;
```

## Wrong answers

Feedback: incorrect-output

```sql
SELECT id AS order_id, customer_id, status, FIRST_VALUE(status) OVER (PARTITION BY customer_id ORDER BY order_date) AS first_status, LAST_VALUE(status) OVER (PARTITION BY customer_id ORDER BY order_date) AS latest_status FROM orders ORDER BY id;
```
