---
id: da-day-094
title: Order lines that did not use the list price
order: 94
difficulty: advanced
topic: Joins
summary: Find the price that was valid on the order date (an "as-of" join) and compare.
module: data-analyst
duration: 14
dataset: bookstore
tables:
  - orders
  - order_items
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Match each row to the value valid on its date
  - Compare a correlated subquery result with a column
prerequisites:
  - Day 24
  - Day 72
---

## Task

Prices change over time, so the price list (in the starter query) has a `valid_from` date for each price. A price applies **from its `valid_from` date onwards**, until a later price for the same book starts. A price that starts on the order date applies to that order.

Finance wants the non-cancelled order lines whose `unit_price` differs from the list price valid on the order date. Return `order_id`, `title`, `unit_price` and `list_price`. Sort by `order_id`, then `title`.

## Starter query

```sql
WITH price_list(book_id, valid_from, price) AS (
  VALUES
    (1, '2024-12-01', 12.99),
    (2, '2024-12-01', 14.50), (2, '2025-01-20', 15.50),
    (3, '2024-12-01', 9.99),
    (4, '2024-12-01', 18.00),
    (5, '2024-12-01', 11.25), (5, '2025-02-10', 10.50),
    (6, '2024-12-01', 14.75), (6, '2025-03-01', 13.75)
)
SELECT o.id AS order_id, o.order_date, oi.book_id, oi.unit_price
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled';
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. The starter query already lists every non-cancelled order line with its date.
2. For one line, the valid price is the one with the latest `valid_from` that is on or before the order date: a correlated subquery with `WHERE p.book_id = oi.book_id AND p.valid_from <= o.order_date ORDER BY p.valid_from DESC LIMIT 1`.
3. Put the lines with their `list_price` in a CTE, then keep the rows `WHERE unit_price <> list_price` and join `books` for the title.

## Solution

```sql
WITH price_list(book_id, valid_from, price) AS (
  VALUES
    (1, '2024-12-01', 12.99),
    (2, '2024-12-01', 14.50), (2, '2025-01-20', 15.50),
    (3, '2024-12-01', 9.99),
    (4, '2024-12-01', 18.00),
    (5, '2024-12-01', 11.25), (5, '2025-02-10', 10.50),
    (6, '2024-12-01', 14.75), (6, '2025-03-01', 13.75)
),
priced_lines AS (
  SELECT o.id AS order_id, oi.book_id, oi.unit_price,
    (SELECT p.price
     FROM price_list AS p
     WHERE p.book_id = oi.book_id AND p.valid_from <= o.order_date
     ORDER BY p.valid_from DESC
     LIMIT 1) AS list_price
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
)
SELECT pl.order_id, b.title, pl.unit_price, pl.list_price
FROM priced_lines AS pl
JOIN books AS b ON b.id = pl.book_id
WHERE pl.unit_price <> pl.list_price
ORDER BY pl.order_id, b.title;
```

## Expected result

| order_id | title | unit_price | list_price |
| --- | --- | --- | --- |
| 2 | Rivers of Glass | 15.5 | 14.5 |
| 5 | A Quiet Ledger | 14.75 | 13.75 |

## Explanation

This is an **as-of join**: each order line is matched to the price that was in force on its date, not to the newest price. The subquery picks the latest `valid_from` on or before the order date.

Order 2 (18 January) paid 15.50 although the price only rose to 15.50 on 20 January. Order 5 (1 March) paid 14.75 on the day the new price of 13.75 started. Order 3 bought *Paper Lanterns* on 5 February, before its price cut on 10 February, so it is correct.

**Common mistake:** writing `valid_from < order_date`. A price that starts on the order date then looks like it had not started yet, and order 5's overcharge is missed.

## Other accepted answers

```sql
WITH price_list(book_id, valid_from, price) AS (
  VALUES
    (1, '2024-12-01', 12.99),
    (2, '2024-12-01', 14.50), (2, '2025-01-20', 15.50),
    (3, '2024-12-01', 9.99),
    (4, '2024-12-01', 18.00),
    (5, '2024-12-01', 11.25), (5, '2025-02-10', 10.50),
    (6, '2024-12-01', 14.75), (6, '2025-03-01', 13.75)
),
matches AS (
  SELECT o.id AS order_id, oi.book_id, oi.unit_price, p.price,
    ROW_NUMBER() OVER (PARTITION BY o.id, oi.book_id ORDER BY p.valid_from DESC) AS rn
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  JOIN price_list AS p ON p.book_id = oi.book_id AND p.valid_from <= o.order_date
  WHERE o.status <> 'cancelled'
)
SELECT m.order_id, b.title, m.unit_price, m.price AS list_price
FROM matches AS m
JOIN books AS b ON b.id = m.book_id
WHERE m.rn = 1 AND m.unit_price <> m.price
ORDER BY m.order_id, b.title;
```

## Wrong answers

Feedback: missing-rows

```sql
WITH price_list(book_id, valid_from, price) AS ( VALUES (1, '2024-12-01', 12.99), (2, '2024-12-01', 14.50), (2, '2025-01-20', 15.50), (3, '2024-12-01', 9.99), (4, '2024-12-01', 18.00), (5, '2024-12-01', 11.25), (5, '2025-02-10', 10.50), (6, '2024-12-01', 14.75), (6, '2025-03-01', 13.75) ), priced_lines AS (SELECT o.id AS order_id, oi.book_id, oi.unit_price, (SELECT p.price FROM price_list AS p WHERE p.book_id = oi.book_id AND p.valid_from < o.order_date ORDER BY p.valid_from DESC LIMIT 1) AS list_price FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled') SELECT pl.order_id, b.title, pl.unit_price, pl.list_price FROM priced_lines AS pl JOIN books AS b ON b.id = pl.book_id WHERE pl.unit_price <> pl.list_price ORDER BY pl.order_id, b.title;
```
