---
id: da-day-065
title: The quietest stretch between orders
order: 65
difficulty: advanced
topic: Window functions
summary: Look ahead to the next row with LEAD.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Read the next row with LEAD
prerequisites:
  - Day 41
---

## Task

To plan stock deliveries, list every order (any status) with `id`, `order_date` and `days_until_next`: whole days until the store's **next** order from any customer, or `NULL` for the latest order. Sort by `order_date`.

## Starter query

```sql
SELECT id, order_date
FROM orders
ORDER BY order_date;
```

## Hints

1. `LEAD(column) OVER (ORDER BY ...)` returns the value from the next row; it is the mirror of `LAG`.
2. There is no `PARTITION BY` here: every order belongs to one timeline.
3. `CAST(julianday(LEAD(order_date) OVER (ORDER BY order_date)) - julianday(order_date) AS INTEGER) AS days_until_next`

## Solution

```sql
SELECT id, order_date,
  CAST(julianday(LEAD(order_date) OVER (ORDER BY order_date)) - julianday(order_date) AS INTEGER) AS days_until_next
FROM orders
ORDER BY order_date;
```

## Expected result

| id | order_date | days_until_next |
| --- | --- | --- |
| 1 | 2025-01-10 | 8 |
| 2 | 2025-01-18 | 18 |
| 3 | 2025-02-05 | 9 |
| 4 | 2025-02-14 | 15 |
| 5 | 2025-03-01 | 8 |
| 6 | 2025-03-09 | NULL |

## Explanation

`LEAD` looks one row forward. The longest quiet stretch was 18 days, between 18 January and 5 February. Leaving out `PARTITION BY` treats the whole table as a single sequence.
