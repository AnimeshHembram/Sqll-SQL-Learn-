---
id: da-day-032
title: Everyone on file
order: 32
difficulty: intermediate
topic: Set operations
summary: Stack two lists into one with UNION.
module: data-analyst
duration: 5
dataset: bookstore
tables:
  - customers
  - authors
orderMatters: false
checkColumnNames: true
objectives:
  - Combine rows from two queries with UNION
prerequisites:
  - Day 1
---

## Task

For a data-protection review, list **every person** the store holds a record of: all customer names and all author names, in a single column called `name`. Each name once. Row order does not matter.

## Starter query

```sql
SELECT name
FROM customers;
```

## Hints

1. You need the rows of two queries one after the other.
2. `UNION` stacks two `SELECT`s with the same number of columns and removes duplicate rows.
3. `SELECT name FROM customers UNION SELECT name FROM authors`

## Solution

```sql
SELECT name FROM customers
UNION
SELECT name FROM authors;
```

## Expected result

| name |
| --- |
| Aisha Khan |
| Ana Ruiz |
| Daniel Kim |
| Ken Ito |
| Leo Brandt |
| Meera Pillai |
| Mira Das |
| Priya Nair |
| Rahul Mehta |
| Sofia Rossi |
| Tomas Varga |

## Explanation

`UNION` appends the second result to the first and removes duplicates, so the 5 customers and 6 authors give 11 names. `UNION ALL` would keep duplicates, which is faster when you know there are none or want them counted.

## Other accepted answers

```sql
SELECT name FROM customers UNION ALL SELECT name FROM authors;
```
