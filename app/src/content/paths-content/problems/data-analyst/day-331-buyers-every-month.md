---
id: da-day-331
title: Customers who bought in every month of the quarter
order: 331
difficulty: intermediate
topic: Interview practice
summary: Find customers with an order in each of January, February and March, a relational division in disguise.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Require every value of a set
  - Count distinct periods per entity
prerequisites:
  - Day 99
  - Day 29
---

## Task

A classic interview question: which customers placed at least one order in **every month** of the first quarter of 2025 (January, February and March)? Orders outside the quarter do not count (starter query).

Return `customer` and `orders_in_quarter`, sorted by `customer`.

## Starter query

```sql
WITH orders(order_id, customer, ordered_on) AS (
  VALUES
    (1, 'Asha', '2025-01-04'), (2, 'Asha', '2025-02-11'), (3, 'Asha', '2025-03-19'), (4, 'Ravi', '2025-01-15'), (5, 'Ravi', '2025-01-28'),
    (6, 'Ravi', '2025-03-02'), (7, 'Meera', '2025-01-09'), (8, 'Meera', '2025-02-14'), (9, 'Meera', '2025-03-30'), (10, 'Meera', '2025-03-31'),
    (11, 'Kiran', '2025-02-20'), (12, 'Kiran', '2025-03-05'), (13, 'Dev', '2025-01-20'), (14, 'Dev', '2025-02-01'), (15, 'Dev', '2025-03-01'),
    (16, 'Dev', '2025-04-02')
)
SELECT customer, ordered_on
FROM orders
ORDER BY customer, ordered_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Filter to the quarter, then group by customer and count the **distinct** months: `COUNT(DISTINCT strftime('%m', ordered_on))`.
3. Keep customers with `HAVING COUNT(DISTINCT ...) = 3`. Several orders in the same month count as one month.

## Solution

```sql
WITH orders(order_id, customer, ordered_on) AS (
  VALUES
    (1, 'Asha', '2025-01-04'), (2, 'Asha', '2025-02-11'), (3, 'Asha', '2025-03-19'), (4, 'Ravi', '2025-01-15'), (5, 'Ravi', '2025-01-28'),
    (6, 'Ravi', '2025-03-02'), (7, 'Meera', '2025-01-09'), (8, 'Meera', '2025-02-14'), (9, 'Meera', '2025-03-30'), (10, 'Meera', '2025-03-31'),
    (11, 'Kiran', '2025-02-20'), (12, 'Kiran', '2025-03-05'), (13, 'Dev', '2025-01-20'), (14, 'Dev', '2025-02-01'), (15, 'Dev', '2025-03-01'),
    (16, 'Dev', '2025-04-02')
)
SELECT customer, COUNT(*) AS orders_in_quarter
FROM orders
WHERE ordered_on BETWEEN '2025-01-01' AND '2025-03-31'
GROUP BY customer
HAVING COUNT(DISTINCT strftime('%m', ordered_on)) = 3
ORDER BY customer;
```

## Expected result

| customer | orders_in_quarter |
| --- | --- |
| Asha | 3 |
| Dev | 3 |
| Meera | 4 |

## Explanation

"Customers who did X in every period" is relational division: each customer must match every member of a set. With months, counting the **distinct** months per customer and requiring all three is the simplest form. Asha, Dev and Meera each ordered in January, February and March; Meera's two March orders count as one month.

Ravi placed three orders, but two were in January and none in February, so he does not qualify. Dev's April order is outside the quarter and filtered out before counting, which matters: counting it would not change his months, but counting orders instead of months would let Ravi through.

**Common mistake:** `HAVING COUNT(*) >= 3`. That counts orders, not months, so Ravi's three orders in two months qualify him.

## Wrong answers

Feedback: extra-rows

```sql
WITH orders(order_id, customer, ordered_on) AS ( VALUES (1, 'Asha', '2025-01-04'), (2, 'Asha', '2025-02-11'), (3, 'Asha', '2025-03-19'), (4, 'Ravi', '2025-01-15'), (5, 'Ravi', '2025-01-28'), (6, 'Ravi', '2025-03-02'), (7, 'Meera', '2025-01-09'), (8, 'Meera', '2025-02-14'), (9, 'Meera', '2025-03-30'), (10, 'Meera', '2025-03-31'), (11, 'Kiran', '2025-02-20'), (12, 'Kiran', '2025-03-05'), (13, 'Dev', '2025-01-20'), (14, 'Dev', '2025-02-01'), (15, 'Dev', '2025-03-01'), (16, 'Dev', '2025-04-02') ) SELECT customer, COUNT(*) AS orders_in_quarter FROM orders WHERE ordered_on BETWEEN '2025-01-01' AND '2025-03-31' GROUP BY customer HAVING COUNT(*) >= 3 ORDER BY customer;
```
