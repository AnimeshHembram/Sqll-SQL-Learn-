---
id: da-day-078
title: Books bought together
order: 78
difficulty: advanced
topic: Segmentation
summary: Find pairs of items in the same order with a self-join: a simple basket analysis.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - order_items
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Pair items within the same group with a self-join
prerequisites:
  - Day 36
  - Day 17
---

## Task

For "frequently bought together" suggestions, return every pair of different books that appear **in the same order** (any status): `first_title` (lower book id), `second_title` and `orders_together` (how many orders contain both). Row order does not matter.

## Starter query

```sql
SELECT order_id, book_id
FROM order_items
ORDER BY order_id;
```

## Hints

1. Join `order_items` to itself on the same `order_id`.
2. Keep `a.book_id < b.book_id` so a book is not paired with itself and each pair appears once.
3. Join `books` twice for the titles and `GROUP BY` the pair, counting `COUNT(*) AS orders_together`.

## Solution

```sql
SELECT ba.title AS first_title, bb.title AS second_title, COUNT(*) AS orders_together
FROM order_items AS a
JOIN order_items AS b ON b.order_id = a.order_id AND a.book_id < b.book_id
JOIN books AS ba ON ba.id = a.book_id
JOIN books AS bb ON bb.id = b.book_id
GROUP BY a.book_id, b.book_id, ba.title, bb.title;
```

## Expected result

| first_title | second_title | orders_together |
| --- | --- | --- |
| The Silent Orchard | Counting Stars | 1 |
| Rivers of Glass | A Quiet Ledger | 1 |
| The Last Signal | Paper Lanterns | 1 |

## Explanation

Three orders contained two books, giving three pairs, each seen once. With more data, the pairs with the highest counts become recommendations. The same `a.id < b.id` trick from Day 36 prevents mirrored pairs.
