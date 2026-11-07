---
id: da-above-average-books
title: Books above the average price
order: 1
difficulty: beginner
topic: Scalar subquery
summary: Compare each book's price with the average price using a subquery.
module: data-analyst
duration: 6
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Use a scalar subquery in WHERE
---

## Task

Return the books that cost **more than the average price of all books**, with `title` and `price`. Row order does not matter.

**Steps**

1. The starter query returns every book. Add `WHERE price > ...`.
2. In place of `...`, write a query in brackets that calculates the average price.
3. That inner query is `SELECT AVG(price) FROM books`.

## Starter query

```sql
SELECT title, price
FROM books;
```

## Hints

1. You cannot write `WHERE price > AVG(price)`: aggregates are not allowed in `WHERE`.
2. A subquery in brackets can calculate the average first.
3. `WHERE price > (SELECT AVG(price) FROM books)`.

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

The subquery returns one value, the average price of about 13.75. The outer query keeps the three books priced above it.

## Wrong answers

Feedback: execution-failure

```sql
SELECT title, price FROM books WHERE price > AVG(price);
```
