---
id: da-day-033
title: Genres with no sales in March
order: 33
difficulty: intermediate
topic: Set operations
summary: Subtract one list from another with EXCEPT.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - books
  - orders
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Subtract one result from another with EXCEPT
prerequisites:
  - Day 32
  - Day 16
---

## Task

Merchandising wants the genres that sold **nothing in March 2025** (orders of any status). Return `genre`. Use `EXCEPT`. Row order does not matter.

## Starter query

```sql
SELECT DISTINCT genre
FROM books;
```

## Hints

1. Write two lists: every genre, and the genres sold in March.
2. `EXCEPT` keeps the rows of the first query that are not in the second.
3. Second list: join `books`, `order_items` and `orders` and filter `o.order_date LIKE '2025-03%'`.

## Solution

```sql
SELECT genre FROM books
EXCEPT
SELECT b.genre
FROM books AS b
JOIN order_items AS oi ON oi.book_id = b.id
JOIN orders AS o ON o.id = oi.order_id
WHERE o.order_date LIKE '2025-03%';
```

## Expected result

| genre |
| --- |
| Science fiction |

## Explanation

March orders contained fantasy, mystery and science books, so only Science fiction is left. `EXCEPT`, like `UNION`, also removes duplicates, which is why the first list needs no `DISTINCT`.

## Wrong answers

Feedback: extra-rows

```sql
SELECT DISTINCT genre FROM books;
```
