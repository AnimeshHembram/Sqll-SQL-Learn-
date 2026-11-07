---
id: da-genre-revenue-split
title: Delivered and in-transit revenue by genre
order: 4
difficulty: intermediate
topic: Conditional aggregation
summary: Total two kinds of revenue side by side for each genre with SUM and CASE.
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
  - Total an amount only for rows that meet a condition
  - Combine joins, grouping and conditional totals
---

## Task

Finance wants, for each genre that has been ordered:

- `genre`
- `delivered`: revenue (`quantity * unit_price`) from `'delivered'` orders, rounded to 2 decimal places
- `in_transit`: revenue from `'shipped'` orders, rounded to 2 decimal places

Cancelled orders count in neither column. Row order does not matter.

## Starter query

```sql
SELECT b.genre, o.status, oi.quantity * oi.unit_price AS line_total
FROM order_items AS oi
JOIN books AS b ON oi.book_id = b.id
JOIN orders AS o ON oi.order_id = o.id;
```

## Hints

1. The starter query shows every line with its genre and status. Now you need one row per genre.
2. Inside `SUM`, return the line total when the status matches and 0 otherwise.
3. `ROUND(SUM(CASE WHEN o.status = 'delivered' THEN oi.quantity * oi.unit_price ELSE 0 END), 2) AS delivered`, the same for `'shipped'`, then `GROUP BY b.genre`.

## Solution

```sql
SELECT b.genre,
  ROUND(SUM(CASE WHEN o.status = 'delivered' THEN oi.quantity * oi.unit_price ELSE 0 END), 2) AS delivered,
  ROUND(SUM(CASE WHEN o.status = 'shipped' THEN oi.quantity * oi.unit_price ELSE 0 END), 2) AS in_transit
FROM order_items AS oi
JOIN books AS b ON oi.book_id = b.id
JOIN orders AS o ON oi.order_id = o.id
GROUP BY b.genre;
```

## Expected result

| genre | delivered | in_transit |
| --- | --- | --- |
| Fantasy | 46.5 | 11.25 |
| Mystery | 27.74 | 0 |
| Science | 19.98 | 9.99 |
| Science fiction | 0 | 18 |

## Explanation

Each order line contributes its value to exactly one of the two columns, or to neither if its order was cancelled. Grouping by genre adds up those contributions. Mystery's cancelled copy of *The Silent Orchard* is in neither column.
