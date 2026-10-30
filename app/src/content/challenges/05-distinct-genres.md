---
id: distinct-genres
title: Every genre, once
order: 5
difficulty: beginner
topic: DISTINCT
summary: List each genre a single time, in alphabetical order.
module: sql-fundamentals
duration: 4
dataset: bookstore
tables:
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Remove duplicate rows with DISTINCT
  - Sort text alphabetically
prerequisites:
  - The lessons "Introduction to SELECT" and "Sorting data with ORDER BY"
  - DISTINCT, explained in the task below
---

## Task

The shop wants a menu of genres for its website. Return a single column, `genre`, listing **each genre once**, sorted alphabetically (A to Z).

Several books share a genre, so selecting the `genre` column alone repeats some values.

**New keyword:** `SELECT DISTINCT` removes duplicate rows from the result. Rows are duplicates when every selected column has the same value.

```sql syntax
SELECT DISTINCT column_name FROM table_name;
```

## Starter query

```sql
SELECT genre
FROM books;
```

## Hints

1. Run the starter query and look for repeated values.
2. Put `DISTINCT` straight after `SELECT`.
3. Add `ORDER BY genre` at the end to sort alphabetically.

## Solution

```sql
SELECT DISTINCT genre
FROM books
ORDER BY genre;
```

## Expected result

| genre |
| --- |
| Fantasy |
| Mystery |
| Science |
| Science fiction |

## Explanation

`DISTINCT` keeps one copy of each different row. There are six books but only four genres, so four rows remain. `ORDER BY genre` sorts the text alphabetically; "Science" comes before "Science fiction" because it is shorter and otherwise equal.

## Other accepted answers

```sql
SELECT genre FROM books GROUP BY genre ORDER BY genre;
```

## Wrong answers

Feedback: extra-rows

```sql
SELECT genre FROM books ORDER BY genre;
```

Feedback: wrong-order

```sql
SELECT DISTINCT genre FROM books ORDER BY genre DESC;
```
