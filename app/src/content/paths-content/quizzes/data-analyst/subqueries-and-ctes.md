---
id: subqueries-and-ctes
title: Subqueries and CTEs
order: 4
difficulty: intermediate
topic: Subqueries, WITH and percentages
summary: Check that you can use a subquery's result and build an analysis in named steps.
duration: 4
---

## Why does `WHERE price > AVG(price)` not work, while `WHERE price > (SELECT AVG(price) FROM books)` does?

Type: conceptual
Topic: Scalar subquery
Difficulty: beginner

- [ ] `AVG` only works on whole numbers
- [x] Aggregates are not allowed in `WHERE`, but a subquery can calculate the average first
- [ ] `WHERE` must always contain a subquery
- [ ] Both work the same way

### Explanation

`WHERE` looks at one row at a time, so it cannot use an aggregate over all rows. A subquery in brackets runs on its own and returns one value that every row can be compared with.

## What does this query return?

Type: predict-output
Topic: Integer division
Difficulty: intermediate

```sql
SELECT 3 / 10 AS share;
```

- [ ] 0.3
- [x] 0
- [ ] 30
- [ ] `NULL`

### Explanation

Both numbers are whole numbers, so SQLite uses whole-number division and drops the remainder. Write `3.0 / 10` or `100.0 * 3 / 10` for a decimal result.

## Which keyword names a step that the following query can use like a table?

Type: choose-the-clause
Topic: CTE
Difficulty: beginner

- [ ] `AS`
- [x] `WITH`
- [ ] `VIEW`
- [ ] `STEP`

### Explanation

`WITH step_name AS (SELECT ...)` defines a common table expression. The query that follows can read `step_name` like a table. It exists only for that one statement.

## A subquery can return several rows. Which condition is safe to use with it?

Type: multiple-choice
Topic: IN
Difficulty: intermediate

- [ ] `WHERE id = (SELECT order_id FROM order_items)`
- [x] `WHERE id IN (SELECT order_id FROM order_items)`
- [ ] `WHERE id > (SELECT order_id FROM order_items)`
- [ ] `WHERE id LIKE (SELECT order_id FROM order_items)`

### Explanation

`IN` checks the value against every row the subquery returns. With `=` or `>`, SQLite silently uses only the first row, and most other databases stop with an error.

## Why does this statement fail?

Type: find-the-error
Topic: CTE syntax
Difficulty: beginner

```sql
WITH cheap AS (SELECT * FROM books WHERE price < 12);
```

- [ ] A CTE cannot use `WHERE`
- [ ] The CTE needs a column list
- [x] There is no main query after the CTE that uses it
- [ ] `cheap` is a reserved word

### Explanation

`WITH` only names a step. The statement must end with a query that uses it, for example `WITH cheap AS (...) SELECT title FROM cheap;`.
