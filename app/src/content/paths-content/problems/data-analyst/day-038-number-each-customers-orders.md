---
id: da-day-038
title: Number each customer's orders
order: 38
difficulty: intermediate
topic: Window functions
summary: Number rows within each group with ROW_NUMBER() OVER (PARTITION BY ...).
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Number rows within groups with ROW_NUMBER
prerequisites:
  - Day 25
  - Challenge: Rank books within their genre
---

## Task

Return every order with `customer_id`, `order_date` and `order_number`: 1 for the customer's first order, 2 for their second, and so on (by date, any status). Sort by `customer_id`, then `order_number`.

**Before you start:** a window function calculates a value for each row from related rows, without merging them as `GROUP BY` does. `ROW_NUMBER() OVER (PARTITION BY a ORDER BY b)` numbers the rows 1, 2, 3, ... in order of `b`, starting again at 1 for each value of `a`.

## Starter query

```sql
SELECT customer_id, order_date
FROM orders
ORDER BY customer_id, order_date;
```

## Hints

1. Each customer is a partition: `PARTITION BY customer_id`.
2. Within a customer, number the orders by date: `ORDER BY order_date`.
3. `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date) AS order_number`

## Solution

```sql
SELECT customer_id, order_date,
  ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date) AS order_number
FROM orders
ORDER BY customer_id, order_number;
```

## Expected result

| customer_id | order_date | order_number |
| --- | --- | --- |
| 1 | 2025-01-10 | 1 |
| 1 | 2025-02-05 | 2 |
| 2 | 2025-01-18 | 1 |
| 2 | 2025-03-09 | 2 |
| 3 | 2025-02-14 | 1 |
| 4 | 2025-03-01 | 1 |

## Explanation

The numbering restarts for every customer, so customers 1 and 2 have orders numbered 1 and 2 and the others only 1. Unlike `GROUP BY`, every order row is kept.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT customer_id, order_date, ROW_NUMBER() OVER (ORDER BY order_date) AS order_number FROM orders ORDER BY customer_id, order_number;
```
