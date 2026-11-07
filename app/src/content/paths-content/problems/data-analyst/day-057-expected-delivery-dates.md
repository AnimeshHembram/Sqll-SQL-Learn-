---
id: da-day-057
title: Expected delivery dates
order: 57
difficulty: intermediate
topic: Dates
summary: Add days to a date with SQLite's date modifiers.
module: data-analyst
duration: 6
dataset: bookstore
tables:
  - orders
  - customers
orderMatters: false
checkColumnNames: true
objectives:
  - Add an interval to a date
prerequisites:
  - Day 22
---

## Task

Shipped orders arrive **5 days** after they were ordered. For every order with status `'shipped'`, return `id`, `name` (the customer) and `expected_by`: the order date plus 5 days, as `YYYY-MM-DD`. Row order does not matter.

## Starter query

```sql
SELECT o.id, c.name, o.order_date
FROM orders AS o
JOIN customers AS c ON c.id = o.customer_id
WHERE o.status = 'shipped';
```

## Hints

1. `date(value, modifier)` moves a date: `'+5 days'`, `'-1 month'` and so on.
2. Apply it to `o.order_date`.
3. `date(o.order_date, '+5 days') AS expected_by`

## Solution

```sql
SELECT o.id, c.name, date(o.order_date, '+5 days') AS expected_by
FROM orders AS o
JOIN customers AS c ON c.id = o.customer_id
WHERE o.status = 'shipped';
```

## Expected result

| id | name | expected_by |
| --- | --- | --- |
| 3 | Aisha Khan | 2025-02-10 |
| 6 | Rahul Mehta | 2025-03-14 |

## Explanation

Date modifiers handle month ends and leap years for you: adding text or numbers to a date string by hand would not. Order 3 is expected on 10 February and order 6 on 14 March.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT o.id, c.name, o.order_date AS expected_by FROM orders AS o JOIN customers AS c ON c.id = o.customer_id WHERE o.status = 'shipped';
```
