---
id: pricey-genres
title: Genres with a high average price
order: 8
difficulty: intermediate
topic: HAVING
summary: Filter groups with HAVING to find the genres whose books cost more than 13 on average.
duration: 8
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Calculate an average for each group
  - Keep only some groups with HAVING
  - Explain the difference between WHERE and HAVING
prerequisites:
  - GROUP BY and AVG (see the challenges "Count the books in each genre" and "Summarise the prices")
  - HAVING, explained in the task below
---

## Task

Return every genre whose books cost **more than 13 on average**, with two columns:

- `genre`
- `avg_price`: the average price of the genre's books, rounded to 2 decimal places

Row order does not matter.

**Before you start:** `WHERE` filters rows *before* they are grouped, so it cannot use an aggregate such as `AVG(price)`. `HAVING` filters *groups* after they are formed, so it can.

```sql syntax
SELECT column_name, AVG(other_column)
FROM table_name
GROUP BY column_name
HAVING AVG(other_column) > value;
```

## Starter query

```sql
SELECT genre, ROUND(AVG(price), 2) AS avg_price
FROM books
GROUP BY genre;
```

## Hints

1. The starter query already calculates the average for each genre. You only need to remove some groups.
2. A condition on an aggregate goes in `HAVING`, after `GROUP BY`.
3. Add `HAVING AVG(price) > 13`. Compare the unrounded average, so rounding cannot change which genres are kept.

## Solution

```sql
SELECT genre, ROUND(AVG(price), 2) AS avg_price
FROM books
GROUP BY genre
HAVING AVG(price) > 13;
```

## Expected result

| genre | avg_price |
| --- | --- |
| Fantasy | 13.38 |
| Mystery | 13.87 |
| Science fiction | 18 |

## Explanation

The query groups the books by genre, calculates each group's average, and then `HAVING` removes the groups whose average is 13 or less. Science, with one book at 9.99, is the only genre removed.

Putting the condition in `WHERE` fails, because rows are filtered before any average exists.

## Other accepted answers

```sql
SELECT genre, ROUND(AVG(price), 2) AS avg_price FROM books GROUP BY genre HAVING avg_price > 13;
```

## Wrong answers

Feedback: execution-failure

```sql
SELECT genre, ROUND(AVG(price), 2) AS avg_price FROM books WHERE AVG(price) > 13 GROUP BY genre;
```

Feedback: extra-rows

```sql
SELECT genre, ROUND(AVG(price), 2) AS avg_price FROM books GROUP BY genre;
```

Feedback: incorrect-output

```sql
SELECT genre, ROUND(AVG(price), 2) AS avg_price FROM books WHERE price > 13 GROUP BY genre;
```
