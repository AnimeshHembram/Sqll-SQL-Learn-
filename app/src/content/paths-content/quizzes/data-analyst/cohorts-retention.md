---
id: cohorts-retention
title: Cohorts and retention
order: 8
difficulty: advanced
topic: Cohorts, month differences and retention rates
summary: Check that you can define cohorts, count months between dates and calculate retention.
duration: 5
---

## What is a cohort?

Type: conceptual
Topic: Cohorts
Difficulty: beginner

- [ ] All customers who are active this month
- [x] A group of customers who started in the same period, followed over time
- [ ] The customers with the highest spend
- [ ] A table that stores one row per order

### Explanation

A cohort is fixed by its start, such as "first purchase in January 2025". Because the group never changes, changes in its activity show real changes in behaviour.

## What does this expression return?

Type: predict-output
Topic: Month differences
Difficulty: intermediate

```sql
SELECT (2025 * 12 + 1) - (2024 * 12 + 12) AS months_since;
```

- [ ] -11
- [x] 1
- [ ] 12
- [ ] 13

### Explanation

Counting months as year × 12 + month gives December 2024 the number 24300 and January 2025 the number 24301, so the difference is 1. Subtracting month numbers alone would give 1 − 12 = −11.

## Which expression turns a date into its quarter, 1 to 4?

Type: multiple-choice
Topic: Quarters
Difficulty: intermediate

- [ ] `CAST(strftime('%m', d) AS INTEGER) / 3`
- [x] `(CAST(strftime('%m', d) AS INTEGER) + 2) / 3`
- [ ] `CAST(strftime('%m', d) AS INTEGER) / 4`
- [ ] `strftime('%Q', d)`

### Explanation

With whole-number division, (1 + 2) / 3 = 1 and (3 + 2) / 3 = 1, (4 + 2) / 3 = 2, up to (12 + 2) / 3 = 4. Without adding 2, January and February would become quarter 0. SQLite has no `%Q` format.

## A cohort of 2 customers has 1 active customer in month 1. A cohort of 200 has 60. Which is the fairest comparison?

Type: conceptual
Topic: Retention rates
Difficulty: intermediate

- [ ] 1 against 60 active customers
- [x] 50.0% against 30.0% retention
- [ ] The larger cohort is better because it has more active customers
- [ ] They cannot be compared at all

### Explanation

Dividing by the cohort size turns counts into rates, which can be compared across cohorts of any size. With very small cohorts, a rate can change a lot from one customer, so it is worth showing the size too.

## Why should a cancelled order not decide a customer's cohort?

Type: conceptual
Topic: Start event
Difficulty: advanced

- [ ] Cancelled orders have no date
- [ ] SQLite cannot filter on status inside `MIN`
- [x] The customer never really became a buyer then, so the start event and the activity must use the same rules
- [ ] Cancelled orders are always the most recent ones

### Explanation

If a cancelled order counted as a first purchase, the customer would join a cohort they never entered, and month 0 would no longer be 100%. Apply the same filter to the start event and to the activity.
