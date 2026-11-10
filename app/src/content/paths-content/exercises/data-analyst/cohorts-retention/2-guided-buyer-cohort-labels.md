---
id: da-buyer-cohort-labels
title: Each buyer's cohort
order: 2
difficulty: intermediate
topic: Cohorts
summary: Assign every buyer to the month of their first non-cancelled order.
module: data-analyst
duration: 7
dataset: bookstore
tables:
  - customers
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Assign customers to cohorts by first purchase
---

## Task

Before any retention analysis, list each buyer with their cohort. Return `name` and `cohort`: the month (`YYYY-MM`) of their first **non-cancelled** order. Customers without a non-cancelled order are not buyers and are left out. Row order does not matter.

**Steps**

1. Join `customers` to `orders` and keep only non-cancelled orders.
2. Group by customer, so that each buyer is one row.
3. The cohort is `strftime('%Y-%m', MIN(o.order_date))`.

## Starter query

```sql
SELECT c.name, o.order_date, o.status
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id;
```

## Hints

1. The first order is the one with the smallest date: `MIN`.
2. Filter cancelled orders in `WHERE`, before grouping, so they can never be someone's first order.
3. `SELECT c.name, strftime('%Y-%m', MIN(o.order_date)) AS cohort ... WHERE o.status <> 'cancelled' GROUP BY c.id, c.name`

## Solution

```sql
SELECT c.name, strftime('%Y-%m', MIN(o.order_date)) AS cohort
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
WHERE o.status <> 'cancelled'
GROUP BY c.id, c.name;
```

## Expected result

| name | cohort |
| --- | --- |
| Aisha Khan | 2025-01 |
| Rahul Mehta | 2025-01 |
| Daniel Kim | 2025-03 |

## Explanation

Aisha Khan and Rahul Mehta are in the January cohort and Daniel Kim in March. Sofia Rossi is left out: her only order was cancelled, so she never became a buyer. Grouping by `c.id` as well as the name keeps two customers with the same name apart.

## Wrong answers

Feedback: extra-rows

```sql
SELECT c.name, strftime('%Y-%m', MIN(o.order_date)) AS cohort FROM customers AS c JOIN orders AS o ON o.customer_id = c.id GROUP BY c.id, c.name;
```
