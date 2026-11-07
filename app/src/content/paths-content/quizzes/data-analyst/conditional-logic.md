---
id: conditional-logic
title: Conditional logic with CASE
order: 2
difficulty: intermediate
topic: CASE and conditional aggregation
summary: Check that you can predict CASE results and use CASE inside aggregates.
duration: 4
---

## A book costs 11.25. Which label does this expression give it?

Type: predict-output
Topic: CASE order
Difficulty: beginner

```sql
CASE
  WHEN price < 15 THEN 'Standard'
  WHEN price < 12 THEN 'Budget'
  ELSE 'Premium'
END
```

- [ ] `'Budget'`
- [x] `'Standard'`
- [ ] `'Premium'`
- [ ] `NULL`

### Explanation

Conditions are checked from top to bottom and the first true one wins. 11.25 is below 15, so the first condition already matches and the second is never checked.

## What does a CASE expression return when no WHEN matches and there is no ELSE?

Type: conceptual
Topic: ELSE
Difficulty: beginner

- [ ] An error
- [ ] An empty string
- [ ] 0
- [x] `NULL`

### Explanation

Without `ELSE`, a row that matches no condition gets `NULL`. That row then disappears from filters such as `WHERE shelf = 'Crime'` and is not counted by `COUNT(shelf)`.

## Which expression counts only the delivered orders in each group?

Type: multiple-choice
Topic: Conditional aggregation
Difficulty: intermediate

- [ ] `COUNT(status = 'delivered')`
- [x] `SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)`
- [ ] `CASE WHEN status = 'delivered' THEN COUNT(*) END`
- [ ] `SUM(status) WHERE status = 'delivered'`

### Explanation

The `CASE` gives 1 for a delivered order and 0 for any other, and `SUM` adds them up per group. `COUNT(status = 'delivered')` counts every row with a non-NULL comparison result, delivered or not.

## Where can a CASE expression be used?

Type: choose-the-clause
Topic: CASE
Difficulty: beginner

- [ ] Only in `SELECT`
- [ ] Only in `WHERE`
- [x] Anywhere a value can go, such as `SELECT`, `WHERE`, `GROUP BY` and `ORDER BY`
- [ ] Only inside aggregate functions

### Explanation

`CASE ... END` is an expression that produces a value, so it can appear wherever a value is allowed: to label rows, filter them, group them, sort them or feed an aggregate.

## Why does this query fail?

Type: find-the-error
Topic: CASE syntax
Difficulty: beginner

```sql
SELECT title, CASE WHEN price < 12 THEN 'Budget' ELSE 'Other' AS band
FROM books;
```

- [ ] `ELSE` must come before `WHEN`
- [x] The `CASE` expression has no `END`
- [ ] Text values must use double quotes
- [ ] `AS` cannot name a `CASE` expression

### Explanation

Every `CASE` must be closed with `END` before you name it: `... ELSE 'Other' END AS band`.
