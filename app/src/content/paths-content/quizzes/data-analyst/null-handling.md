---
id: null-handling
title: Missing values
order: 5
difficulty: intermediate
topic: NULL, COUNT and COALESCE
summary: Check that you can find missing values and predict how NULL changes a result.
duration: 4
---

## Five customers, one with no city. What does this query return?

Type: predict-output
Topic: COUNT
Difficulty: beginner

```sql
SELECT COUNT(*) AS rows_counted, COUNT(city) AS cities_counted
FROM customers;
```

- [ ] 5 and 5
- [x] 5 and 4
- [ ] 4 and 4
- [ ] 4 and 5

### Explanation

`COUNT(*)` counts every row, including the one with a missing city. `COUNT(city)` counts only rows where `city` is not `NULL`.

## Which condition finds the customers with no city?

Type: choose-the-clause
Topic: IS NULL
Difficulty: beginner

- [ ] `WHERE city = NULL`
- [ ] `WHERE city = ''`
- [x] `WHERE city IS NULL`
- [ ] `WHERE city = 0`

### Explanation

`NULL` is not equal to anything, not even another `NULL`, so `= NULL` is never true. `IS NULL` is the test for a missing value. An empty string is a known, empty value, not a missing one.

## Authors' birth years are 1980, 1975, 1990, 1968, unknown and 1985. What does `AVG(born)` use?

Type: conceptual
Topic: Aggregates and NULL
Difficulty: intermediate

- [ ] All six values, counting the unknown one as 0
- [x] The five known values only
- [ ] Nothing: the result is `NULL` because one value is missing
- [ ] Only the first value

### Explanation

Aggregate functions skip `NULL`, so `AVG` adds up the five known years and divides by 5. Treating the unknown year as 0 would pull the average down to an impossible value.

## Why might `WHERE city <> 'Mumbai'` return fewer customers than you expect?

Type: multiple-choice
Topic: NULL in conditions
Difficulty: intermediate

- [ ] `<>` is not valid SQL
- [ ] It also removes customers in other cities
- [x] Customers with a `NULL` city are dropped, because the comparison is not true for them
- [ ] It returns customers in Mumbai as well

### Explanation

Comparing with `NULL` gives an unknown result, which `WHERE` treats as not true. Add `OR city IS NULL` if unknown cities belong in the result.

## Which expression shows 0 for a customer whose total is NULL after a LEFT JOIN?

Type: multiple-choice
Topic: COALESCE
Difficulty: beginner

- [ ] `SUM(total) OR 0`
- [ ] `IFNULL(0)`
- [x] `COALESCE(SUM(total), 0)`
- [ ] `SUM(COALESCE(0))`

### Explanation

`COALESCE` returns the first argument that is not `NULL`. When `SUM` has nothing to add and returns `NULL`, `COALESCE` falls back to 0.
