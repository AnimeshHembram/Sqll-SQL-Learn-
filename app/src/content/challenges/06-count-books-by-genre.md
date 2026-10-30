---
id: count-books-by-genre
title: Count the books in each genre
order: 6
difficulty: intermediate
topic: GROUP BY
summary: Group the books by genre and count how many each genre has.
duration: 8
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Group rows with GROUP BY
  - Count the rows in each group with COUNT(*)
  - Name a calculated column with AS
prerequisites:
  - SELECT, FROM and ORDER BY from the SQL fundamentals module
  - GROUP BY and COUNT, explained in the task below
---

## Task

The shop wants to know how its stock is spread across genres. Return two columns:

- `genre`
- `book_count`: the number of books in that genre

Return one row per genre. Row order does not matter.

**Before you start:** `GROUP BY` puts rows with the same value into one group, and the query returns **one row per group**. An aggregate function such as `COUNT(*)` is then calculated for each group. `AS` gives the calculated column a name.

```sql syntax
SELECT column_name, COUNT(*) AS new_name
FROM table_name
GROUP BY column_name;
```

## Starter query

```sql
SELECT genre
FROM books;
```

## Hints

1. You need one row per genre, so group by the `genre` column.
2. `COUNT(*)` counts the rows in each group. Name it with `AS book_count`.
3. The query is `SELECT genre, COUNT(*) AS book_count FROM books GROUP BY genre`.

## Solution

```sql
SELECT genre, COUNT(*) AS book_count
FROM books
GROUP BY genre;
```

## Expected result

| genre | book_count |
| --- | --- |
| Fantasy | 2 |
| Mystery | 2 |
| Science | 1 |
| Science fiction | 1 |

## Explanation

`GROUP BY genre` creates one group for each different genre. `COUNT(*)` counts the rows in each group, so Fantasy and Mystery, which have two books each, get 2.

Without `AS book_count`, SQLite would name the column `COUNT(*)`. Naming calculated columns makes results easier to read and to use in other queries.

## Other accepted answers

```sql
SELECT genre, COUNT(id) AS book_count FROM books GROUP BY genre ORDER BY book_count DESC;
```

## Wrong answers

Feedback: column-mismatch

```sql
SELECT genre, COUNT(*) FROM books GROUP BY genre;
```

Feedback: missing-rows

```sql
SELECT genre, COUNT(*) AS book_count FROM books WHERE year > 2015 GROUP BY genre;
```
