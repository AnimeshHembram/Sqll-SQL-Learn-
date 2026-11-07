---
id: da-day-053
title: One-line catalogue entries
order: 53
difficulty: intermediate
topic: Text functions
summary: Build readable text from several columns, including a formatted number.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Format a number as text
  - Combine several columns into one string
prerequisites:
  - Day 52
---

## Task

For a plain-text catalogue, return one column `entry` per book in the form `Rivers of Glass (2021) by Tomas Varga, 15.50` — the price always with two decimals. Sort by `entry`.

## Starter query

```sql
SELECT title || ' by ' || author AS entry
FROM books;
```

## Hints

1. Join every piece with `||`, including the brackets and the comma.
2. `printf('%.2f', price)` turns 15.5 into `'15.50'`; joining `price` directly would give `15.5`.
3. `title || ' (' || year || ') by ' || author || ', ' || printf('%.2f', price) AS entry`

## Solution

```sql
SELECT title || ' (' || year || ') by ' || author || ', ' || printf('%.2f', price) AS entry
FROM books
ORDER BY entry;
```

## Expected result

| entry |
| --- |
| A Quiet Ledger (2020) by Ana Ruiz, 14.75 |
| Counting Stars (2015) by Priya Nair, 9.99 |
| Paper Lanterns (2019) by Ken Ito, 11.25 |
| Rivers of Glass (2021) by Tomas Varga, 15.50 |
| The Last Signal (2023) by Mira Das, 18.00 |
| The Silent Orchard (2018) by Mira Das, 12.99 |

## Explanation

Numbers joined to text lose trailing zeros, so a price of 15.50 would read 15.5. `printf` formats a number exactly, which matters whenever text is shown to customers.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT title || ' (' || year || ') by ' || author || ', ' || price AS entry FROM books ORDER BY entry;
```
