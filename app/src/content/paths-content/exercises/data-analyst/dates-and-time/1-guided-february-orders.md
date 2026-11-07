---
id: da-february-orders
title: Orders placed in February 2025
order: 1
difficulty: beginner
topic: Date ranges
summary: Filter orders to one month with a date range.
module: data-analyst
duration: 5
dataset: bookstore
tables:
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Filter ISO dates with BETWEEN
---

## Task

Return every order placed in **February 2025**, with two columns: `id` and `order_date`. Row order does not matter.

**Steps**

1. The starter query returns all orders. Add a `WHERE` clause.
2. February 2025 runs from `'2025-02-01'` to `'2025-02-28'`.
3. Use `BETWEEN ... AND ...` with those two dates.

## Starter query

```sql
SELECT id, order_date
FROM orders;
```

## Hints

1. Dates are text in `YYYY-MM-DD` form, so they can be compared like text.
2. `BETWEEN` includes both ends of the range.
3. `WHERE order_date BETWEEN '2025-02-01' AND '2025-02-28'`.

## Solution

```sql
SELECT id, order_date
FROM orders
WHERE order_date BETWEEN '2025-02-01' AND '2025-02-28';
```

## Expected result

| id | order_date |
| --- | --- |
| 3 | 2025-02-05 |
| 4 | 2025-02-14 |

## Explanation

Orders 3 and 4 fall between 1 and 28 February 2025. Because ISO dates compare correctly as text, the range works without any date function.

## Other accepted answers

```sql
SELECT id, order_date FROM orders WHERE strftime('%Y-%m', order_date) = '2025-02';
```

```sql
SELECT id, order_date FROM orders WHERE order_date >= '2025-02-01' AND order_date < '2025-03-01';
```
