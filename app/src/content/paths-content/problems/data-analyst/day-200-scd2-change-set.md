---
id: da-day-200
title: Prepare a type 2 dimension update
order: 200
difficulty: advanced
topic: Data engineering
summary: Compare today's extract with the current dimension rows and list the rows to close and to insert.
module: data-analyst
duration: 15
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Detect type 2 dimension changes
  - Compare only current rows with an extract
prerequisites:
  - Day 168
  - Day 160
---

## Task

`dim_product` keeps history (type 2): each change closes the current row (`valid_to` set) and inserts a new one. Today is **2025-03-01**; today's full extract is in `extract_today`. Prepare the change set, without changing anything:

- **close**: a current row (`valid_to IS NULL`) whose product changed category or price, or that is missing from today's extract (discontinued); it gets `valid_to = '2025-03-01'`,
- **insert**: a new current row for every product that changed or is new in the extract, with `valid_from = '2025-03-01'`.

Unchanged products need nothing. Return `action`, `product_id`, `category`, `price` (the closed row's old values, or the inserted row's new values) and `effective` (`'2025-03-01'`). Sort by `product_id`, closes before inserts.

## Starter query

```sql
WITH dim_product(product_id, category, price, valid_from, valid_to) AS (
  VALUES
    (1, 'Books', 10.0, '2025-01-01', NULL),
    (2, 'Games', 25.0, '2025-01-01', '2025-02-01'), (2, 'Games', 27.0, '2025-02-01', NULL),
    (3, 'Toys', 8.0, '2025-01-01', NULL),
    (4, 'Books', 15.0, '2025-01-01', NULL)
),
extract_today(product_id, category, price) AS (
  VALUES (1, 'Books', 10.0), (2, 'Games', 29.0), (3, 'Kids', 8.0), (5, 'Games', 40.0)
)
SELECT product_id, category, price, valid_from, valid_to
FROM dim_product
ORDER BY product_id, valid_from;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Compare only **current** rows (`valid_to IS NULL`) with the extract, using a `FULL OUTER JOIN` on `product_id` and `IS NOT` for the columns.
3. Closes: current rows that are missing from the extract or changed. Inserts: extract rows that are new or changed. Combine with `UNION ALL` in a CTE, and sort the outer query by `product_id, action = 'insert'`.

## Solution

```sql
WITH dim_product(product_id, category, price, valid_from, valid_to) AS (
  VALUES
    (1, 'Books', 10.0, '2025-01-01', NULL),
    (2, 'Games', 25.0, '2025-01-01', '2025-02-01'), (2, 'Games', 27.0, '2025-02-01', NULL),
    (3, 'Toys', 8.0, '2025-01-01', NULL),
    (4, 'Books', 15.0, '2025-01-01', NULL)
),
extract_today(product_id, category, price) AS (
  VALUES (1, 'Books', 10.0), (2, 'Games', 29.0), (3, 'Kids', 8.0), (5, 'Games', 40.0)
),
current_rows AS (
  SELECT product_id, category, price FROM dim_product WHERE valid_to IS NULL
),
compared AS (
  SELECT c.product_id AS old_id, c.category AS old_category, c.price AS old_price,
         e.product_id AS new_id, e.category AS new_category, e.price AS new_price
  FROM current_rows AS c
  FULL OUTER JOIN extract_today AS e ON e.product_id = c.product_id
),
changes AS (
  SELECT 'close' AS action, old_id AS product_id, old_category AS category, old_price AS price
  FROM compared
  WHERE old_id IS NOT NULL AND (new_id IS NULL OR old_category IS NOT new_category OR old_price IS NOT new_price)
  UNION ALL
  SELECT 'insert', new_id, new_category, new_price
  FROM compared
  WHERE new_id IS NOT NULL AND (old_id IS NULL OR old_category IS NOT new_category OR old_price IS NOT new_price)
)
SELECT action, product_id, category, price, '2025-03-01' AS effective
FROM changes
ORDER BY product_id, action = 'insert';
```

## Expected result

| action | product_id | category | price | effective |
| --- | --- | --- | --- | --- |
| close | 2 | Games | 27 | 2025-03-01 |
| insert | 2 | Games | 29 | 2025-03-01 |
| close | 3 | Toys | 8 | 2025-03-01 |
| insert | 3 | Kids | 8 | 2025-03-01 |
| close | 4 | Books | 15 | 2025-03-01 |
| insert | 5 | Games | 40 | 2025-03-01 |

## Explanation

A type 2 update never overwrites history: product 2's price went from 25 to 27 in February and is now 29, and each price stays queryable for the dates it applied. Computing the change set as a query first (and only then applying it) makes the load reviewable and repeatable.

Only **current** rows take part: product 2's closed January row must not be compared with today's extract, or it would look "changed" every day forever. Product 3 changed category, so it is closed and re-inserted; product 4 is missing from a full extract, so it is closed with no replacement; product 5 is new and only inserted; product 1 is unchanged and absent from the change set.

**Common mistake:** comparing the extract with every dimension row instead of only current ones, which produces a spurious close for product 2's already-closed row.

## Wrong answers

Feedback: extra-rows

```sql
WITH dim_product(product_id, category, price, valid_from, valid_to) AS ( VALUES (1, 'Books', 10.0, '2025-01-01', NULL), (2, 'Games', 25.0, '2025-01-01', '2025-02-01'), (2, 'Games', 27.0, '2025-02-01', NULL), (3, 'Toys', 8.0, '2025-01-01', NULL), (4, 'Books', 15.0, '2025-01-01', NULL) ), extract_today(product_id, category, price) AS ( VALUES (1, 'Books', 10.0), (2, 'Games', 29.0), (3, 'Kids', 8.0), (5, 'Games', 40.0) ), compared AS (SELECT c.product_id AS old_id, c.category AS old_category, c.price AS old_price, e.product_id AS new_id, e.category AS new_category, e.price AS new_price FROM dim_product AS c FULL OUTER JOIN extract_today AS e ON e.product_id = c.product_id), changes AS (SELECT 'close' AS action, old_id AS product_id, old_category AS category, old_price AS price FROM compared WHERE old_id IS NOT NULL AND (new_id IS NULL OR old_category IS NOT new_category OR old_price IS NOT new_price) UNION ALL SELECT 'insert', new_id, new_category, new_price FROM compared WHERE new_id IS NOT NULL AND (old_id IS NULL OR old_category IS NOT new_category OR old_price IS NOT new_price)) SELECT DISTINCT action, product_id, category, price, '2025-03-01' AS effective FROM changes ORDER BY product_id, action = 'insert';
```
