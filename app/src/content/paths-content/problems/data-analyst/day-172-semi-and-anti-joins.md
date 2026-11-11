---
id: da-day-172
title: EXISTS, NOT EXISTS and the NOT IN trap
order: 172
difficulty: intermediate
topic: Query performance
summary: Write semi-joins and anti-joins that neither duplicate rows nor break on NULLs.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Write semi- and anti-joins with EXISTS
  - Avoid NOT IN with NULLs
prerequisites:
  - Day 31
  - Day 70
---

## Task

For each product (in the starter query), return `name`, `orders` (the number of **different** orders that include it) and `status`: `'ordered'` if it appears in at least one order line, otherwise `'never ordered'`. Some order lines are custom items with no product (`product_id` is `NULL`), and some orders list a product twice. Sort by `name`.

## Starter query

```sql
WITH products(id, name) AS (
  VALUES (1, 'Pen'), (2, 'Notebook'), (3, 'Stapler'), (4, 'Marker'), (5, 'Eraser')
),
order_lines(order_id, product_id) AS (
  VALUES ('o1', 1), ('o1', 1), ('o2', 1), ('o2', 2), ('o3', NULL), ('o4', 4), ('o4', 4), ('o5', NULL)
)
SELECT p.id, p.name, l.order_id
FROM products AS p
LEFT JOIN order_lines AS l ON l.product_id = p.id
ORDER BY p.id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Status: `CASE WHEN EXISTS (SELECT 1 FROM order_lines AS l WHERE l.product_id = p.id) THEN 'ordered' ELSE 'never ordered' END`. `EXISTS` stops at the first match and never duplicates rows.
3. Orders: `(SELECT COUNT(DISTINCT l.order_id) FROM order_lines AS l WHERE l.product_id = p.id)`. Avoid `NOT IN (SELECT product_id ...)`: with a `NULL` in the list it is never true.

## Solution

```sql
WITH products(id, name) AS (
  VALUES (1, 'Pen'), (2, 'Notebook'), (3, 'Stapler'), (4, 'Marker'), (5, 'Eraser')
),
order_lines(order_id, product_id) AS (
  VALUES ('o1', 1), ('o1', 1), ('o2', 1), ('o2', 2), ('o3', NULL), ('o4', 4), ('o4', 4), ('o5', NULL)
)
SELECT p.name,
  (SELECT COUNT(DISTINCT l.order_id) FROM order_lines AS l WHERE l.product_id = p.id) AS orders,
  CASE WHEN EXISTS (SELECT 1 FROM order_lines AS l WHERE l.product_id = p.id) THEN 'ordered' ELSE 'never ordered' END AS status
FROM products AS p
ORDER BY p.name;
```

## Expected result

| name | orders | status |
| --- | --- | --- |
| Eraser | 0 | never ordered |
| Marker | 1 | ordered |
| Notebook | 1 | ordered |
| Pen | 2 | ordered |
| Stapler | 0 | never ordered |

## Explanation

A **semi-join** ("has at least one match") and an **anti-join** ("has none") are the most common subquery patterns. `EXISTS` expresses them directly. The database can stop at the first match, and the result never has more rows than `products`, unlike a `JOIN`, which repeats a product once per matching line (the Pen would appear three times).

`NOT IN` has a trap. `p.id NOT IN (1, 1, 1, 2, NULL, 4, 4, NULL)` means `p.id <> 1 AND ... AND p.id <> NULL`, and the comparison with `NULL` is unknown, so the whole test is never true. A query using it reports **no** product as never ordered, even though nobody ever bought the Stapler or the Eraser. `NOT EXISTS` and `EXISTS` ignore `NULL`s.

**Common mistake:** `CASE WHEN p.id NOT IN (SELECT product_id FROM order_lines) ...`, which marks every product as ordered.

## Wrong answers

Feedback: incorrect-output

```sql
WITH products(id, name) AS ( VALUES (1, 'Pen'), (2, 'Notebook'), (3, 'Stapler'), (4, 'Marker'), (5, 'Eraser') ), order_lines(order_id, product_id) AS ( VALUES ('o1', 1), ('o1', 1), ('o2', 1), ('o2', 2), ('o3', NULL), ('o4', 4), ('o4', 4), ('o5', NULL) ) SELECT p.name, (SELECT COUNT(DISTINCT l.order_id) FROM order_lines AS l WHERE l.product_id = p.id) AS orders, CASE WHEN p.id NOT IN (SELECT product_id FROM order_lines) THEN 'never ordered' ELSE 'ordered' END AS status FROM products AS p ORDER BY p.name;
```

Feedback: incorrect-output

```sql
WITH products(id, name) AS ( VALUES (1, 'Pen'), (2, 'Notebook'), (3, 'Stapler'), (4, 'Marker'), (5, 'Eraser') ), order_lines(order_id, product_id) AS ( VALUES ('o1', 1), ('o1', 1), ('o2', 1), ('o2', 2), ('o3', NULL), ('o4', 4), ('o4', 4), ('o5', NULL) ) SELECT p.name, COUNT(l.order_id) AS orders, CASE WHEN COUNT(l.order_id) > 0 THEN 'ordered' ELSE 'never ordered' END AS status FROM products AS p LEFT JOIN order_lines AS l ON l.product_id = p.id GROUP BY p.id, p.name ORDER BY p.name;
```
