---
id: da-day-001
title: Customer contact list
order: 1
difficulty: beginner
topic: Selecting and filtering
summary: Build a simple contact list from the customers table, sorted by name.
module: data-analyst
duration: 4
dataset: bookstore
tables:
  - customers
orderMatters: true
checkColumnNames: true
objectives:
  - Choose columns with SELECT
  - Sort text with ORDER BY
prerequisites:
  - Learn SQL: Introduction to SELECT
---

## Task

The support team needs a contact list. Return every customer's `name` and `city`, **sorted by name** from A to Z.

## Starter query

```sql
SELECT *
FROM customers;
```

## Hints

1. You only need two columns, not `*`.
2. Sorting from A to Z is `ORDER BY name`.
3. `SELECT name, city FROM customers ORDER BY name;`

## Solution

```sql
SELECT name, city
FROM customers
ORDER BY name;
```

## Expected result

| name | city |
| --- | --- |
| Aisha Khan | Bangalore |
| Daniel Kim | Bangalore |
| Meera Pillai | Chennai |
| Rahul Mehta | Mumbai |
| Sofia Rossi | NULL |

## Explanation

Listing only the columns a person needs keeps a report readable. `ORDER BY name` sorts text alphabetically; Sofia Rossi's city is `NULL` because she has not given one.

## Wrong answers

Feedback: wrong-order

```sql
SELECT name, city FROM customers ORDER BY name DESC;
```
