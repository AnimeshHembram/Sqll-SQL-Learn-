---
id: da-day-024
title: Books priced above their genre average
order: 24
difficulty: advanced
topic: Subqueries and CTEs
summary: Compare each row with an average of its own group using a correlated subquery.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Write a correlated subquery
prerequisites:
  - Data Analyst chapter: Subqueries and CTEs
---

## Task

Pricing wants books that cost more than the **average price of their own genre**. Return `title`, `genre` and `price`. Row order does not matter.

## Starter query

```sql
SELECT title, genre, price
FROM books;
```

## Hints

1. The average must be calculated per genre, for each book's own genre.
2. A subquery can refer to the outer row: `WHERE g.genre = b.genre`.
3. `WHERE b.price > (SELECT AVG(g.price) FROM books AS g WHERE g.genre = b.genre)`

## Solution

```sql
SELECT b.title, b.genre, b.price
FROM books AS b
WHERE b.price > (
  SELECT AVG(g.price) FROM books AS g WHERE g.genre = b.genre
);
```

## Expected result

| title | genre | price |
| --- | --- | --- |
| Rivers of Glass | Fantasy | 15.5 |
| A Quiet Ledger | Mystery | 14.75 |

## Explanation

The subquery runs for each book with that book's genre: a **correlated** subquery. Genres with a single book can never have a book above their own average.

## Wrong answers

Feedback: extra-rows

```sql
SELECT title, genre, price FROM books WHERE price > (SELECT AVG(price) FROM books);
```
