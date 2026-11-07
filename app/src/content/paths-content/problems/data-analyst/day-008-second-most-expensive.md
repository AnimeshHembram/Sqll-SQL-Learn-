---
id: da-day-008
title: The second most expensive book
order: 8
difficulty: beginner
topic: Sorting and limiting
summary: Skip a row with OFFSET to find the runner-up.
module: data-analyst
duration: 5
dataset: bookstore
tables:
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Sort descending
  - Skip rows with OFFSET
prerequisites:
  - Learn SQL: Limiting results with LIMIT
---

## Task

Pricing wants the **second** most expensive book. Return its `title` and `price` (one row).

## Starter query

```sql
SELECT title, price
FROM books
ORDER BY price DESC;
```

## Hints

1. `LIMIT 1` keeps one row; `OFFSET` skips rows before it.
2. Skip the most expensive book, then keep the next one.
3. Add `LIMIT 1 OFFSET 1`.

## Solution

```sql
SELECT title, price
FROM books
ORDER BY price DESC
LIMIT 1 OFFSET 1;
```

## Expected result

| title | price |
| --- | --- |
| Rivers of Glass | 15.5 |

## Explanation

Sorting by price, highest first, puts *The Last Signal* (18.00) first. `OFFSET 1` skips it and `LIMIT 1` keeps the next book.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT title, price FROM books ORDER BY price DESC LIMIT 1;
```
