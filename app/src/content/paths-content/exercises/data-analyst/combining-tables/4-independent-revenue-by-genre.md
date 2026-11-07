---
id: da-revenue-by-genre
title: Revenue by genre
order: 4
difficulty: intermediate
topic: JOIN and GROUP BY
summary: Join three tables and group the result to report revenue for each genre, without cancelled orders.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - orders
  - order_items
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Join three tables
  - Calculate revenue per group
  - Leave out cancelled orders
---

## Task

The manager asks: "How much revenue did each genre bring in?" Return:

- `genre`
- `revenue`: the total of `quantity * unit_price` for that genre, rounded to 2 decimal places

Do **not** count cancelled orders. Row order does not matter.

## Starter query

```sql
SELECT *
FROM order_items;
```

## Hints

1. Revenue comes from `order_items`, the genre from `books`, and the order status from `orders`. You need all three.
2. Join `order_items` to `books` on `book_id` and to `orders` on `order_id`, then group by `genre`.
3. Add `WHERE o.status <> 'cancelled'` and `ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue`.

## Solution

```sql
SELECT b.genre, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue
FROM order_items AS oi
JOIN books AS b ON oi.book_id = b.id
JOIN orders AS o ON oi.order_id = o.id
WHERE o.status <> 'cancelled'
GROUP BY b.genre;
```

## Expected result

| genre | revenue |
| --- | --- |
| Fantasy | 57.75 |
| Mystery | 27.74 |
| Science | 29.97 |
| Science fiction | 18 |

## Explanation

Each order line is matched to its book (for the genre) and its order (for the status). The cancelled order 4 is removed before grouping, so its copy of *The Silent Orchard* does not count. `SUM` then adds up the line values within each genre.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT b.genre, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue FROM order_items AS oi JOIN books AS b ON oi.book_id = b.id GROUP BY b.genre;
```
