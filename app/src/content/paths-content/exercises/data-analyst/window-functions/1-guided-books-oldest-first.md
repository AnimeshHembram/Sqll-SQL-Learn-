---
id: da-books-oldest-first
title: Number the books from oldest to newest
order: 1
difficulty: intermediate
topic: ROW_NUMBER
summary: Give every book a position by publication year with ROW_NUMBER.
module: data-analyst
duration: 6
dataset: bookstore
tables:
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Number rows with ROW_NUMBER
---

## Task

For a "through the years" display, return `title`, `year` and `position`: 1 for the oldest book, 2 for the next, and so on. Sort by `position`.

**Steps**

1. Add a third column with `ROW_NUMBER() OVER (...)`.
2. Inside `OVER`, order the window by `year` so the oldest book is numbered 1.
3. Sort the output by the new column.

## Starter query

```sql
SELECT title, year
FROM books;
```

## Hints

1. There is no `PARTITION BY`: all books are numbered together.
2. The `ORDER BY` inside `OVER` decides the numbering; the `ORDER BY` at the end only sorts the output.
3. `ROW_NUMBER() OVER (ORDER BY year) AS position` and `ORDER BY position`.

## Solution

```sql
SELECT title, year, ROW_NUMBER() OVER (ORDER BY year) AS position
FROM books
ORDER BY position;
```

## Expected result

| title | year | position |
| --- | --- | --- |
| Counting Stars | 2015 | 1 |
| The Silent Orchard | 2018 | 2 |
| Paper Lanterns | 2019 | 3 |
| A Quiet Ledger | 2020 | 4 |
| Rivers of Glass | 2021 | 5 |
| The Last Signal | 2023 | 6 |

## Explanation

*Counting Stars* (2015) is first and *The Last Signal* (2023) is sixth. No two books share a year, so `ROW_NUMBER`, `RANK` and `DENSE_RANK` would all agree here. Unlike `GROUP BY`, the window keeps all six rows.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT title, year, ROW_NUMBER() OVER (ORDER BY year DESC) AS position FROM books ORDER BY year;
```
