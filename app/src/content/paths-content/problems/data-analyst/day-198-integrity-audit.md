---
id: da-day-198
title: A referential integrity audit
order: 198
difficulty: advanced
topic: Data quality
summary: Run several integrity checks in one query and report every check, including the ones that pass.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Run several integrity checks in one report
  - Keep passing checks visible
prerequisites:
  - Day 70
  - Day 172
---

## Task

Before a migration, the data team runs integrity checks on the tables in the starter query (they have no foreign-key constraints). Report **every** check below with its number of failing rows, including checks that pass with 0:

1. `orders without customer`: orders whose `customer_id` is not in `customers`,
2. `items without order`: order items whose `order_id` is not in `orders`,
3. `items without product`: order items whose `product_id` is not in `products`,
4. `items with bad quantity`: order items with a quantity of 0 or less,
5. `payments without order`: payments whose `order_id` is not in `orders`,
6. `orders without items`: orders with no order items at all.

Return `check_no`, `check_name`, `failures` and `status` (`'pass'` or `'fail'`). Sort by `check_no`.

## Starter query

```sql
WITH customers(id) AS (VALUES (1), (2), (3)),
products(id) AS (VALUES (10), (11), (12)),
orders(id, customer_id) AS (VALUES (100, 1), (101, 2), (102, 9), (103, 3)),
order_items(order_id, product_id, quantity) AS (
  VALUES (100, 10, 1), (100, 11, 2), (101, 13, 1), (102, 11, 1), (104, 10, 1), (103, 12, 0), (103, 12, -1)
),
payments(id, order_id, amount) AS (VALUES (1, 100, 30), (2, 101, 12), (3, 105, 20))
SELECT 'orders' AS table_name, COUNT(*) AS row_count FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'payments', COUNT(*) FROM payments;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Each check is one `SELECT n, 'name', COUNT(*) FROM ... WHERE NOT EXISTS (...)`. A `COUNT(*)` without `GROUP BY` always returns one row, so passing checks still appear with 0.
3. Combine the six checks with `UNION ALL` in a CTE, then add `CASE WHEN failures = 0 THEN 'pass' ELSE 'fail' END` in the outer query.

## Solution

```sql
WITH customers(id) AS (VALUES (1), (2), (3)),
products(id) AS (VALUES (10), (11), (12)),
orders(id, customer_id) AS (VALUES (100, 1), (101, 2), (102, 9), (103, 3)),
order_items(order_id, product_id, quantity) AS (
  VALUES (100, 10, 1), (100, 11, 2), (101, 13, 1), (102, 11, 1), (104, 10, 1), (103, 12, 0), (103, 12, -1)
),
payments(id, order_id, amount) AS (VALUES (1, 100, 30), (2, 101, 12), (3, 105, 20)),
checks AS (
  SELECT 1 AS check_no, 'orders without customer' AS check_name, COUNT(*) AS failures
  FROM orders AS o WHERE NOT EXISTS (SELECT 1 FROM customers AS c WHERE c.id = o.customer_id)
  UNION ALL
  SELECT 2, 'items without order', COUNT(*)
  FROM order_items AS i WHERE NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.id = i.order_id)
  UNION ALL
  SELECT 3, 'items without product', COUNT(*)
  FROM order_items AS i WHERE NOT EXISTS (SELECT 1 FROM products AS p WHERE p.id = i.product_id)
  UNION ALL
  SELECT 4, 'items with bad quantity', COUNT(*)
  FROM order_items WHERE quantity <= 0
  UNION ALL
  SELECT 5, 'payments without order', COUNT(*)
  FROM payments AS p WHERE NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.id = p.order_id)
  UNION ALL
  SELECT 6, 'orders without items', COUNT(*)
  FROM orders AS o WHERE NOT EXISTS (SELECT 1 FROM order_items AS i WHERE i.order_id = o.id)
)
SELECT check_no, check_name, failures, CASE WHEN failures = 0 THEN 'pass' ELSE 'fail' END AS status
FROM checks
ORDER BY check_no;
```

## Expected result

| check_no | check_name | failures | status |
| --- | --- | --- | --- |
| 1 | orders without customer | 1 | fail |
| 2 | items without order | 1 | fail |
| 3 | items without product | 1 | fail |
| 4 | items with bad quantity | 2 | fail |
| 5 | payments without order | 1 | fail |
| 6 | orders without items | 0 | pass |

## Explanation

An audit report must show the checks that **passed** as well as those that failed; otherwise "no rows" is ambiguous between "all good" and "check didn't run". Each check here is a `COUNT(*)` with no `GROUP BY`, which always returns exactly one row, so all six appear.

The results tell a story: order 102 points at customer 9, who does not exist; item rows reference order 104 and product 13, which do not exist; order 103 has two impossible quantities; payment 3 is for an unknown order. Every order has items, so check 6 passes.

`NOT EXISTS` is the safe anti-join here: `NOT IN` would break if any of the referenced id columns contained a `NULL` (Day 172).

**Common mistake:** writing the checks as joins that return failing rows, then grouping by check name, which silently drops passing checks from the report.

## Wrong answers

Feedback: missing-rows

```sql
WITH customers(id) AS (VALUES (1), (2), (3)), products(id) AS (VALUES (10), (11), (12)), orders(id, customer_id) AS (VALUES (100, 1), (101, 2), (102, 9), (103, 3)), order_items(order_id, product_id, quantity) AS ( VALUES (100, 10, 1), (100, 11, 2), (101, 13, 1), (102, 11, 1), (104, 10, 1), (103, 12, 0), (103, 12, -1) ), payments(id, order_id, amount) AS (VALUES (1, 100, 30), (2, 101, 12), (3, 105, 20)), failing AS (SELECT 1 AS check_no, 'orders without customer' AS check_name FROM orders AS o WHERE NOT EXISTS (SELECT 1 FROM customers AS c WHERE c.id = o.customer_id) UNION ALL SELECT 2, 'items without order' FROM order_items AS i WHERE NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.id = i.order_id) UNION ALL SELECT 3, 'items without product' FROM order_items AS i WHERE NOT EXISTS (SELECT 1 FROM products AS p WHERE p.id = i.product_id) UNION ALL SELECT 4, 'items with bad quantity' FROM order_items WHERE quantity <= 0 UNION ALL SELECT 5, 'payments without order' FROM payments AS p WHERE NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.id = p.order_id) UNION ALL SELECT 6, 'orders without items' FROM orders AS o WHERE NOT EXISTS (SELECT 1 FROM order_items AS i WHERE i.order_id = o.id)) SELECT check_no, check_name, COUNT(*) AS failures, 'fail' AS status FROM failing GROUP BY check_no, check_name ORDER BY check_no;
```
