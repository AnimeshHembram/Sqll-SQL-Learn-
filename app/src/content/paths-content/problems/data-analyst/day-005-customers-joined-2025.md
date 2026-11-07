---
id: da-day-005
title: New customers this year
order: 5
difficulty: beginner
topic: Selecting and filtering
summary: Filter ISO dates to find the customers who joined in 2025.
module: data-analyst
duration: 5
dataset: bookstore
tables:
  - customers
orderMatters: false
checkColumnNames: true
objectives:
  - Filter dates stored as ISO text
prerequisites:
  - Day 3
---

## Task

Marketing wants to welcome customers who joined in **2025**. Return `name` and `joined`. Row order does not matter.

## Starter query

```sql
SELECT name, joined
FROM customers;
```

## Hints

1. Dates are stored as text like `2025-02-11`, which compare correctly.
2. Customers who joined in 2025 have `joined` on or after `'2025-01-01'`.
3. `WHERE joined >= '2025-01-01'`

## Solution

```sql
SELECT name, joined
FROM customers
WHERE joined >= '2025-01-01';
```

## Expected result

| name | joined |
| --- | --- |
| Daniel Kim | 2025-02-11 |
| Meera Pillai | 2025-06-30 |

## Explanation

ISO dates sort like text, so `joined >= '2025-01-01'` keeps the two 2025 sign-ups.

## Other accepted answers

```sql
SELECT name, joined FROM customers WHERE joined LIKE '2025%';
```

```sql
SELECT name, joined FROM customers WHERE strftime('%Y', joined) = '2025';
```
