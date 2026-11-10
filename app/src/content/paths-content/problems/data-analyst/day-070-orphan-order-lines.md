---
id: da-day-070
title: Order lines for books that do not exist
order: 70
difficulty: intermediate
topic: Data quality
summary: Check imported rows against a reference table with a LEFT JOIN.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Find rows with no match in a reference table
prerequisites:
  - Day 31
---

## Task

Before loading new order lines (in the starter query) into the database, check them. Return the `order_id` and `book_id` of every staged line whose book is **not** in the `books` table. Row order does not matter.

## Starter query

```sql
WITH staged_lines(order_id, book_id, quantity) AS (
  VALUES (7, 2, 1), (7, 9, 1), (8, 4, 2), (8, 12, 1), (9, 3, 1)
)
SELECT order_id, book_id, quantity
FROM staged_lines;
```

## Hints

1. Keep the `WITH staged_lines ...` part; add your own `SELECT`.
2. `LEFT JOIN books AS b ON b.id = s.book_id` keeps every staged line; lines without a book have `NULL` in every `b` column.
3. `... LEFT JOIN books AS b ON b.id = s.book_id WHERE b.id IS NULL`

## Solution

```sql
WITH staged_lines(order_id, book_id, quantity) AS (
  VALUES (7, 2, 1), (7, 9, 1), (8, 4, 2), (8, 12, 1), (9, 3, 1)
)
SELECT s.order_id, s.book_id
FROM staged_lines AS s
LEFT JOIN books AS b ON b.id = s.book_id
WHERE b.id IS NULL;
```

## Expected result

| order_id | book_id |
| --- | --- |
| 7 | 9 |
| 8 | 12 |

## Explanation

Books 9 and 12 do not exist, so those two lines would create order lines pointing at nothing. Checking a batch against reference tables before loading it is much cheaper than finding the broken rows in reports later.

## Other accepted answers

```sql
WITH staged_lines(order_id, book_id, quantity) AS (   VALUES (7, 2, 1), (7, 9, 1), (8, 4, 2), (8, 12, 1), (9, 3, 1) ) SELECT order_id, book_id FROM staged_lines WHERE book_id NOT IN (SELECT id FROM books);
```

## Wrong answers

Feedback: extra-rows

```sql
WITH staged_lines(order_id, book_id, quantity) AS (   VALUES (7, 2, 1), (7, 9, 1), (8, 4, 2), (8, 12, 1), (9, 3, 1) ) SELECT order_id, book_id FROM staged_lines;
```
