---
id: recent-affordable-books
title: Recent books under 15
order: 2
difficulty: beginner
topic: WHERE
summary: Combine two conditions with AND to find books published after 2018 that cost less than 15.
module: sql-fundamentals
duration: 5
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Filter rows with a WHERE condition
  - Combine two conditions with AND
prerequisites:
  - The lesson "Filtering data with WHERE"
---

## Task

A customer wants something recent and affordable. Return the `title`, `year` and `price` of every book that was published **after 2018** and costs **less than 15**.

Both conditions must be true for a book to be included.

## Starter query

```sql
SELECT title, year, price
FROM books;
```

## Hints

1. Add a `WHERE` clause after `FROM books`.
2. "After 2018" means `year > 2018`. A book from 2018 itself does not count.
3. Join the two conditions with `AND`: `WHERE year > 2018 AND price < 15`.

## Solution

```sql
SELECT title, year, price
FROM books
WHERE year > 2018 AND price < 15;
```

## Expected result

| title | year | price |
| --- | --- | --- |
| Paper Lanterns | 2019 | 11.25 |
| A Quiet Ledger | 2020 | 14.75 |

## Explanation

`WHERE` keeps only the rows where the whole condition is true. With `AND`, both parts must be true: *Rivers of Glass* is recent but costs 15.50, and *The Silent Orchard* is cheap enough but was published in 2018, so neither is included.

## Other accepted answers

```sql
SELECT title, year, price FROM books WHERE price < 15 AND year >= 2019;
```

## Wrong answers

Feedback: extra-rows

```sql
SELECT title, year, price FROM books WHERE year > 2018 OR price < 15;
```

Feedback: missing-rows

```sql
SELECT title, year, price FROM books WHERE year > 2019 AND price < 15;
```

Feedback: extra-rows

```sql
SELECT title, year, price FROM books WHERE year >= 2018 AND price < 15;
```

Feedback: incorrect-output

```sql
SELECT title, year, ROUND(price) AS price FROM books WHERE year > 2018 AND price < 15;
```
