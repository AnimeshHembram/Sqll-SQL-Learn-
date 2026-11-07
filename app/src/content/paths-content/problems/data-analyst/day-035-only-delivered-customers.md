---
id: da-day-035
title: Customers with a perfect delivery record
order: 35
difficulty: advanced
topic: Subqueries and CTEs
summary: Find groups where every row meets a condition, not just one.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - customers
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Test that every row in a group meets a condition
prerequisites:
  - Day 31
  - Day 13
---

## Task

Return the `name` of every customer who has ordered and whose orders were **all delivered** (none shipped, none cancelled). Row order does not matter.

## Starter query

```sql
SELECT DISTINCT c.name
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
WHERE o.status = 'delivered';
```

## Hints

1. The starter query finds customers with *at least one* delivered order. Aisha Khan is listed although one of her orders is still shipping.
2. "All delivered" means "has orders, and none of them is not delivered". Combine `EXISTS` with `NOT EXISTS`, or group and count the other statuses.
3. `GROUP BY c.name HAVING SUM(CASE WHEN o.status <> 'delivered' THEN 1 ELSE 0 END) = 0`

## Solution

```sql
SELECT c.name
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.name
HAVING SUM(CASE WHEN o.status <> 'delivered' THEN 1 ELSE 0 END) = 0;
```

## Expected result

| name |
| --- |
| Daniel Kim |

## Explanation

"Every order" questions are answered by checking that no counter-example exists. Daniel Kim's only order was delivered; every other customer who ordered has a shipped or cancelled order.

## Other accepted answers

```sql
SELECT c.name FROM customers AS c WHERE EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id) AND NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id AND o.status <> 'delivered');
```

## Wrong answers

Feedback: extra-rows

```sql
SELECT DISTINCT c.name FROM customers AS c JOIN orders AS o ON o.customer_id = c.id WHERE o.status = 'delivered';
```
