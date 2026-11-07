---
id: da-customers-without-orders
title: Customers who have never ordered
order: 3
difficulty: intermediate
topic: LEFT JOIN
summary: Find customers with no orders, so the marketing team can send them a welcome offer.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - customers
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Keep unmatched rows with LEFT JOIN
  - Keep only the rows that found no match
---

## Task

Marketing wants to send a welcome offer to customers who signed up but have **never placed an order**. Return one column, `name`, with one row per such customer.

## Starter query

```sql
SELECT name
FROM customers;
```

## Hints

1. An inner join cannot find customers without orders, because it drops them. Which join keeps them?
2. After a `LEFT JOIN`, a customer with no orders has `NULL` in every `orders` column.
3. `LEFT JOIN orders AS o ON o.customer_id = c.id`, then `WHERE o.id IS NULL`.

## Solution

```sql
SELECT c.name
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
WHERE o.id IS NULL;
```

## Expected result

| name |
| --- |
| Meera Pillai |

## Explanation

`LEFT JOIN` keeps every customer. Customers with orders get one row per order; Meera Pillai gets a single row with `NULL` order columns. `WHERE o.id IS NULL` keeps only that row.

## Other accepted answers

```sql
SELECT name FROM customers WHERE id NOT IN (SELECT customer_id FROM orders);
```

## Wrong answers

Feedback: extra-rows

```sql
SELECT c.name FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.id;
```
