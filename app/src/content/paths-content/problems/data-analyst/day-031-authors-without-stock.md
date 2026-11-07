---
id: da-day-031
title: Authors with nothing in stock
order: 31
difficulty: intermediate
topic: Subqueries and CTEs
summary: Use NOT EXISTS to find rows that have no match in another table.
module: data-analyst
duration: 6
dataset: bookstore
tables:
  - authors
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Test for missing matches with NOT EXISTS
prerequisites:
  - Day 24
  - Data Analyst chapter: Subqueries and CTEs
---

## Task

Purchasing wants to know which authors we list but stock **no books** by. Return their `name` and `country`. Use `NOT EXISTS`. Row order does not matter.

## Starter query

```sql
SELECT a.name, a.country
FROM authors AS a;
```

## Hints

1. For each author, ask: is there any book whose `author` is this author's name?
2. `NOT EXISTS (subquery)` is true when the subquery returns no rows. The subquery can refer to the outer `a`.
3. `WHERE NOT EXISTS (SELECT 1 FROM books AS b WHERE b.author = a.name)`

## Solution

```sql
SELECT a.name, a.country
FROM authors AS a
WHERE NOT EXISTS (
  SELECT 1 FROM books AS b WHERE b.author = a.name
);
```

## Expected result

| name | country |
| --- | --- |
| Leo Brandt | Germany |

## Explanation

`NOT EXISTS` checks each author for a matching book and keeps those with none: Leo Brandt. Unlike `NOT IN`, it is not confused by `NULL` values in the subquery, which makes it the safer habit.

## Other accepted answers

```sql
SELECT a.name, a.country FROM authors AS a LEFT JOIN books AS b ON b.author = a.name WHERE b.id IS NULL;
```

## Wrong answers

Feedback: extra-rows

```sql
SELECT a.name, a.country FROM authors AS a;
```
