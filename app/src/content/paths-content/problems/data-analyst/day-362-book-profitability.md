---
id: da-day-362
title: Case study: profit per book after royalties
order: 362
difficulty: advanced
topic: Case studies
summary: Combine sales, an assumed cost and the royalty rule into a profit figure for every book.
module: data-analyst
duration: 16
dataset: bookstore
tables:
  - books
  - authors
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Build a profit estimate from several rules
  - Keep unsold items with LEFT JOIN
prerequisites:
  - Day 210
  - Day 115
---

## Task

Using the bookstore tables and non-cancelled orders, estimate **profit per book** for every book in the catalogue. Assume each copy costs the store **55% of its list price** (`books.price`) to buy in, and the author's royalty is **10%** of the book's sales revenue. Return `title`, `author`, `units`, `revenue`, `cost` (units × 55% of list price), `royalty`, `profit` (revenue − cost − royalty) and `margin_pct` (profit ÷ revenue × 100, rounded to 1 decimal place, `NULL` when unsold). Round money to 2 decimal places. Sort by `profit` from highest, then `title`.

## Starter query

```sql
SELECT b.title, b.author, b.price, oi.quantity, oi.unit_price, o.status
FROM books AS b
LEFT JOIN order_items AS oi ON oi.book_id = b.id
LEFT JOIN orders AS o ON o.id = oi.order_id
ORDER BY b.title;
```

## Hints

1. Aggregate non-cancelled units and revenue per book in a CTE (orders joined to their lines), and `LEFT JOIN` it to `books` so every book appears.
2. Cost uses the **list** price (`b.price`), revenue the price paid (`unit_price`): `units * b.price * 0.55` and `revenue * 0.10`.
3. `NULLIF(revenue, 0)` keeps the margin `NULL` for an unsold book.

## Solution

```sql
WITH sold AS (
  SELECT oi.book_id, SUM(oi.quantity) AS units, SUM(oi.quantity * oi.unit_price) AS revenue
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY oi.book_id
),
costed AS (
  SELECT b.title, b.author, COALESCE(s.units, 0) AS units, COALESCE(s.revenue, 0) AS revenue,
    COALESCE(s.units, 0) * b.price * 0.55 AS cost, COALESCE(s.revenue, 0) * 0.10 AS royalty
  FROM books AS b
  LEFT JOIN sold AS s ON s.book_id = b.id
)
SELECT title, author, units, ROUND(revenue, 2) AS revenue, ROUND(cost, 2) AS cost, ROUND(royalty, 2) AS royalty,
  ROUND(revenue - cost - royalty, 2) AS profit, ROUND(100.0 * (revenue - cost - royalty) / NULLIF(revenue, 0), 1) AS margin_pct
FROM costed
ORDER BY profit DESC, title;
```

## Expected result

| title | author | units | revenue | cost | royalty | profit | margin_pct |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Rivers of Glass | Tomas Varga | 3 | 46.5 | 25.58 | 4.65 | 16.27 | 35 |
| Counting Stars | Priya Nair | 3 | 29.97 | 16.48 | 3 | 10.49 | 35 |
| The Last Signal | Mira Das | 1 | 18 | 9.9 | 1.8 | 6.3 | 35 |
| A Quiet Ledger | Ana Ruiz | 1 | 14.75 | 8.11 | 1.48 | 5.16 | 35 |
| The Silent Orchard | Mira Das | 1 | 12.99 | 7.14 | 1.3 | 4.55 | 35 |
| Paper Lanterns | Ken Ito | 1 | 11.25 | 6.19 | 1.13 | 3.94 | 35 |

## Explanation

Profit per book combines three rules: revenue from the price actually paid, a purchase cost of 55% of the list price, and a 10% royalty on revenue. Rivers of Glass earns the most, 16.27 on three copies, but every book has the same 35% margin here, because every copy sold at exactly its list price (the audit on Day 363 confirms it). Discounts would make the margins differ.

The cost uses `books.price`, the list price, while revenue uses `unit_price`; keeping them separate is what would reveal discounting. Starting from `books` with a `LEFT JOIN` keeps every title in the report, so an unsold book would show zero profit and a `NULL` margin.

**Common mistake:** including cancelled orders. The Silent Orchard's cancelled copy adds revenue, cost and royalty that never happened, doubling its apparent profit.

## Wrong answers

Feedback: incorrect-output

```sql
WITH sold AS (SELECT oi.book_id, SUM(oi.quantity) AS units, SUM(oi.quantity * oi.unit_price) AS revenue FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id GROUP BY oi.book_id), costed AS (SELECT b.title, b.author, COALESCE(s.units, 0) AS units, COALESCE(s.revenue, 0) AS revenue, COALESCE(s.units, 0) * b.price * 0.55 AS cost, COALESCE(s.revenue, 0) * 0.10 AS royalty FROM books AS b LEFT JOIN sold AS s ON s.book_id = b.id) SELECT title, author, units, ROUND(revenue, 2) AS revenue, ROUND(cost, 2) AS cost, ROUND(royalty, 2) AS royalty, ROUND(revenue - cost - royalty, 2) AS profit, ROUND(100.0 * (revenue - cost - royalty) / NULLIF(revenue, 0), 1) AS margin_pct FROM costed ORDER BY profit DESC, title;
```
