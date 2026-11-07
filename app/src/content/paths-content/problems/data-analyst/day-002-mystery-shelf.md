---
id: da-day-002
title: Stock the mystery shelf
order: 2
difficulty: beginner
topic: Selecting and filtering
summary: Filter books by genre to plan a shelf display.
module: data-analyst
duration: 4
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Filter rows on a text value
prerequisites:
  - Day 1
---

## Task

A store manager is setting up a mystery display. Return the `title` and `price` of every book whose genre is `'Mystery'`. Row order does not matter.

## Starter query

```sql
SELECT title, price
FROM books;
```

## Hints

1. Keep only some rows with `WHERE`.
2. Text values go in single quotes and must match exactly, including the capital M.
3. `WHERE genre = 'Mystery'`

## Solution

```sql
SELECT title, price
FROM books
WHERE genre = 'Mystery';
```

## Expected result

| title | price |
| --- | --- |
| The Silent Orchard | 12.99 |
| A Quiet Ledger | 14.75 |

## Explanation

`WHERE genre = 'Mystery'` keeps the two mystery books. Text comparisons must match the stored value exactly.

## Wrong answers

Feedback: extra-rows

```sql
SELECT title, price FROM books;
```
