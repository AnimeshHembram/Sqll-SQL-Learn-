---
id: above-average-price
title: Books above the average price
order: 11
difficulty: advanced
topic: Subqueries
summary: Compare each book with the average price, calculated by a subquery.
duration: 10
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Use a subquery that returns a single value
  - Compare each row with a value calculated from the whole table
prerequisites:
  - WHERE from the SQL fundamentals module
  - AVG (see the challenge "Summarise the prices")
  - Subqueries, explained in the task below
---

## Task

Return the `title` and `price` of every book that costs **more than the average price** of all books. Row order does not matter.

Do not type the average yourself: calculate it in the query, so the answer stays correct when prices change.

**Before you start:** a subquery is a complete `SELECT` inside parentheses, used inside another query. A subquery that returns one row with one column can be used anywhere a single value can, such as on one side of a comparison in `WHERE`.

```sql syntax
SELECT column_name
FROM table_name
WHERE column_name > (SELECT AVG(column_name) FROM table_name);
```

## Starter query

```sql
SELECT title, price
FROM books
WHERE price > 0;
```

## Hints

1. `WHERE price > AVG(price)` does not work: aggregates are not allowed in `WHERE`.
2. Calculate the average in its own query, `SELECT AVG(price) FROM books`, and put it in parentheses.
3. Replace the `0` in the starter query with `(SELECT AVG(price) FROM books)`.

## Solution

```sql
SELECT title, price
FROM books
WHERE price > (SELECT AVG(price) FROM books);
```

## Expected result

| title | price |
| --- | --- |
| Rivers of Glass | 15.5 |
| The Last Signal | 18 |
| A Quiet Ledger | 14.75 |

## Explanation

SQLite runs the subquery once and gets 13.7466…, the average of all six prices. The outer query then keeps the books whose price is greater than that value.

Hard-coding `WHERE price > 13.75` gives the same rows today, but it would silently become wrong as soon as a price changed or a book was added.

## Other accepted answers

```sql
WITH average AS (SELECT AVG(price) AS value FROM books)
SELECT title, price FROM books, average WHERE price > average.value;
```

## Wrong answers

Feedback: execution-failure

```sql
SELECT title, price FROM books WHERE price > AVG(price);
```

Feedback: extra-rows

```sql
SELECT title, price FROM books WHERE price > (SELECT MIN(price) FROM books);
```
