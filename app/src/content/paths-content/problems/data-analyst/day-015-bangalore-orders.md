---
id: da-day-015
title: Orders from Bangalore
order: 15
difficulty: intermediate
topic: Joins
summary: Join orders to customers and filter on a customer attribute.
module: data-analyst
duration: 6
dataset: bookstore
tables:
  - orders
  - customers
orderMatters: false
checkColumnNames: true
objectives:
  - Filter on a column from a joined table
prerequisites:
  - Day 2
  - Data Analyst chapter: Combining tables with joins
---

## Task

The Bangalore delivery partner wants a list of orders from customers in **Bangalore**: `name` and `order_date`. Row order does not matter.

## Starter query

```sql
SELECT o.id, o.order_date
FROM orders AS o;
```

## Hints

1. The city is in `customers`, so join it.
2. Join on `o.customer_id = c.id`, then filter on `c.city`.
3. `JOIN customers AS c ON o.customer_id = c.id WHERE c.city = 'Bangalore'` and select `c.name, o.order_date`.

## Solution

```sql
SELECT c.name, o.order_date
FROM orders AS o
JOIN customers AS c ON o.customer_id = c.id
WHERE c.city = 'Bangalore';
```

## Expected result

| name | order_date |
| --- | --- |
| Aisha Khan | 2025-01-10 |
| Aisha Khan | 2025-02-05 |
| Daniel Kim | 2025-03-01 |

## Explanation

Two Bangalore customers placed three orders between them. Filtering on a joined table's column is one of the most common analyst patterns.
