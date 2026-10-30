---
id: advanced-queries
title: Advanced queries
order: 3
difficulty: advanced
topic: Subqueries, CASE, CTEs and window functions
summary: Check your understanding of the techniques used in the advanced challenges.
duration: 7
---

## What does a common table expression (WITH ... AS) do?

Type: conceptual
Topic: CTEs
Difficulty: advanced

- [ ] It creates a permanent table in the database
- [x] It names a query so the rest of the statement can use it like a table
- [ ] It makes a query run faster by caching its result between queries
- [ ] It replaces the need for joins

### Explanation

A CTE gives a name to a query that exists only while the statement runs. The main query can then select from it, join to it, or use it more than once, which makes complicated queries easier to read. Nothing is stored in the database.

## What does this query return for a book that costs exactly 15?

Type: predict-output
Topic: CASE
Difficulty: advanced

```sql
SELECT
  CASE
    WHEN price < 12 THEN 'budget'
    WHEN price > 15 THEN 'premium'
    ELSE 'standard'
  END AS band
FROM books;
```

- [ ] `'budget'`
- [ ] `'premium'`
- [x] `'standard'`
- [ ] `NULL`

### Explanation

15 is not less than 12 and not greater than 15, so neither `WHEN` condition is true and the `ELSE` value, `'standard'`, is used. Without `ELSE`, the result would be `NULL`.

## Two books in the same genre have the same price. How do RANK() and ROW_NUMBER() number them?

Type: multiple-choice
Topic: Window functions
Difficulty: advanced

- [x] `RANK()` gives both the same number; `ROW_NUMBER()` gives them different numbers
- [ ] Both give them the same number
- [ ] Both give them different numbers
- [ ] `ROW_NUMBER()` gives both the same number; `RANK()` gives them different numbers

### Explanation

`RANK()` treats ties as equal: two books in first place both get 1, and the next book gets 3. `ROW_NUMBER()` always numbers rows 1, 2, 3 without gaps, breaking ties in an unspecified order unless the window's `ORDER BY` decides it.

## Which clause makes the ranking start again at 1 for each genre?

Type: choose-the-clause
Topic: Window functions
Difficulty: advanced

```sql
SELECT title, RANK() OVER (________ genre ORDER BY price DESC) AS price_rank
FROM books;
```

- [ ] `GROUP BY`
- [x] `PARTITION BY`
- [ ] `ORDER BY`
- [ ] `SPLIT BY`

### Explanation

Inside `OVER (...)`, `PARTITION BY` divides the rows into separate windows, and the window function restarts for each one. `GROUP BY` is not allowed there, and it would combine rows rather than keep each book as its own row.

## Which query fails to find the books that cost more than the average price?

Type: find-the-error
Topic: Subqueries
Difficulty: advanced

- [x] `SELECT title FROM books WHERE price > AVG(price);`
- [ ] `SELECT title FROM books WHERE price > (SELECT AVG(price) FROM books);`
- [ ] `WITH a AS (SELECT AVG(price) AS v FROM books) SELECT title FROM books, a WHERE price > a.v;`
- [ ] `SELECT title FROM books WHERE price > (SELECT SUM(price) / COUNT(*) FROM books);`

### Explanation

`AVG(price)` cannot be used directly in `WHERE`, so the first query fails with "misuse of aggregate". The others calculate the average separately: in a subquery, in a CTE, or by dividing the total by the count.
