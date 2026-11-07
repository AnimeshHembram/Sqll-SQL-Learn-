---
id: da-new-releases
title: New releases and backlist
order: 1
difficulty: beginner
topic: CASE
summary: Label each book as a new release or backlist title with CASE.
module: data-analyst
duration: 6
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Write a CASE expression with WHEN, THEN, ELSE and END
  - Name the result with AS
---

## Task

The shop promotes books published in **2020 or later** as "New release"; every older book is "Backlist". Return:

- `title`
- `shelf`: `'New release'` or `'Backlist'`

Row order does not matter.

**Steps**

1. The starter query has the start of the `CASE` expression. Complete the condition: published in 2020 or later.
2. Add `ELSE 'Backlist'` for every other book.
3. Close the expression with `END AS shelf`.

## Starter query

```sql
SELECT title,
  CASE
    WHEN year THEN 'New release'
FROM books;
```

## Hints

1. The condition compares `year` with 2020. "2020 or later" means greater than or equal.
2. The full condition is `WHEN year >= 2020 THEN 'New release'`.
3. After it, write `ELSE 'Backlist'` and then `END AS shelf`, before `FROM books`.

## Solution

```sql
SELECT title,
  CASE
    WHEN year >= 2020 THEN 'New release'
    ELSE 'Backlist'
  END AS shelf
FROM books;
```

## Expected result

| title | shelf |
| --- | --- |
| The Silent Orchard | Backlist |
| Rivers of Glass | New release |
| Counting Stars | Backlist |
| The Last Signal | New release |
| Paper Lanterns | Backlist |
| A Quiet Ledger | New release |

## Explanation

Each book's `year` is compared with 2020. *Rivers of Glass* (2021), *The Last Signal* (2023) and *A Quiet Ledger* (2020) are new releases; the other three are backlist.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT title, CASE WHEN year > 2020 THEN 'New release' ELSE 'Backlist' END AS shelf FROM books;
```
