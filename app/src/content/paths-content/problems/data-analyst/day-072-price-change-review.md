---
id: da-day-072
title: Review a new price list
order: 72
difficulty: intermediate
topic: Data quality
summary: Join a proposed change to current data and measure each change in percent.
module: data-analyst
duration: 9
dataset: bookstore
tables:
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Calculate percentage change
  - Exclude rows with no real change
prerequisites:
  - Day 70
  - Day 54
---

## Task

Purchasing proposed new prices (in the starter query). Return the books whose price would **actually change**: `title`, `old_price`, `new_price` and `pct_change` (rounded to 1 decimal place). Sort by `pct_change`, largest increase first.

## Starter query

```sql
WITH price_changes(book_id, new_price) AS (
  VALUES (2, 16.50), (3, 9.99), (5, 12.50), (6, 13.75)
)
SELECT book_id, new_price
FROM price_changes;
```

## Hints

1. Join `price_changes` to `books` on the book id to get the title and the current price.
2. Some proposed prices equal the current price; filter them out with `<>`.
3. `ROUND(100.0 * (p.new_price - b.price) / b.price, 1) AS pct_change` and `ORDER BY pct_change DESC`.

## Solution

```sql
WITH price_changes(book_id, new_price) AS (
  VALUES (2, 16.50), (3, 9.99), (5, 12.50), (6, 13.75)
)
SELECT b.title, b.price AS old_price, p.new_price,
  ROUND(100.0 * (p.new_price - b.price) / b.price, 1) AS pct_change
FROM price_changes AS p
JOIN books AS b ON b.id = p.book_id
WHERE p.new_price <> b.price
ORDER BY pct_change DESC;
```

## Expected result

| title | old_price | new_price | pct_change |
| --- | --- | --- | --- |
| Paper Lanterns | 11.25 | 12.5 | 11.1 |
| Rivers of Glass | 15.5 | 16.5 | 6.5 |
| A Quiet Ledger | 14.75 | 13.75 | -6.8 |

## Explanation

*Counting Stars* is listed but keeps its price, so it is left out. *Paper Lanterns* rises most (11.1%) and *A Quiet Ledger* falls by 6.8%. Percentage change is always measured against the old value.

## Wrong answers

Feedback: extra-rows

```sql
WITH price_changes(book_id, new_price) AS (   VALUES (2, 16.50), (3, 9.99), (5, 12.50), (6, 13.75) ) SELECT b.title, b.price AS old_price, p.new_price, ROUND(100.0 * (p.new_price - b.price) / b.price, 1) AS pct_change FROM price_changes AS p JOIN books AS b ON b.id = p.book_id ORDER BY pct_change DESC;
```
