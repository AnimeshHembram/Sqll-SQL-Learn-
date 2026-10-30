---
id: authors-and-book-counts
title: Every author and their books
order: 10
difficulty: intermediate
topic: LEFT JOIN
summary: Use a LEFT JOIN to count each author's books, keeping authors who have none.
duration: 10
dataset: bookstore
tables:
  - authors
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Keep unmatched rows with LEFT JOIN
  - Count only matching rows with COUNT(column)
  - Combine a join with GROUP BY
prerequisites:
  - INNER JOIN (see the challenge "Where do the authors come from?")
  - GROUP BY and COUNT (see the challenge "Count the books in each genre")
---

## Task

Return **every author**, including authors with no books in stock, with two columns:

- `name`
- `book_count`: how many books by that author are in the `books` table (0 if there are none)

Row order does not matter.

**Before you start:** `LEFT JOIN` keeps every row of the table on the left, even when nothing on the right matches. For those rows, the right table's columns are `NULL`. `COUNT(*)` counts rows, but `COUNT(column)` counts only rows where that column is not `NULL`.

## Starter query

```sql
SELECT a.name, b.title
FROM authors AS a
INNER JOIN books AS b ON b.author = a.name;
```

## Hints

1. Run the starter query. One author is missing because `INNER JOIN` drops authors without books.
2. Change the join to `LEFT JOIN`, then `GROUP BY a.name` to get one row per author.
3. Count with `COUNT(b.id)`. `COUNT(*)` would count the unmatched row and give Leo Brandt 1 instead of 0.

## Solution

```sql
SELECT a.name, COUNT(b.id) AS book_count
FROM authors AS a
LEFT JOIN books AS b ON b.author = a.name
GROUP BY a.name;
```

## Expected result

| name | book_count |
| --- | --- |
| Ana Ruiz | 1 |
| Ken Ito | 1 |
| Leo Brandt | 0 |
| Mira Das | 2 |
| Priya Nair | 1 |
| Tomas Varga | 1 |

## Explanation

`LEFT JOIN` keeps all six authors. Leo Brandt has no books, so his row is paired with `NULL` values for every `books` column. `COUNT(b.id)` ignores those `NULL`s and gives 0, while `COUNT(*)` would count the row itself and give 1.

## Other accepted answers

```sql
SELECT name, (SELECT COUNT(*) FROM books WHERE books.author = authors.name) AS book_count FROM authors;
```

## Wrong answers

Feedback: missing-rows

```sql
SELECT a.name, COUNT(b.id) AS book_count FROM authors AS a INNER JOIN books AS b ON b.author = a.name GROUP BY a.name;
```

Feedback: incorrect-output

```sql
SELECT a.name, COUNT(*) AS book_count FROM authors AS a LEFT JOIN books AS b ON b.author = a.name GROUP BY a.name;
```
