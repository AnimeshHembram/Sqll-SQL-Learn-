---
id: da-day-006
title: Titles that start with "The"
order: 6
difficulty: beginner
topic: Selecting and filtering
summary: Use LIKE with a wildcard to match the start of a text value.
module: data-analyst
duration: 5
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Match text patterns with LIKE and %
prerequisites:
  - Day 2
---

## Task

Library catalogues often file titles such as "The Last Signal" under L. To check how many need re-filing, return the `title` of every book that **starts with the word "The"**. Row order does not matter.

## Starter query

```sql
SELECT title
FROM books;
```

## Hints

1. `LIKE` matches patterns; `%` stands for any text.
2. The pattern should be the word The, a space, then anything.
3. `WHERE title LIKE 'The %'`

## Solution

```sql
SELECT title
FROM books
WHERE title LIKE 'The %';
```

## Expected result

| title |
| --- |
| The Silent Orchard |
| The Last Signal |

## Explanation

`'The %'` matches titles that begin with "The" followed by a space, so a title such as "Theatre" would not match. Two titles qualify.

## Wrong answers

Feedback: missing-rows

```sql
SELECT title FROM books WHERE title LIKE 'The';
```
