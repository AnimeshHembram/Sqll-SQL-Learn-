---
id: da-day-117
title: Case study: a reorder report from sales velocity
order: 117
difficulty: advanced
topic: Case studies
summary: Combine stock levels with recent sales to estimate days of cover and recommend an action.
module: data-analyst
duration: 16
dataset: bookstore
tables:
  - books
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Combine inventory and sales into an operational metric
  - Order CASE conditions by priority
prerequisites:
  - Day 100
  - Day 58
---

## Task

The buyer wants a weekly reorder report. Current stock is in the starter query. Using **non-cancelled orders in March 2025** (31 days) from the bookstore, return for every stocked book:

- `title`, `on_hand`, `march_units` (copies sold in March, 0 if none),
- `days_of_cover`: how many days the stock lasts at March's daily rate, `on_hand / (march_units / 31)`, rounded to 1 decimal place, or `NULL` without March sales,
- `action`, decided in this order: `'out of stock'` when `on_hand` is 0; `'review'` when there were no March sales; `'reorder'` when cover is under 35 days; otherwise `'ok'`.

Sort by `title`.

## Starter query

```sql
WITH stock(book_id, on_hand) AS (
  VALUES (1, 4), (2, 3), (3, 10), (4, 2), (5, 0), (6, 1)
)
SELECT s.book_id, b.title, s.on_hand
FROM stock AS s
JOIN books AS b ON b.id = s.book_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. In a CTE, add up March's units per book: non-cancelled orders with `order_date BETWEEN '2025-03-01' AND '2025-03-31'`. `LEFT JOIN` it to the stock so books without March sales stay.
3. Use `31.0` so the rate is not whole-number division: `ROUND(s.on_hand / (m.units / 31.0), 1)` is `NULL` when `m.units` is `NULL`. Check the `CASE` conditions in the order given, `on_hand = 0` first.

## Solution

```sql
WITH stock(book_id, on_hand) AS (
  VALUES (1, 4), (2, 3), (3, 10), (4, 2), (5, 0), (6, 1)
),
march_sales AS (
  SELECT oi.book_id, SUM(oi.quantity) AS units
  FROM order_items AS oi
  JOIN orders AS o ON o.id = oi.order_id
  WHERE o.status <> 'cancelled' AND o.order_date BETWEEN '2025-03-01' AND '2025-03-31'
  GROUP BY oi.book_id
)
SELECT b.title, s.on_hand,
  COALESCE(m.units, 0) AS march_units,
  ROUND(s.on_hand / (m.units / 31.0), 1) AS days_of_cover,
  CASE
    WHEN s.on_hand = 0 THEN 'out of stock'
    WHEN m.units IS NULL THEN 'review'
    WHEN s.on_hand / (m.units / 31.0) < 35 THEN 'reorder'
    ELSE 'ok'
  END AS action
FROM stock AS s
JOIN books AS b ON b.id = s.book_id
LEFT JOIN march_sales AS m ON m.book_id = s.book_id
ORDER BY b.title;
```

## Expected result

| title | on_hand | march_units | days_of_cover | action |
| --- | --- | --- | --- | --- |
| A Quiet Ledger | 1 | 1 | 31 | reorder |
| Counting Stars | 10 | 1 | 310 | ok |
| Paper Lanterns | 0 | 0 | NULL | out of stock |
| Rivers of Glass | 3 | 2 | 46.5 | ok |
| The Last Signal | 2 | 0 | NULL | review |
| The Silent Orchard | 4 | 0 | NULL | review |

## Explanation

**Days of cover** turns two numbers a buyer cannot compare (copies in stock, copies sold) into one they can act on. *A Quiet Ledger* sold one copy in March and has one left: 31 days of cover, under the 35-day threshold, so reorder. *Counting Stars* has 310 days of cover and needs nothing.

The order of the `CASE` branches is a business rule: *Paper Lanterns* has no stock **and** no March sales, and being out of stock is the more urgent message. Books without March sales get `'review'` rather than a misleading infinite cover.

**Common mistakes:** dividing by `31` instead of `31.0` (whole-number division turns a rate of 2/31 into 0), and an inner join to March sales, which drops three books from the report.

## Wrong answers

Feedback: missing-rows

```sql
WITH stock(book_id, on_hand) AS ( VALUES (1, 4), (2, 3), (3, 10), (4, 2), (5, 0), (6, 1) ), march_sales AS (SELECT oi.book_id, SUM(oi.quantity) AS units FROM order_items AS oi JOIN orders AS o ON o.id = oi.order_id WHERE o.status <> 'cancelled' AND o.order_date BETWEEN '2025-03-01' AND '2025-03-31' GROUP BY oi.book_id) SELECT b.title, s.on_hand, m.units AS march_units, ROUND(s.on_hand / (m.units / 31.0), 1) AS days_of_cover, CASE WHEN s.on_hand = 0 THEN 'out of stock' WHEN s.on_hand / (m.units / 31.0) < 35 THEN 'reorder' ELSE 'ok' END AS action FROM stock AS s JOIN books AS b ON b.id = s.book_id JOIN march_sales AS m ON m.book_id = s.book_id ORDER BY b.title;
```

Feedback: incorrect-output

```sql
WITH stock(book_id, on_hand) AS ( VALUES (1, 4), (2, 3), (3, 10), (4, 2), (5, 0), (6, 1) ), march_sales AS (SELECT oi.book_id, SUM(oi.quantity) AS units FROM order_items AS oi JOIN orders AS o ON o.id = oi.order_id WHERE o.status <> 'cancelled' AND o.order_date BETWEEN '2025-03-01' AND '2025-03-31' GROUP BY oi.book_id) SELECT b.title, s.on_hand, COALESCE(m.units, 0) AS march_units, ROUND(s.on_hand / (m.units / 31.0), 1) AS days_of_cover, CASE WHEN m.units IS NULL THEN 'review' WHEN s.on_hand = 0 THEN 'out of stock' WHEN s.on_hand / (m.units / 31.0) < 35 THEN 'reorder' ELSE 'ok' END AS action FROM stock AS s JOIN books AS b ON b.id = s.book_id LEFT JOIN march_sales AS m ON m.book_id = s.book_id ORDER BY b.title;
```
