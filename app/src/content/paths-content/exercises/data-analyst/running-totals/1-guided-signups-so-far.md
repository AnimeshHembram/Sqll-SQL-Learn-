---
id: da-signups-so-far
title: Customers signed up so far
order: 1
difficulty: intermediate
topic: Running totals
summary: Count rows cumulatively with COUNT(*) OVER (ORDER BY ...).
module: data-analyst
duration: 6
dataset: bookstore
tables:
  - customers
orderMatters: true
checkColumnNames: true
objectives:
  - Count rows cumulatively
---

## Task

For a "customer base over time" chart, return every customer's `name`, `joined` and `customers_so_far`: how many customers had joined up to and including that date. Sort by `joined`.

**Steps**

1. A running count is an aggregate window with an `ORDER BY`: `COUNT(*) OVER (ORDER BY joined)`.
2. No `PARTITION BY` is needed: every customer is on the same timeline.
3. Sort the output by `joined`.

## Starter query

```sql
SELECT name, joined
FROM customers
ORDER BY joined;
```

## Hints

1. `COUNT(*) OVER ()` would show 5 on every row; the `ORDER BY` inside `OVER` makes it accumulate.
2. The frame runs from the first row to the current row.
3. `COUNT(*) OVER (ORDER BY joined) AS customers_so_far`

## Solution

```sql
SELECT name, joined, COUNT(*) OVER (ORDER BY joined) AS customers_so_far
FROM customers
ORDER BY joined;
```

## Expected result

| name | joined | customers_so_far |
| --- | --- | --- |
| Aisha Khan | 2024-01-15 | 1 |
| Rahul Mehta | 2024-03-02 | 2 |
| Sofia Rossi | 2024-05-20 | 3 |
| Daniel Kim | 2025-02-11 | 4 |
| Meera Pillai | 2025-06-30 | 5 |

## Explanation

The count rises by one with each sign-up, from Aisha Khan (1) to Meera Pillai (5). Running counts work like running totals: `COUNT(*)` counts the rows in the frame instead of adding a value.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT name, joined, COUNT(*) OVER () AS customers_so_far FROM customers ORDER BY joined;
```
