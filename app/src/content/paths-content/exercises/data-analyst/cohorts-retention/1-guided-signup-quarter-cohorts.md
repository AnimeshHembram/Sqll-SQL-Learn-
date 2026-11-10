---
id: da-signup-quarter-cohorts
title: Cohort sizes by sign-up quarter
order: 1
difficulty: intermediate
topic: Cohorts
summary: Label each customer with the quarter they signed up in, and count each cohort.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - customers
orderMatters: true
checkColumnNames: true
objectives:
  - Build quarterly cohort labels
---

## Task

Group customers into cohorts by the **quarter they signed up**. Return `cohort` in the form `2024-Q1` and `customers`. Sort by `cohort`.

**Steps**

1. The starter query shows each sign-up date. Build the quarter number with `(CAST(strftime('%m', joined) AS INTEGER) + 2) / 3`.
2. Join the year, `'-Q'` and the quarter into one label with `||`: `strftime('%Y', joined) || '-Q' || ...`.
3. Group by the label, count the customers and sort by the label.

## Starter query

```sql
SELECT name, joined
FROM customers;
```

## Hints

1. Months 1 to 3 must become 1, months 4 to 6 must become 2, and so on. Whole-number division by 3 after adding 2 does this.
2. Text and numbers can be joined with `||`; SQLite turns the number into text.
3. `SELECT strftime('%Y', joined) || '-Q' || ((CAST(strftime('%m', joined) AS INTEGER) + 2) / 3) AS cohort, COUNT(*) AS customers FROM customers GROUP BY cohort ORDER BY cohort`

## Solution

```sql
SELECT strftime('%Y', joined) || '-Q' || ((CAST(strftime('%m', joined) AS INTEGER) + 2) / 3) AS cohort,
  COUNT(*) AS customers
FROM customers
GROUP BY cohort
ORDER BY cohort;
```

## Expected result

| cohort | customers |
| --- | --- |
| 2024-Q1 | 2 |
| 2024-Q2 | 1 |
| 2025-Q1 | 1 |
| 2025-Q2 | 1 |

## Explanation

January and March 2024 both fall in 2024-Q1, so that cohort has two customers; each other quarter has one. Quarters smooth out small monthly numbers. Because the label starts with the year, sorting it as text also sorts it in time order.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT strftime('%Y', joined) || '-Q' || (CAST(strftime('%m', joined) AS INTEGER) / 3) AS cohort, COUNT(*) AS customers FROM customers GROUP BY cohort ORDER BY cohort;
```
