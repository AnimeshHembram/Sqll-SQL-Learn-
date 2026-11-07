---
id: da-orders-by-status
title: Order statuses per customer
order: 3
difficulty: intermediate
topic: Conditional aggregation
summary: Pivot order statuses into columns so each customer is one row of a report.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - customers
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Count matching rows with SUM(CASE ...)
  - Produce one row per customer with several counts
---

## Task

Customer service wants one row per customer who has placed at least one order, with:

- `name`
- `completed`: the number of the customer's orders that are `'delivered'`
- `open`: the number of the customer's orders that are `'shipped'`

Cancelled orders count in neither column, but a customer whose only order was cancelled still appears, with 0 and 0. Row order does not matter.

## Starter query

```sql
SELECT c.name, o.status
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id;
```

## Hints

1. You need one row per customer, so group by the name.
2. `SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END)` counts delivered orders in each group.
3. Add a second `SUM(CASE ...)` for `'shipped'`, name the columns `completed` and `open`, and add `GROUP BY c.name`.

## Solution

```sql
SELECT c.name,
  SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) AS completed,
  SUM(CASE WHEN o.status = 'shipped' THEN 1 ELSE 0 END) AS open
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.name;
```

## Expected result

| name | completed | open |
| --- | --- | --- |
| Aisha Khan | 1 | 1 |
| Daniel Kim | 1 | 0 |
| Rahul Mehta | 1 | 1 |
| Sofia Rossi | 0 | 0 |

## Explanation

The join gives one row per order. Grouping by customer, each `SUM(CASE ...)` adds 1 for every order with the matching status and 0 for the others. Sofia Rossi's only order is cancelled, so both of her counts are 0, but she still has a group.

## Other accepted answers

```sql
SELECT c.name, COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) AS completed, COUNT(CASE WHEN o.status = 'shipped' THEN 1 END) AS open FROM customers AS c JOIN orders AS o ON o.customer_id = c.id GROUP BY c.name;
```

## Wrong answers

Feedback: missing-rows

```sql
SELECT c.name, SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) AS completed, SUM(CASE WHEN o.status = 'shipped' THEN 1 ELSE 0 END) AS open FROM customers AS c JOIN orders AS o ON o.customer_id = c.id WHERE o.status <> 'cancelled' GROUP BY c.name;
```
