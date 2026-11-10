---
id: da-latest-order-per-book
title: The latest order for each book
order: 4
difficulty: advanced
topic: Latest row per group
summary: Find the most recent order containing each book, including that order's status.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - books
  - orders
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Return the latest row per group with its details
---

## Task

Stock planners want to know when each book was last ordered and whether that order went through. For every book that has been ordered (any status), return `title`, `order_id`, `order_date` and `status` of its **most recent** order. Row order does not matter.

## Starter query

```sql
SELECT b.title, o.id AS order_id, o.order_date, o.status
FROM order_items AS oi
JOIN orders AS o ON o.id = oi.order_id
JOIN books AS b ON b.id = oi.book_id;
```

## Hints

1. The starter query has one row per book and order. Number each book's orders from newest to oldest.
2. Partition by the book: `ROW_NUMBER() OVER (PARTITION BY b.id ORDER BY o.order_date DESC, o.id DESC)`.
3. Keep number 1 in the outer query.

## Solution

```sql
WITH ranked AS (
  SELECT b.title, o.id AS order_id, o.order_date, o.status,
    ROW_NUMBER() OVER (PARTITION BY b.id ORDER BY o.order_date DESC, o.id DESC) AS rn
  FROM order_items AS oi
  JOIN orders AS o ON o.id = oi.order_id
  JOIN books AS b ON b.id = oi.book_id
)
SELECT title, order_id, order_date, status
FROM ranked
WHERE rn = 1;
```

## Expected result

| title | order_id | order_date | status |
| --- | --- | --- | --- |
| The Silent Orchard | 4 | 2025-02-14 | cancelled |
| Rivers of Glass | 5 | 2025-03-01 | delivered |
| Counting Stars | 6 | 2025-03-09 | shipped |
| The Last Signal | 3 | 2025-02-05 | shipped |
| Paper Lanterns | 3 | 2025-02-05 | shipped |
| A Quiet Ledger | 5 | 2025-03-01 | delivered |

## Explanation

*The Silent Orchard* was last ordered on 14 February, and that order was cancelled: its last successful sale was in January. `MAX(o.order_date)` per book would show the date but hide that status, which is the useful part of the answer.

## Wrong answers

Feedback: extra-rows

```sql
SELECT b.title, o.id AS order_id, o.order_date, o.status FROM order_items AS oi JOIN orders AS o ON o.id = oi.order_id JOIN books AS b ON b.id = oi.book_id;
```
