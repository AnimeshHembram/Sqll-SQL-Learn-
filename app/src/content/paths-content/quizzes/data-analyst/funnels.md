---
id: funnels
title: Funnels and conversion
order: 7
difficulty: intermediate
topic: Funnel steps, UNION ALL and conversion
summary: Check that you can build a funnel, calculate conversion and keep steps in order.
duration: 4
---

## Why does a funnel count `COUNT(DISTINCT user_id)` at each step instead of `COUNT(*)`?

Type: conceptual
Topic: Counting people
Difficulty: beginner

- [ ] `COUNT(*)` does not work with `GROUP BY`
- [x] A funnel counts people; a person who repeats a step must count once
- [ ] `COUNT(DISTINCT ...)` is faster
- [ ] `COUNT(*)` ignores `NULL`

### Explanation

An event log has one row per action. A user who adds to the cart five times would count five times with `COUNT(*)`, making the step look busier than it is.

## Which keyword stacks one row per funnel step without removing any rows?

Type: choose-the-clause
Topic: UNION ALL
Difficulty: beginner

- [ ] `JOIN`
- [ ] `UNION`
- [x] `UNION ALL`
- [ ] `INTERSECT`

### Explanation

`UNION ALL` appends the rows of each `SELECT`. `UNION` also removes duplicate rows, which could merge two steps that happen to have the same values.

## Why does this statement fail?

Type: find-the-error
Topic: UNION ALL columns
Difficulty: intermediate

```sql
SELECT 1 AS step_no, 'Signed up' AS step, COUNT(*) AS customers FROM customers
UNION ALL
SELECT 2, COUNT(DISTINCT customer_id) FROM orders;
```

- [ ] `UNION ALL` cannot follow `COUNT(*)`
- [x] The second `SELECT` returns two columns but the first returns three
- [ ] The second `SELECT` needs its own column aliases
- [ ] `step_no` must be text

### Explanation

Every `SELECT` in a `UNION ALL` must return the same number of columns. The second one is missing the step name.

## A funnel has 7 visitors, 5 who added to the cart and 3 who checked out. What is the conversion from cart to checkout?

Type: multiple-choice
Topic: Step conversion
Difficulty: intermediate

- [ ] 42.9%
- [x] 60.0%
- [ ] 71.4%
- [ ] 166.7%

### Explanation

Step conversion divides a step by the previous step: 3 ÷ 5 = 60.0%. Dividing by the first step (3 ÷ 7 = 42.9%) gives conversion from the start, a different measure.

## In a strict funnel, a user has a purchase at 09:30 but no visit. What does `purchase_at > visit_at` return for them?

Type: predict-output
Topic: NULL comparisons
Difficulty: advanced

```sql
SELECT '2025-05-03 09:30' > NULL AS purchased_after_visit;
```

- [ ] 1
- [ ] 0
- [x] `NULL`
- [ ] An error

### Explanation

Any comparison with `NULL` returns `NULL`, which is not true. `CASE WHEN purchase_at > visit_at THEN 1 ELSE 0 END` therefore gives 0, so a step with a missing earlier step is not counted.
