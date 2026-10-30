---
id: books-and-countries
title: Where do the authors come from?
order: 9
difficulty: intermediate
topic: INNER JOIN
summary: Join books to authors to show each book with its author's country.
duration: 10
dataset: bookstore
tables:
  - books
  - authors
orderMatters: false
checkColumnNames: true
objectives:
  - Combine two tables with INNER JOIN
  - Match rows with an ON condition
  - Qualify column names with a table name or alias
prerequisites:
  - SELECT and FROM from the SQL fundamentals module
  - Joins, explained in the task below
---

## Task

Return every book with the country of its author, using two columns:

- `title` (from `books`)
- `country` (from `authors`)

A book's `author` column holds the author's name, which matches `authors.name`. Row order does not matter.

**Before you start:** a join combines rows from two tables. `INNER JOIN … ON condition` pairs each row of the first table with every row of the second table for which the condition is true. Rows without a match are left out.

```sql syntax
SELECT a.column1, b.column2
FROM table_a AS a
INNER JOIN table_b AS b ON a.key = b.key;
```

## Starter query

```sql
SELECT title
FROM books;
```

## Hints

1. Join `authors` to `books`, and say how their rows match in `ON`.
2. The matching columns are `books.author` and `authors.name`.
3. `FROM books INNER JOIN authors ON books.author = authors.name`, then select `title` and `country`.

## Solution

```sql
SELECT b.title, a.country
FROM books AS b
INNER JOIN authors AS a ON b.author = a.name;
```

## Expected result

| title | country |
| --- | --- |
| The Silent Orchard | India |
| Rivers of Glass | Hungary |
| Counting Stars | India |
| The Last Signal | India |
| Paper Lanterns | Japan |
| A Quiet Ledger | Spain |

## Explanation

For each book, the join finds the author row whose `name` equals the book's `author` and puts their columns side by side. Every book has a matching author, so all six books appear. Leo Brandt has no books, so his row is not part of any pair.

The aliases `b` and `a` are optional, but they keep longer queries readable and make it clear which table each column comes from.

## Other accepted answers

```sql
SELECT books.title, authors.country FROM books JOIN authors ON authors.name = books.author;
```

```sql
SELECT title, (SELECT country FROM authors WHERE name = books.author) AS country FROM books;
```

## Wrong answers

Feedback: extra-rows

```sql
SELECT b.title, a.country FROM books AS b, authors AS a;
```

Feedback: execution-failure

```sql
SELECT title, country FROM books INNER JOIN authors ON books.author_id = authors.id;
```
