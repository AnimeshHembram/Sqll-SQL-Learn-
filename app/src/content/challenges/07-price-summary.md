---
id: price-summary
title: Summarise the prices
order: 7
difficulty: intermediate
topic: Aggregate functions
summary: Use MIN, MAX and AVG to describe every price in one row.
duration: 7
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Calculate the smallest, largest and average value of a column
  - Round a result with ROUND
prerequisites:
  - SELECT and FROM from the SQL fundamentals module
  - Aggregate functions, explained in the task below
---

## Task

The owner wants a one-line summary of the shop's prices. Return a **single row** with three columns:

- `cheapest`: the lowest price
- `most_expensive`: the highest price
- `average_price`: the average price, rounded to 2 decimal places

**Before you start:** aggregate functions combine many rows into one value. `MIN(column)` and `MAX(column)` return the smallest and largest value, and `AVG(column)` returns the average. Without `GROUP BY`, the whole table is one group, so the result has one row. `ROUND(value, 2)` rounds a number to 2 decimal places.

```sql syntax
SELECT MIN(column_name) AS name1, MAX(column_name) AS name2
FROM table_name;
```

## Starter query

```sql
SELECT price
FROM books;
```

## Hints

1. Each of the three values is an aggregate function applied to `price`.
2. Give each value a name with `AS`, for example `MIN(price) AS cheapest`.
3. Round the average with `ROUND(AVG(price), 2) AS average_price`.

## Solution

```sql
SELECT
  MIN(price) AS cheapest,
  MAX(price) AS most_expensive,
  ROUND(AVG(price), 2) AS average_price
FROM books;
```

## Expected result

| cheapest | most_expensive | average_price |
| --- | --- | --- |
| 9.99 | 18 | 13.75 |

## Explanation

Aggregate functions read every row and return one value, so the result has a single row. The average of the six prices is 13.7466…, which `ROUND(…, 2)` turns into 13.75.

Mixing an aggregate with an ordinary column, such as `SELECT title, MAX(price)`, needs care: without `GROUP BY` there is only one row, so only one title can be shown.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT MIN(price) AS cheapest, MAX(price) AS most_expensive, AVG(price) AS average_price FROM books;
```

Feedback: incorrect-output

```sql
SELECT MIN(price) AS cheapest, MAX(price) AS most_expensive, ROUND(AVG(price), 2) AS average_price FROM books GROUP BY genre;
```

Feedback: missing-rows

```sql
SELECT MIN(price) AS cheapest, MAX(price) AS most_expensive, ROUND(AVG(price), 2) AS average_price FROM books WHERE price > 100 GROUP BY genre;
```
