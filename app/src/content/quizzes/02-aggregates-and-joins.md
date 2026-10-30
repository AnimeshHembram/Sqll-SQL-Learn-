---
id: aggregates-and-joins
title: Aggregates and joins
order: 2
difficulty: intermediate
topic: GROUP BY, HAVING and joins
summary: Test what you know about counting, grouping, filtering groups and combining tables.
duration: 6
---

## What is the difference between WHERE and HAVING?

Type: conceptual
Topic: HAVING
Difficulty: intermediate

- [ ] There is none; they are two names for the same clause
- [x] `WHERE` filters rows before grouping; `HAVING` filters groups after grouping
- [ ] `HAVING` filters rows before grouping; `WHERE` filters groups after grouping
- [ ] `HAVING` can only be used with joins

### Explanation

`WHERE` runs before `GROUP BY`, so it sees individual rows and cannot use aggregates such as `COUNT(*)`. `HAVING` runs after grouping, so it can keep or remove whole groups based on an aggregate.

## How many rows does this query return?

Type: predict-output
Topic: GROUP BY
Difficulty: intermediate

The `books` table has two Fantasy books, two Mystery books, one Science book and one Science fiction book.

```sql
SELECT genre, COUNT(*) AS book_count
FROM books
GROUP BY genre
HAVING COUNT(*) > 1;
```

- [ ] 1 row
- [x] 2 rows: Fantasy and Mystery
- [ ] 4 rows, one per genre
- [ ] 6 rows, one per book

### Explanation

`GROUP BY genre` makes four groups. `HAVING COUNT(*) > 1` keeps only the groups with more than one book, which are Fantasy and Mystery.

## Which of these queries causes an error?

Type: find-the-error
Topic: Aggregate functions
Difficulty: intermediate

- [ ] `SELECT genre, COUNT(*) FROM books GROUP BY genre;`
- [ ] `SELECT COUNT(*) FROM books WHERE price > 12;`
- [x] `SELECT genre FROM books WHERE COUNT(*) > 1 GROUP BY genre;`
- [ ] `SELECT MAX(price) FROM books;`

### Explanation

An aggregate function cannot be used in `WHERE`, because `WHERE` filters rows before any groups or counts exist. SQLite reports "misuse of aggregate". The condition belongs in `HAVING`, after `GROUP BY`.

## You want every author, including authors with no books. Which join completes the query?

Type: choose-the-clause
Topic: LEFT JOIN
Difficulty: intermediate

```sql
SELECT a.name, b.title
FROM authors AS a
________ books AS b ON b.author = a.name;
```

- [ ] `INNER JOIN`
- [x] `LEFT JOIN`
- [ ] `CROSS JOIN`
- [ ] `NATURAL JOIN`

### Explanation

`LEFT JOIN` keeps every row from the left table (`authors`), filling the right table's columns with `NULL` when there is no match. `INNER JOIN` would drop authors without books, and `CROSS JOIN` would pair every author with every book.

## The authors table has 6 rows, and one author's birth year (born) is NULL. What does SELECT COUNT(born) FROM authors return?

Type: multiple-choice
Topic: NULL and COUNT
Difficulty: intermediate

- [ ] 6
- [x] 5
- [ ] 1
- [ ] `NULL`

### Explanation

`COUNT(column)` counts only the rows where that column is not `NULL`, so the author with an unknown birth year is skipped. `COUNT(*)` counts every row and would return 6.
