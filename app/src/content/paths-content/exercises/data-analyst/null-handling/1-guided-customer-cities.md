---
id: da-customer-cities
title: A city for every customer
order: 1
difficulty: beginner
topic: COALESCE
summary: Show 'Unknown' where a customer's city is missing.
module: data-analyst
duration: 5
dataset: bookstore
tables:
  - customers
orderMatters: false
checkColumnNames: true
objectives:
  - Replace NULL with a label using COALESCE
---

## Task

The mailing list export must not have blank cities. Return every customer with:

- `name`
- `city`: the customer's city, or `'Unknown'` when it is missing

Row order does not matter.

**Steps**

1. The starter query returns names and cities; one city is `NULL`.
2. Wrap `city` in `COALESCE(city, 'Unknown')`.
3. Name the result `city` with `AS city`.

## Starter query

```sql
SELECT name, city
FROM customers;
```

## Hints

1. `COALESCE` returns its first argument that is not `NULL`.
2. With `COALESCE(city, 'Unknown')`, a known city is kept and a missing one becomes `'Unknown'`.
3. `SELECT name, COALESCE(city, 'Unknown') AS city FROM customers`.

## Solution

```sql
SELECT name, COALESCE(city, 'Unknown') AS city
FROM customers;
```

## Expected result

| name | city |
| --- | --- |
| Aisha Khan | Bangalore |
| Rahul Mehta | Mumbai |
| Sofia Rossi | Unknown |
| Daniel Kim | Bangalore |
| Meera Pillai | Chennai |

## Explanation

Four customers keep their city. Sofia Rossi's city is `NULL`, so `COALESCE` moves on to its second argument and returns `'Unknown'`.

## Other accepted answers

```sql
SELECT name, CASE WHEN city IS NULL THEN 'Unknown' ELSE city END AS city FROM customers;
```
