---
id: da-orders-after-signup
title: Orders since a customer joined
order: 1
difficulty: beginner
topic: Scalar subquery
summary: Use a subquery to look up one date from another table and filter by it.
module: data-analyst
duration: 6
dataset: bookstore
tables:
  - orders
  - customers
orderMatters: false
checkColumnNames: true
objectives:
  - Use a scalar subquery in WHERE to look up a value from another table
---

## Task

Daniel Kim is the newest customer who has ordered. Marketing wants to know how busy the store has been since he joined. Return the `id`, `order_date` and `status` of every order placed **after the date Daniel Kim joined**. Do not type his join date into the query: look it up with a subquery, so the query still works if his record changes. Row order does not matter.

**Steps**

1. The starter query returns every order. Add `WHERE order_date > ...`.
2. In place of `...`, write a query in brackets that returns Daniel Kim's `joined` date from `customers`.
3. That inner query is `SELECT joined FROM customers WHERE name = 'Daniel Kim'`.

## Starter query

```sql
SELECT id, order_date, status
FROM orders;
```

## Hints

1. The join date is in `customers`, not `orders`. A subquery in brackets can fetch it.
2. A subquery used with `>` must return exactly one value: one row and one column.
3. `WHERE order_date > (SELECT joined FROM customers WHERE name = 'Daniel Kim')`.

## Solution

```sql
SELECT id, order_date, status
FROM orders
WHERE order_date > (SELECT joined FROM customers WHERE name = 'Daniel Kim');
```

## Expected result

| id | order_date | status |
| --- | --- | --- |
| 4 | 2025-02-14 | cancelled |
| 5 | 2025-03-01 | delivered |
| 6 | 2025-03-09 | shipped |

## Explanation

The subquery returns one value, Daniel Kim's join date (2025-02-11). The outer query compares every order date with it and keeps the three orders placed later. Because both dates are ISO text, `>` compares them correctly. Looking the value up, rather than typing `'2025-02-11'`, keeps the query right if the data changes.

## Other accepted answers

```sql
SELECT o.id, o.order_date, o.status FROM orders AS o JOIN customers AS c ON c.name = 'Daniel Kim' WHERE o.order_date > c.joined;
```

## Wrong answers

Feedback: extra-rows

```sql
SELECT id, order_date, status FROM orders WHERE order_date >= (SELECT MIN(joined) FROM customers);
```
