---
id: da-day-210
title: Case study: author royalty statement
order: 210
difficulty: advanced
topic: Case studies
summary: Produce a royalty statement for every author from the bookstore tables, with tiered rates and no one left out.
module: data-analyst
duration: 18
dataset: bookstore
tables:
  - authors
  - books
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Produce a complete statement with LEFT JOINs
  - Apply a tiered rate after aggregating
prerequisites:
  - Day 180
  - Day 144
---

## Task

Day 210. The bookstore pays authors royalties on **non-cancelled** sales. The rate is **10%** of the author's sales revenue, rising to **12.5%** on all of it once the author has sold **3 or more copies** in total. Prepare a statement for **every author** in `authors`:

- `author`, `country`, `titles` (books they have in the catalogue), `copies_sold`, `revenue` (rounded to 2 decimal places, 0 when none),
- `rate_pct` (10 or 12.5; `NULL` when nothing was sold),
- `royalty` (revenue × rate, rounded to 2 decimal places; 0 when nothing was sold).

Sort by `royalty` from highest to lowest, then `author`.

## Starter query

```sql
SELECT a.name, a.country, b.title
FROM authors AS a
LEFT JOIN books AS b ON b.author = a.name
ORDER BY a.name;
```

## Hints

1. Start from `authors` so every author appears. Count titles from `books` and sales from non-cancelled order lines in separate CTEs, each grouped by author, then `LEFT JOIN` both.
2. Sales per author: `orders` joined to `order_items` and `books` with `o.status <> 'cancelled'`, summing `quantity` and `quantity * unit_price`.
3. Rate: `CASE WHEN copies IS NULL THEN NULL WHEN copies >= 3 THEN 12.5 ELSE 10 END`; royalty: `COALESCE(revenue * rate / 100, 0)`.

## Solution

```sql
WITH titles AS (
  SELECT author, COUNT(*) AS titles FROM books GROUP BY author
),
sales AS (
  SELECT b.author, SUM(oi.quantity) AS copies, SUM(oi.quantity * oi.unit_price) AS revenue
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  JOIN books AS b ON b.id = oi.book_id
  WHERE o.status <> 'cancelled'
  GROUP BY b.author
),
statement AS (
  SELECT a.name AS author, a.country, COALESCE(t.titles, 0) AS titles,
    COALESCE(s.copies, 0) AS copies_sold, COALESCE(s.revenue, 0) AS revenue,
    CASE WHEN s.copies IS NULL THEN NULL WHEN s.copies >= 3 THEN 12.5 ELSE 10 END AS rate_pct
  FROM authors AS a
  LEFT JOIN titles AS t ON t.author = a.name
  LEFT JOIN sales AS s ON s.author = a.name
)
SELECT author, country, titles, copies_sold, ROUND(revenue, 2) AS revenue, rate_pct,
  ROUND(COALESCE(revenue * rate_pct / 100, 0), 2) AS royalty
FROM statement
ORDER BY royalty DESC, author;
```

## Expected result

| author | country | titles | copies_sold | revenue | rate_pct | royalty |
| --- | --- | --- | --- | --- | --- | --- |
| Tomas Varga | Hungary | 1 | 3 | 46.5 | 12.5 | 5.81 |
| Priya Nair | India | 1 | 3 | 29.97 | 12.5 | 3.75 |
| Mira Das | India | 2 | 2 | 30.99 | 10 | 3.1 |
| Ana Ruiz | Spain | 1 | 1 | 14.75 | 10 | 1.48 |
| Ken Ito | Japan | 1 | 1 | 11.25 | 10 | 1.13 |
| Leo Brandt | Germany | 0 | 0 | 0 | NULL | 0 |

## Explanation

Day 210 rounds off the batch with a statement someone would actually send. Three habits from the whole path come together:

- **Every row the business expects appears.** The statement starts from `authors` and joins everything else with `LEFT JOIN`, so authors with no sales (and any with no books) still get a statement showing zero, which is exactly what an author would ask about.
- **Aggregate before joining.** Titles and sales are counted in separate CTEs at the author grain; joining raw books to raw order lines first would multiply titles by sales (the fan-out of Day 144).
- **Apply the business rule to the right total.** The tier depends on the author's copies across all their books, so it is decided after summing, and the higher rate then applies to all of that author's revenue, as the contract says.

**Common mistake:** an inner join from sales to authors, which produces a statement only for authors who sold something and silently leaves the rest out.

## Wrong answers

Feedback: missing-rows

```sql
WITH sales AS (SELECT b.author, SUM(oi.quantity) AS copies, SUM(oi.quantity * oi.unit_price) AS revenue FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id JOIN books AS b ON b.id = oi.book_id WHERE o.status <> 'cancelled' GROUP BY b.author) SELECT a.name AS author, a.country, (SELECT COUNT(*) FROM books AS b WHERE b.author = a.name) AS titles, s.copies AS copies_sold, ROUND(s.revenue, 2) AS revenue, CASE WHEN s.copies >= 3 THEN 12.5 ELSE 10 END AS rate_pct, ROUND(s.revenue * CASE WHEN s.copies >= 3 THEN 12.5 ELSE 10 END / 100, 2) AS royalty FROM authors AS a JOIN sales AS s ON s.author = a.name ORDER BY royalty DESC, author;
```
