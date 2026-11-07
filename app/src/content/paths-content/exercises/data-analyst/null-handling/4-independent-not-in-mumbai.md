---
id: da-not-in-mumbai
title: Customers outside Mumbai
order: 4
difficulty: intermediate
topic: NULL in conditions
summary: Write a filter that keeps rows with a missing value when the business needs them.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - customers
orderMatters: false
checkColumnNames: true
objectives:
  - Notice when a condition silently drops NULL rows
  - Include missing values explicitly
---

## Task

A campaign targets every customer who is **not known to be in Mumbai**, including customers whose city is unknown. Return their `name`.

## Starter query

```sql
SELECT name, city
FROM customers;
```

## Hints

1. `WHERE city <> 'Mumbai'` looks right, but check how many rows it returns.
2. For a customer with no city, `city <> 'Mumbai'` is not true, so they are dropped.
3. `WHERE city <> 'Mumbai' OR city IS NULL`, and select only `name`.

## Solution

```sql
SELECT name
FROM customers
WHERE city <> 'Mumbai' OR city IS NULL;
```

## Expected result

| name |
| --- |
| Aisha Khan |
| Sofia Rossi |
| Daniel Kim |
| Meera Pillai |

## Explanation

Rahul Mehta is the only customer known to be in Mumbai. Sofia Rossi's city is unknown, so a plain `<>` test drops her; `OR city IS NULL` brings her back.

## Other accepted answers

```sql
SELECT name FROM customers WHERE COALESCE(city, '') <> 'Mumbai';
```

## Wrong answers

Feedback: missing-rows

```sql
SELECT name FROM customers WHERE city <> 'Mumbai';
```
