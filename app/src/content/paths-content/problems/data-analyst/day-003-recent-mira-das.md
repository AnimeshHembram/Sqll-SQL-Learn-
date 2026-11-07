---
id: da-day-003
title: Recent books by one author
order: 3
difficulty: beginner
topic: Selecting and filtering
summary: Combine two conditions with AND to answer a specific catalogue question.
module: data-analyst
duration: 5
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Combine conditions with AND
prerequisites:
  - Day 2
---

## Task

A customer asks for **Mira Das** books published **after 2019**. Return `title` and `year`. Row order does not matter.

## Starter query

```sql
SELECT title, year
FROM books
WHERE author = 'Mira Das';
```

## Hints

1. Both conditions must be true at the same time.
2. Join two conditions with `AND`.
3. `WHERE author = 'Mira Das' AND year > 2019`

## Solution

```sql
SELECT title, year
FROM books
WHERE author = 'Mira Das' AND year > 2019;
```

## Expected result

| title | year |
| --- | --- |
| The Last Signal | 2023 |

## Explanation

Mira Das has two books; only *The Last Signal* (2023) was published after 2019. `AND` keeps rows where every condition is true.

## Wrong answers

Feedback: extra-rows

```sql
SELECT title, year FROM books WHERE author = 'Mira Das' OR year > 2019;
```
