---
id: da-large-orders
title: Orders worth more than 30
order: 2
difficulty: intermediate
topic: CTE
summary: Use a CTE that totals each order, then keep only the large ones.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Read and complete a WITH query
  - Filter the result of a CTE
---

## Task

Return the orders whose total value is **more than 30**, with:

- `order_id`
- `total`: the order's value (`quantity * unit_price` summed over its lines), rounded to 2 decimal places

Count every order, whatever its status. Row order does not matter.

**Steps**

1. The starter query's CTE, `order_totals`, already calculates each order's total. Run it to see the result.
2. In the main query, keep only the rows where `total > 30`.

## Starter query

```sql
WITH order_totals AS (
  SELECT order_id, ROUND(SUM(quantity * unit_price), 2) AS total
  FROM order_items
  GROUP BY order_id
)
SELECT order_id, total
FROM order_totals;
```

## Hints

1. The CTE behaves like a table called `order_totals`, with the columns `order_id` and `total`.
2. Filtering rows of that table is an ordinary `WHERE`.
3. Add `WHERE total > 30` after `FROM order_totals`.

## Solution

```sql
WITH order_totals AS (
  SELECT order_id, ROUND(SUM(quantity * unit_price), 2) AS total
  FROM order_items
  GROUP BY order_id
)
SELECT order_id, total
FROM order_totals
WHERE total > 30;
```

## Expected result

| order_id | total |
| --- | --- |
| 1 | 32.97 |
| 5 | 45.75 |

## Explanation

The CTE groups the order lines by order and adds them up. Because the totals already exist in `order_totals`, the main query can filter them with a plain `WHERE`, with no `HAVING` needed.

## Other accepted answers

```sql
SELECT order_id, ROUND(SUM(quantity * unit_price), 2) AS total FROM order_items GROUP BY order_id HAVING SUM(quantity * unit_price) > 30;
```
