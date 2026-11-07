---
id: da-day-022
title: How long has each customer been with us?
order: 22
difficulty: intermediate
topic: Dates
summary: Measure days from sign-up to a fixed reporting date.
module: data-analyst
duration: 6
dataset: bookstore
tables:
  - customers
orderMatters: false
checkColumnNames: true
objectives:
  - Measure days between dates
  - Use a fixed reporting date
prerequisites:
  - Day 5
  - Data Analyst chapter: Working with dates
---

## Task

For the half-year report dated **2025-06-30**, return each customer's `name` and `days_as_customer`: whole days from `joined` to `'2025-06-30'`. Row order does not matter.

## Starter query

```sql
SELECT name, joined
FROM customers;
```

## Hints

1. `julianday(a) - julianday(b)` is the number of days from b to a.
2. Use the fixed date `'2025-06-30'`, not today's date.
3. `CAST(julianday('2025-06-30') - julianday(joined) AS INTEGER) AS days_as_customer`

## Solution

```sql
SELECT name,
  CAST(julianday('2025-06-30') - julianday(joined) AS INTEGER) AS days_as_customer
FROM customers;
```

## Expected result

| name | days_as_customer |
| --- | --- |
| Aisha Khan | 532 |
| Rahul Mehta | 485 |
| Sofia Rossi | 406 |
| Daniel Kim | 139 |
| Meera Pillai | 0 |

## Explanation

A fixed reporting date makes the answer the same every time it is run. Meera Pillai joined on the reporting date itself, so her tenure is 0 days.
