---
id: da-day-019
title: Readers of Indian authors
order: 19
difficulty: intermediate
topic: Joins
summary: Find customers by a property several tables away.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - customers
  - orders
  - order_items
  - books
  - authors
orderMatters: false
checkColumnNames: true
objectives:
  - Filter on a table several joins away
  - Remove duplicates with DISTINCT
prerequisites:
  - Day 18
---

## Task

For a campaign about Indian writing, return the `name` of every customer who has ordered (any status) at least one book by an author from **India**. Each customer once. Row order does not matter.

## Starter query

```sql
SELECT name
FROM customers;
```

## Hints

1. Join customers → orders → order_items → books → authors.
2. Filter on `a.country = 'India'`.
3. Use `SELECT DISTINCT c.name` so a customer with several matching books appears once.

## Solution

```sql
SELECT DISTINCT c.name
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
JOIN order_items AS oi ON oi.order_id = o.id
JOIN books AS b ON b.id = oi.book_id
JOIN authors AS a ON a.name = b.author
WHERE a.country = 'India';
```

## Expected result

| name |
| --- |
| Aisha Khan |
| Sofia Rossi |
| Rahul Mehta |

## Explanation

Books by Mira Das and Priya Nair were bought by three customers. Without `DISTINCT`, Aisha Khan would appear several times.

## Wrong answers

Feedback: extra-rows

```sql
SELECT c.name FROM customers AS c JOIN orders AS o ON o.customer_id = c.id JOIN order_items AS oi ON oi.order_id = o.id JOIN books AS b ON b.id = oi.book_id JOIN authors AS a ON a.name = b.author WHERE a.country = 'India';
```
