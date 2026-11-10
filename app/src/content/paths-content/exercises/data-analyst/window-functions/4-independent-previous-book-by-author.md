---
id: da-previous-book-by-author
title: The previous book by the same author
order: 4
difficulty: advanced
topic: LAG
summary: Use LAG within each author to find the book they published before.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Read the previous row within a group
---

## Task

For "read their earlier work" links, return every book with `author`, `title`, `year` and `previous_title`: the title of the same author's previous book by year, or `NULL` if there is none. Sort by `author`, then `year`.

## Starter query

```sql
SELECT author, title, year
FROM books
ORDER BY author, year;
```

## Hints

1. Each author is a separate window: `PARTITION BY author`.
2. Within an author, the previous book is the one with the earlier year: `ORDER BY year` inside `OVER`.
3. `LAG(title) OVER (PARTITION BY author ORDER BY year) AS previous_title`

## Solution

```sql
SELECT author, title, year,
  LAG(title) OVER (PARTITION BY author ORDER BY year) AS previous_title
FROM books
ORDER BY author, year;
```

## Expected result

| author | title | year | previous_title |
| --- | --- | --- | --- |
| Ana Ruiz | A Quiet Ledger | 2020 | NULL |
| Ken Ito | Paper Lanterns | 2019 | NULL |
| Mira Das | The Silent Orchard | 2018 | NULL |
| Mira Das | The Last Signal | 2023 | The Silent Orchard |
| Priya Nair | Counting Stars | 2015 | NULL |
| Tomas Varga | Rivers of Glass | 2021 | NULL |

## Explanation

Only Mira Das has two books, so *The Last Signal* links back to *The Silent Orchard*; every other book is its author's first in stock and gets `NULL`. Without `PARTITION BY`, `LAG` would link each book to the previous book by anyone.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT author, title, year, LAG(title) OVER (ORDER BY year) AS previous_title FROM books ORDER BY author, year;
```
