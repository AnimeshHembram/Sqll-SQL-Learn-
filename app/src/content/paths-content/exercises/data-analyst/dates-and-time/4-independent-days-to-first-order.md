---
id: da-days-to-first-order
title: Days from sign-up to first order
order: 4
difficulty: advanced
topic: julianday
summary: Measure how many days each customer took to place their first order.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - customers
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Find each customer's first order with MIN
  - Measure days between two dates with julianday
---

## Task

The growth team wants to know how quickly new customers start buying. For each customer who has placed at least one order (any status), return:

- `name`
- `days_to_first_order`: the whole number of days between the customer's `joined` date and their first `order_date`

Row order does not matter.

## Starter query

```sql
SELECT name, joined
FROM customers;
```

## Hints

1. A customer's first order is the earliest `order_date` among their orders: `MIN(o.order_date)` after grouping by customer.
2. `julianday(a) - julianday(b)` is the number of days from `b` to `a`.
3. `CAST(julianday(MIN(o.order_date)) - julianday(c.joined) AS INTEGER) AS days_to_first_order`, with a join to `orders` and `GROUP BY c.name, c.joined`.

## Solution

```sql
SELECT c.name,
  CAST(julianday(MIN(o.order_date)) - julianday(c.joined) AS INTEGER) AS days_to_first_order
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.name, c.joined;
```

## Expected result

| name | days_to_first_order |
| --- | --- |
| Aisha Khan | 361 |
| Daniel Kim | 18 |
| Rahul Mehta | 322 |
| Sofia Rossi | 270 |

## Explanation

Grouping by customer lets `MIN(o.order_date)` find each customer's first order. Subtracting the two day numbers gives the gap in days. Meera Pillai has no orders, so the inner join leaves her out.

## Wrong answers

Feedback: extra-rows

```sql
SELECT c.name, CAST(julianday(o.order_date) - julianday(c.joined) AS INTEGER) AS days_to_first_order FROM customers AS c JOIN orders AS o ON o.customer_id = c.id;
```
