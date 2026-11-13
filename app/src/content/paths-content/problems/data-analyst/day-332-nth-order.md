---
id: da-day-332
title: Each customer's third order
order: 332
difficulty: intermediate
topic: Interview practice
summary: Pick the nth order per customer with ROW_NUMBER and a deterministic tie-break.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Pick the nth row per group
  - Break ties deterministically
prerequisites:
  - Day 38
  - Day 105
---

## Task

For each customer who placed **at least three orders** (starter query), return their **third** order: `customer`, `order_id`, `ordered_on` and `amount`. Orders on the same day are ordered by `order_id`. Sort by `customer`.

## Starter query

```sql
WITH orders(order_id, customer, ordered_on, amount) AS (
  VALUES
    (1, 'Asha', '2025-01-04', 500), (2, 'Asha', '2025-01-20', 300), (3, 'Asha', '2025-02-11', 450), (4, 'Asha', '2025-03-19', 600),
    (5, 'Ravi', '2025-01-15', 200), (6, 'Ravi', '2025-01-15', 250), (7, 'Ravi', '2025-02-03', 400), (8, 'Meera', '2025-01-09', 800),
    (9, 'Meera', '2025-02-14', 150), (10, 'Kiran', '2025-02-20', 700)
)
SELECT customer, order_id, ordered_on, amount
FROM orders
ORDER BY customer, ordered_on, order_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `ROW_NUMBER() OVER (PARTITION BY customer ORDER BY ordered_on, order_id)` numbers each customer's orders; the tie-break makes same-day orders deterministic.
3. Keep row number 3. Customers with fewer orders simply have no row 3.

## Solution

```sql
WITH orders(order_id, customer, ordered_on, amount) AS (
  VALUES
    (1, 'Asha', '2025-01-04', 500), (2, 'Asha', '2025-01-20', 300), (3, 'Asha', '2025-02-11', 450), (4, 'Asha', '2025-03-19', 600),
    (5, 'Ravi', '2025-01-15', 200), (6, 'Ravi', '2025-01-15', 250), (7, 'Ravi', '2025-02-03', 400), (8, 'Meera', '2025-01-09', 800),
    (9, 'Meera', '2025-02-14', 150), (10, 'Kiran', '2025-02-20', 700)
),
numbered AS (
  SELECT customer, order_id, ordered_on, amount,
    ROW_NUMBER() OVER (PARTITION BY customer ORDER BY ordered_on, order_id) AS n
  FROM orders
)
SELECT customer, order_id, ordered_on, amount
FROM numbered
WHERE n = 3
ORDER BY customer;
```

## Expected result

| customer | order_id | ordered_on | amount |
| --- | --- | --- | --- |
| Asha | 3 | 2025-02-11 | 450 |
| Ravi | 7 | 2025-02-03 | 400 |

## Explanation

Picking the nth row per group is `ROW_NUMBER()` partitioned by the group and filtered to n. The tie-break is part of the answer: Ravi's first two orders were on the same day, and ordering by `order_id` as well makes "third order" well defined. His third order is order 7 on 3 February.

Meera and Kiran placed fewer than three orders, so they simply have no row 3 and do not appear; no `HAVING` is needed. Interviewers often follow up with "and what if they want the second-highest amount?", which is the same pattern with a different `ORDER BY`.

**Common mistake:** `DENSE_RANK()` over the date alone. Ravi's two same-day orders share rank 1, so his order 7 becomes "second", and his third order is reported as something else or not at all.

## Wrong answers

Feedback: missing-rows

```sql
WITH orders(order_id, customer, ordered_on, amount) AS ( VALUES (1, 'Asha', '2025-01-04', 500), (2, 'Asha', '2025-01-20', 300), (3, 'Asha', '2025-02-11', 450), (4, 'Asha', '2025-03-19', 600), (5, 'Ravi', '2025-01-15', 200), (6, 'Ravi', '2025-01-15', 250), (7, 'Ravi', '2025-02-03', 400), (8, 'Meera', '2025-01-09', 800), (9, 'Meera', '2025-02-14', 150), (10, 'Kiran', '2025-02-20', 700) ), numbered AS (SELECT customer, order_id, ordered_on, amount, DENSE_RANK() OVER (PARTITION BY customer ORDER BY ordered_on) AS n FROM orders) SELECT customer, MIN(order_id) AS order_id, MIN(ordered_on) AS ordered_on, MIN(amount) AS amount FROM numbered WHERE n = 3 GROUP BY customer ORDER BY customer;
```
