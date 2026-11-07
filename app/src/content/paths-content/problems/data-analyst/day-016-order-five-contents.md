---
id: da-day-016
title: What's in order 5?
order: 16
difficulty: beginner
topic: Joins
summary: Look up the contents of one order with titles instead of ids.
module: data-analyst
duration: 5
dataset: bookstore
tables:
  - order_items
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Replace ids with names using a join
prerequisites:
  - Day 15
---

## Task

A customer calls about order **5**. Return the `title` and `quantity` of each book in that order. Row order does not matter.

## Starter query

```sql
SELECT book_id, quantity
FROM order_items
WHERE order_id = 5;
```

## Hints

1. The titles are in `books`; `order_items.book_id` points to `books.id`.
2. Join, keep the `WHERE`, and select the title.
3. `JOIN books AS b ON b.id = oi.book_id` and `SELECT b.title, oi.quantity`.

## Solution

```sql
SELECT b.title, oi.quantity
FROM order_items AS oi
JOIN books AS b ON b.id = oi.book_id
WHERE oi.order_id = 5;
```

## Expected result

| title | quantity |
| --- | --- |
| Rivers of Glass | 2 |
| A Quiet Ledger | 1 |

## Explanation

Order 5 has two lines: two copies of *Rivers of Glass* and one *A Quiet Ledger*. Joining replaces the id with something a person can read.
