---
id: select-fundamentals
title: SELECT fundamentals
order: 1
difficulty: beginner
topic: SELECT, WHERE, ORDER BY and LIMIT
summary: Check your understanding of the SQL fundamentals module, from choosing columns to limiting results.
duration: 5
---

## Which clause decides which rows are kept in the result?

Type: multiple-choice
Topic: WHERE
Difficulty: beginner

- [ ] `SELECT`
- [ ] `FROM`
- [x] `WHERE`
- [ ] `ORDER BY`

### Explanation

`WHERE` holds a condition, and only rows for which it is true are kept. `SELECT` chooses columns, `FROM` names the table, and `ORDER BY` only sorts the rows that remain.

## What does this query return?

Type: predict-output
Topic: ORDER BY
Difficulty: beginner

The `books` table holds six books. Two cost more than 15: *Rivers of Glass* (15.50) and *The Last Signal* (18.00).

```sql
SELECT title
FROM books
WHERE price > 15
ORDER BY price;
```

- [x] *Rivers of Glass*, then *The Last Signal*
- [ ] *The Last Signal*, then *Rivers of Glass*
- [ ] Only *The Last Signal*
- [ ] All six titles, sorted by price

### Explanation

`WHERE price > 15` keeps the two books that cost more than 15. `ORDER BY price` sorts in ascending order by default, so the cheaper of the two, *Rivers of Glass*, comes first.

## Which of these queries causes an error?

Type: find-the-error
Topic: Clause order
Difficulty: beginner

- [ ] `SELECT title, price FROM books WHERE price < 12;`
- [x] `SELECT title FROM books ORDER BY price WHERE price < 12;`
- [ ] `SELECT title FROM books ORDER BY price DESC LIMIT 2;`
- [ ] `SELECT DISTINCT genre FROM books;`

### Explanation

Clauses must appear in a fixed order: `SELECT`, `FROM`, `WHERE`, `ORDER BY`, `LIMIT`. Putting `WHERE` after `ORDER BY` is a syntax error. The other three queries are valid.

## Which clause completes this query so it returns only the first three rows?

Type: choose-the-clause
Topic: LIMIT
Difficulty: beginner

```sql
SELECT title FROM books ORDER BY year DESC ________;
```

- [ ] `TOP 3`
- [x] `LIMIT 3`
- [ ] `FIRST 3`
- [ ] `ROWS 3`

### Explanation

SQLite uses `LIMIT` to cap the number of rows. Some other databases use `TOP` (SQL Server) or `FETCH FIRST 3 ROWS ONLY`, but those do not work in SQLite.

## In which order does SQLite logically process the parts of this query?

Type: conceptual
Topic: Query processing
Difficulty: beginner

```sql
SELECT title FROM books WHERE genre = 'Fantasy' ORDER BY title;
```

- [ ] `SELECT`, `FROM`, `WHERE`, `ORDER BY`
- [x] `FROM`, `WHERE`, `SELECT`, `ORDER BY`
- [ ] `WHERE`, `FROM`, `ORDER BY`, `SELECT`
- [ ] `ORDER BY`, `WHERE`, `FROM`, `SELECT`

### Explanation

A query is written starting with `SELECT`, but it is processed starting with `FROM`: first the table is read, then `WHERE` filters the rows, then `SELECT` picks the columns, and finally `ORDER BY` sorts the result.
