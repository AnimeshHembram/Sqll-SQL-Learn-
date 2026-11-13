---
id: da-day-240
title: Case study: a catalogue review with an action per book
order: 240
difficulty: advanced
topic: Case studies
summary: Combine sales, buyers and recency for every book in the catalogue and recommend what to do with each.
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
  - Combine several measures per item
  - Turn measures into a recommendation
prerequisites:
  - Day 210
  - Day 117
---

## Task

The bookstore reviews its catalogue at the end of March 2025, looking at the last two months: **1 February to 31 March 2025**. For **every book**, using non-cancelled orders in that period only:

- `units`, `revenue` (rounded to 2 decimal places) and `buyers` (distinct customers), all 0 when unsold,
- `days_since_sale`: days from the book's latest sale in the period to **2025-03-31** (`NULL` when unsold),
- `action`: `'review'` when unsold in the period, `'promote'` when it sold 2 or more units and its latest sale was within 45 days, otherwise `'keep'`.

Return `title`, `genre`, `units`, `revenue`, `buyers`, `days_since_sale` and `action`, sorted by `revenue` from highest, then `title`.

## Starter query

```sql
SELECT b.title, o.order_date, o.status, oi.quantity
FROM books AS b
LEFT JOIN order_items AS oi ON oi.book_id = b.id
LEFT JOIN orders AS o ON o.id = oi.order_id
ORDER BY b.title;
```

## Hints

1. Aggregate sales per book in a CTE first (non-cancelled orders in the period, joined to their lines): units, revenue, `COUNT(DISTINCT o.customer_id)` and `MAX(o.order_date)`.
2. Start from `books` and `LEFT JOIN` that CTE so unsold books stay, with `COALESCE(..., 0)` for the counts. Days since sale: `CAST(julianday('2025-03-31') - julianday(last_sold) AS INTEGER)`.
3. Decide the action with `CASE`, testing the unsold case first.

## Solution

```sql
WITH sales AS (
  SELECT oi.book_id, SUM(oi.quantity) AS units, SUM(oi.quantity * oi.unit_price) AS revenue,
    COUNT(DISTINCT o.customer_id) AS buyers, MAX(o.order_date) AS last_sold
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled' AND o.order_date BETWEEN '2025-02-01' AND '2025-03-31'
  GROUP BY oi.book_id
)
SELECT b.title, b.genre, COALESCE(s.units, 0) AS units, ROUND(COALESCE(s.revenue, 0), 2) AS revenue, COALESCE(s.buyers, 0) AS buyers,
  CAST(julianday('2025-03-31') - julianday(s.last_sold) AS INTEGER) AS days_since_sale,
  CASE WHEN s.units IS NULL THEN 'review'
       WHEN s.units >= 2 AND julianday('2025-03-31') - julianday(s.last_sold) <= 45 THEN 'promote'
       ELSE 'keep' END AS action
FROM books AS b
LEFT JOIN sales AS s ON s.book_id = b.id
ORDER BY revenue DESC, b.title;
```

## Expected result

| title | genre | units | revenue | buyers | days_since_sale | action |
| --- | --- | --- | --- | --- | --- | --- |
| Rivers of Glass | Fantasy | 2 | 31 | 1 | 30 | promote |
| The Last Signal | Science fiction | 1 | 18 | 1 | 54 | keep |
| A Quiet Ledger | Mystery | 1 | 14.75 | 1 | 30 | keep |
| Paper Lanterns | Fantasy | 1 | 11.25 | 1 | 54 | keep |
| Counting Stars | Science | 1 | 9.99 | 1 | 22 | keep |
| The Silent Orchard | Mystery | 0 | 0 | 0 | NULL | review |

## Explanation

A review like this combines several measures per item (units, revenue, buyers, recency) into one decision. The safe pattern is to aggregate the sales once per book in a CTE, then start from the full catalogue and `LEFT JOIN` the result, so books that did not sell in the period still appear.

The Silent Orchard sold in January, but in February and March its only order was cancelled, so it has no sales in the period and is marked `'review'`: exactly the book the team needs to discuss. Rivers of Glass sold 2 copies, 30 days before the review date, and is the only book to promote. The rest sold one copy each and are kept.

**Common mistake:** counting cancelled orders, or joining sales to books with an inner join. The cancelled order makes The Silent Orchard look like it sold a copy, and the inner join drops it from the review entirely.

## Wrong answers

Feedback: incorrect-output

```sql
WITH sales AS (SELECT oi.book_id, SUM(oi.quantity) AS units, SUM(oi.quantity * oi.unit_price) AS revenue, COUNT(DISTINCT o.customer_id) AS buyers, MAX(o.order_date) AS last_sold FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.order_date BETWEEN '2025-02-01' AND '2025-03-31' GROUP BY oi.book_id) SELECT b.title, b.genre, COALESCE(s.units, 0) AS units, ROUND(COALESCE(s.revenue, 0), 2) AS revenue, COALESCE(s.buyers, 0) AS buyers, CAST(julianday('2025-03-31') - julianday(s.last_sold) AS INTEGER) AS days_since_sale, CASE WHEN s.units IS NULL THEN 'review' WHEN s.units >= 2 AND julianday('2025-03-31') - julianday(s.last_sold) <= 45 THEN 'promote' ELSE 'keep' END AS action FROM books AS b LEFT JOIN sales AS s ON s.book_id = b.id ORDER BY revenue DESC, b.title;
```

Feedback: missing-rows

```sql
WITH sales AS ( SELECT oi.book_id, SUM(oi.quantity) AS units, SUM(oi.quantity * oi.unit_price) AS revenue, COUNT(DISTINCT o.customer_id) AS buyers, MAX(o.order_date) AS last_sold FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled' AND o.order_date BETWEEN '2025-02-01' AND '2025-03-31' GROUP BY oi.book_id ) SELECT b.title, b.genre, s.units, ROUND(s.revenue, 2) AS revenue, s.buyers, CAST(julianday('2025-03-31') - julianday(s.last_sold) AS INTEGER) AS days_since_sale, CASE WHEN s.units >= 2 AND julianday('2025-03-31') - julianday(s.last_sold) <= 45 THEN 'promote' ELSE 'keep' END AS action FROM books AS b JOIN sales AS s ON s.book_id = b.id ORDER BY revenue DESC, b.title;
```
