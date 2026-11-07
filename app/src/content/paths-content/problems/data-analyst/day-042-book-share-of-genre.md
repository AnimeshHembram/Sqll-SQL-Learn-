---
id: da-day-042
title: Each book's share of its genre
order: 42
difficulty: advanced
topic: Window functions
summary: Divide by a group total without collapsing the rows, using SUM() OVER (PARTITION BY ...).
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - books
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Divide by a group total with a partitioned window
prerequisites:
  - Day 40
  - Day 27
---

## Task

For each book that has sold (not counting cancelled orders), return `genre`, `title`, `revenue` (rounded to 2 decimal places) and `pct_of_genre`: the book's revenue as a percentage of its genre's revenue, rounded to 1 decimal place. Sort by `genre`, then `pct_of_genre` from highest to lowest.

## Starter query

```sql
SELECT b.genre, b.title, SUM(oi.quantity * oi.unit_price) AS revenue
FROM order_items AS oi
JOIN orders AS o ON o.id = oi.order_id
JOIN books AS b ON b.id = oi.book_id
WHERE o.status <> 'cancelled'
GROUP BY b.id, b.genre, b.title;
```

## Hints

1. Each book's genre total is `SUM(revenue) OVER (PARTITION BY genre)`. It keeps one row per book.
2. Put the starter query in a CTE, then divide: `100.0 * revenue / SUM(revenue) OVER (PARTITION BY genre)`.
3. Round at the end and `ORDER BY genre, pct_of_genre DESC`.

## Solution

```sql
WITH book_revenue AS (
  SELECT b.genre, b.title, SUM(oi.quantity * oi.unit_price) AS revenue
  FROM order_items AS oi
  JOIN orders AS o ON o.id = oi.order_id
  JOIN books AS b ON b.id = oi.book_id
  WHERE o.status <> 'cancelled'
  GROUP BY b.id, b.genre, b.title
)
SELECT genre, title, ROUND(revenue, 2) AS revenue,
  ROUND(100.0 * revenue / SUM(revenue) OVER (PARTITION BY genre), 1) AS pct_of_genre
FROM book_revenue
ORDER BY genre, pct_of_genre DESC;
```

## Expected result

| genre | title | revenue | pct_of_genre |
| --- | --- | --- | --- |
| Fantasy | Rivers of Glass | 46.5 | 80.5 |
| Fantasy | Paper Lanterns | 11.25 | 19.5 |
| Mystery | A Quiet Ledger | 14.75 | 53.2 |
| Mystery | The Silent Orchard | 12.99 | 46.8 |
| Science | Counting Stars | 29.97 | 100 |
| Science fiction | The Last Signal | 18 | 100 |

## Explanation

`PARTITION BY genre` makes the total restart for each genre while every book row stays. *Rivers of Glass* earns 80.5% of fantasy revenue; books that are alone in their genre have 100%.
