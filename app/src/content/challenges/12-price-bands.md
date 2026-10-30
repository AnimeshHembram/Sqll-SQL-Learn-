---
id: price-bands
title: Sort books into price bands
order: 12
difficulty: advanced
topic: CASE
summary: Label every book as budget, standard or premium with a CASE expression.
duration: 10
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Choose a value with a CASE expression
  - Order conditions so each row gets exactly one label
prerequisites:
  - Comparison operators from the lesson "Filtering data with WHERE"
  - CASE, explained in the task below
---

## Task

Return every book with a price band, using two columns:

- `title`
- `band`: `'budget'` when the price is below 12, `'premium'` when it is above 15, and `'standard'` for everything else

Row order does not matter. The band names are lowercase text.

**Before you start:** a `CASE` expression checks its conditions in order and returns the value of the first one that is true. `ELSE` gives the value when none are true.

```sql syntax
CASE
  WHEN condition1 THEN value1
  WHEN condition2 THEN value2
  ELSE other_value
END AS column_name
```

## Starter query

```sql
SELECT title, price
FROM books;
```

## Hints

1. Replace `price` in the starter query with a `CASE` expression named `band`.
2. Two `WHEN` conditions are enough: one for prices below 12, one for prices above 15. `ELSE` handles the rest.
3. `CASE WHEN price < 12 THEN 'budget' WHEN price > 15 THEN 'premium' ELSE 'standard' END AS band`.

## Solution

```sql
SELECT
  title,
  CASE
    WHEN price < 12 THEN 'budget'
    WHEN price > 15 THEN 'premium'
    ELSE 'standard'
  END AS band
FROM books;
```

## Expected result

| title | band |
| --- | --- |
| The Silent Orchard | standard |
| Rivers of Glass | premium |
| Counting Stars | budget |
| The Last Signal | premium |
| Paper Lanterns | budget |
| A Quiet Ledger | standard |

## Explanation

For each book, SQLite checks the `WHEN` conditions from top to bottom and uses the first one that is true. A price of 12.99 is neither below 12 nor above 15, so it falls through to `ELSE` and becomes `'standard'`.

`CASE` is an expression, so it can be used anywhere a value can: in `SELECT`, `WHERE`, `ORDER BY`, or inside an aggregate.

## Other accepted answers

```sql
SELECT title, CASE WHEN price > 15 THEN 'premium' WHEN price >= 12 THEN 'standard' ELSE 'budget' END AS band FROM books;
```

## Wrong answers

Feedback: incorrect-output

```sql
SELECT title, CASE WHEN price < 12 THEN 'Budget' WHEN price > 15 THEN 'Premium' ELSE 'Standard' END AS band FROM books;
```

Feedback: incorrect-output

```sql
SELECT title, CASE WHEN price < 12 THEN 'budget' WHEN price > 15 THEN 'premium' END AS band FROM books;
```
