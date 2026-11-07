---
id: da-day-007
title: Prices including GST
order: 7
difficulty: beginner
topic: Selecting and filtering
summary: Add a calculated column: each price with 18% GST, rounded to the paisa.
module: data-analyst
duration: 6
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Calculate a new column
  - Round to 2 decimal places
prerequisites:
  - Day 1
---

## Task

For an Indian price list, show each book's `title`, its `price`, and `price_with_gst`: the price plus 18% GST, rounded to 2 decimal places. Row order does not matter.

## Starter query

```sql
SELECT title, price
FROM books;
```

## Hints

1. A calculated column is an expression in `SELECT`, named with `AS`.
2. Adding 18% is the same as multiplying by 1.18.
3. `ROUND(price * 1.18, 2) AS price_with_gst`

## Solution

```sql
SELECT title, price, ROUND(price * 1.18, 2) AS price_with_gst
FROM books;
```

## Expected result

| title | price | price_with_gst |
| --- | --- | --- |
| The Silent Orchard | 12.99 | 15.33 |
| Rivers of Glass | 15.5 | 18.29 |
| Counting Stars | 9.99 | 11.79 |
| The Last Signal | 18 | 21.24 |
| Paper Lanterns | 11.25 | 13.27 |
| A Quiet Ledger | 14.75 | 17.4 |

## Explanation

SQL calculates `price * 1.18` for every row; `ROUND(..., 2)` keeps two decimal places, as money is shown.

## Wrong answers

Feedback: column-mismatch

```sql
SELECT title, price, ROUND(price * 1.18, 2) FROM books;
```
