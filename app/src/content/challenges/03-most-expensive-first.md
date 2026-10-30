---
id: most-expensive-first
title: Most expensive first
order: 3
difficulty: beginner
topic: ORDER BY
summary: Sort every book by price, from the most expensive to the cheapest.
module: sql-fundamentals
duration: 4
dataset: bookstore
tables:
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Sort rows with ORDER BY
  - Reverse the order with DESC
prerequisites:
  - The lesson "Sorting data with ORDER BY"
---

## Task

The shop is preparing a price list that starts with its most expensive books. Return the `title` and `price` of every book, sorted by `price` from **highest to lowest**.

Row order matters for this challenge.

## Starter query

```sql
SELECT title, price
FROM books;
```

## Hints

1. Sorting is done with `ORDER BY`, which comes after `FROM`.
2. `ORDER BY price` sorts from lowest to highest. Add a keyword to reverse it.
3. Use `ORDER BY price DESC`.

## Solution

```sql
SELECT title, price
FROM books
ORDER BY price DESC;
```

## Expected result

| title | price |
| --- | --- |
| The Last Signal | 18 |
| Rivers of Glass | 15.5 |
| A Quiet Ledger | 14.75 |
| The Silent Orchard | 12.99 |
| Paper Lanterns | 11.25 |
| Counting Stars | 9.99 |

## Explanation

`ORDER BY price DESC` sorts the rows by price in descending order. Without `DESC`, SQLite uses ascending order (`ASC`), which would put the cheapest book first.

Without any `ORDER BY`, SQL does not promise any particular order, so a task that asks for an order always needs one.

## Wrong answers

Feedback: wrong-order

```sql
SELECT title, price FROM books ORDER BY price;
```

Feedback: wrong-order

```sql
SELECT title, price FROM books;
```
