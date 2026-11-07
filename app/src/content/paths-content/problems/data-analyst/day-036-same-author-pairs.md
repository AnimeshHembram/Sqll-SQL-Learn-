---
id: da-day-036
title: Pairs of books by the same author
order: 36
difficulty: advanced
topic: Joins
summary: Join a table to itself to pair up related rows.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Join a table to itself
  - Remove mirrored pairs
prerequisites:
  - Day 15
---

## Task

For "if you liked this, try that" cards, return every **pair of different books by the same author**, each pair once: `first_title` (the book with the lower id), `second_title` and `author`. Row order does not matter.

## Starter query

```sql
SELECT title, author
FROM books;
```

## Hints

1. Join `books` to itself with two aliases, `a` and `b`.
2. Match on `a.author = b.author`. Without another condition every book pairs with itself, and each pair appears twice.
3. `ON a.author = b.author AND a.id < b.id`

## Solution

```sql
SELECT a.title AS first_title, b.title AS second_title, a.author
FROM books AS a
JOIN books AS b ON a.author = b.author AND a.id < b.id;
```

## Expected result

| first_title | second_title | author |
| --- | --- | --- |
| The Silent Orchard | The Last Signal | Mira Das |

## Explanation

A self-join treats one table as two. `a.id < b.id` removes a book paired with itself and keeps only one direction of each pair. Mira Das is the only author with two books in stock.

## Wrong answers

Feedback: extra-rows

```sql
SELECT a.title AS first_title, b.title AS second_title, a.author FROM books AS a JOIN books AS b ON a.author = b.author AND a.id <> b.id;
```
