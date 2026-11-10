---
id: data-quality-checks
title: Data quality checks
order: 12
difficulty: advanced
topic: Duplicates, completeness, integrity and validity
summary: Check that you can write queries that find bad data before it reaches a report.
duration: 5
---

## A data check is written so that it returns the problem rows. What does an empty result mean?

Type: conceptual
Topic: Check design
Difficulty: beginner

- [ ] The query is broken
- [x] The check passed: no problem rows were found
- [ ] The table is empty
- [ ] The check needs `LIMIT` to show results

### Explanation

Returning only problem rows makes checks easy to read and to automate: no rows means nothing to fix, and every returned row is a specific problem.

## Which query finds order lines whose book does not exist?

Type: multiple-choice
Topic: Referential integrity
Difficulty: intermediate

- [ ] `SELECT oi.* FROM order_items AS oi JOIN books AS b ON b.id = oi.book_id WHERE b.id IS NULL`
- [x] `SELECT oi.* FROM order_items AS oi LEFT JOIN books AS b ON b.id = oi.book_id WHERE b.id IS NULL`
- [ ] `SELECT oi.* FROM order_items AS oi WHERE oi.book_id = NULL`
- [ ] `SELECT oi.* FROM order_items AS oi LEFT JOIN books AS b ON b.id = oi.book_id WHERE b.id IS NOT NULL`

### Explanation

A `LEFT JOIN` keeps every order line; lines without a matching book get `NULL` in the book columns. A plain `JOIN` removes those lines before the `WHERE` can find them.

## What does this query return?

Type: predict-output
Topic: Validating dates
Difficulty: intermediate

```sql
SELECT date('2026-13-01') AS checked;
```

- [ ] `2026-13-01`
- [ ] `2027-01-01`
- [x] `NULL`
- [ ] An error

### Explanation

There is no month 13, so `date()` cannot read the value and returns `NULL`. That makes `date(column) IS NULL` a simple test for invalid dates.

## A name is stored as two spaces. Which condition finds it?

Type: choose-the-clause
Topic: Blank values
Difficulty: intermediate

- [ ] `name IS NULL`
- [ ] `name = ''`
- [x] `TRIM(name) = ''`
- [ ] `name = NULL`

### Explanation

Two spaces are neither `NULL` nor an empty string. `TRIM` removes the spaces, leaving `''`. `name = NULL` is never true for any row.

## A batch has 7 rows. Three checks find 2, 1 and 1 problem rows, and one row fails two checks. How many rows fail at least one check?

Type: conceptual
Topic: Check summaries
Difficulty: advanced

- [ ] 4
- [x] 3
- [ ] 7
- [ ] 2

### Explanation

The checks report 4 failures in total, but one row is counted twice, so 3 different rows fail. A health report should count rows that fail *any* check, not add up the failures per check.
