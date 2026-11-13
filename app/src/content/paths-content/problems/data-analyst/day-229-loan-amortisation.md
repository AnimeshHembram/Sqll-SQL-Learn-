---
id: da-day-229
title: A loan repayment schedule
order: 229
difficulty: advanced
topic: Forecasting and planning
summary: Compute the fixed monthly instalment and build the month-by-month schedule with a recursive CTE.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute an instalment with POWER
  - Build a schedule with a recursive CTE
prerequisites:
  - Day 187
  - Day 203
---

## Task

A ₹1,00,000 loan at 12% a year is repaid in 6 equal monthly instalments (starter query). With monthly rate `r = annual_rate_pct / 100 / 12` and `n` months, the instalment is:

`emi = principal × r × (1 + r)^n / ((1 + r)^n − 1)`

Each month, interest is `opening × r`, the rest of the instalment repays principal, and the closing balance is `opening − principal_paid`. Return `month` (1 to 6), `opening`, `emi`, `interest`, `principal_paid` and `closing`, all rounded to 2 decimal places. Sort by `month`.

## Starter query

```sql
WITH RECURSIVE loan(principal, annual_rate_pct, months) AS (
  VALUES (100000.0, 12.0, 6)
)
SELECT principal, annual_rate_pct, months
FROM loan;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. The `RECURSIVE` keyword is already there for the schedule.
2. Compute `r` and `emi` once in a CTE with `POWER(1 + r, months)`.
3. Recursive schedule: the anchor is month 1 with `opening = principal`; each step adds 1 to the month and uses the previous row's `opening - (emi - opening * r)` as the new opening, while `month < months`. Round only in the final `SELECT`.

## Solution

```sql
WITH RECURSIVE loan(principal, annual_rate_pct, months) AS (
  VALUES (100000.0, 12.0, 6)
),
terms AS (
  SELECT principal, months, annual_rate_pct / 100 / 12 AS r,
    principal * (annual_rate_pct / 100 / 12) * POWER(1 + annual_rate_pct / 100 / 12, months)
      / (POWER(1 + annual_rate_pct / 100 / 12, months) - 1) AS emi
  FROM loan
),
schedule(month, opening) AS (
  SELECT 1, principal FROM terms
  UNION ALL
  SELECT s.month + 1, s.opening - (t.emi - s.opening * t.r)
  FROM schedule AS s, terms AS t
  WHERE s.month < t.months
)
SELECT s.month, ROUND(s.opening, 2) AS opening, ROUND(t.emi, 2) AS emi, ROUND(s.opening * t.r, 2) AS interest,
  ROUND(t.emi - s.opening * t.r, 2) AS principal_paid, ROUND(s.opening - (t.emi - s.opening * t.r), 2) AS closing
FROM schedule AS s, terms AS t
ORDER BY s.month;
```

## Expected result

| month | opening | emi | interest | principal_paid | closing |
| --- | --- | --- | --- | --- | --- |
| 1 | 100000 | 17254.84 | 1000 | 16254.84 | 83745.16 |
| 2 | 83745.16 | 17254.84 | 837.45 | 16417.39 | 67327.78 |
| 3 | 67327.78 | 17254.84 | 673.28 | 16581.56 | 50746.22 |
| 4 | 50746.22 | 17254.84 | 507.46 | 16747.37 | 33998.84 |
| 5 | 33998.84 | 17254.84 | 339.99 | 16914.85 | 17084 |
| 6 | 17084 | 17254.84 | 170.84 | 17084 | 0 |

## Explanation

An equal monthly instalment (EMI) is found once, from the loan terms, with `POWER(1 + r, n)`. Each month, interest is charged on the balance still owed, and the rest of the instalment repays principal. As the balance falls, interest falls (1,000 in month 1, 170.84 in month 6) and the principal repaid rises, while the instalment stays at 17,254.84.

The recursive CTE carries each month's opening balance to the next: `opening − (emi − opening × r)`. Rounding happens only for display, so the schedule ends at exactly 0 after six payments, which is the check that the instalment is right.

**Common mistake:** a "flat" instalment of principal ÷ months plus interest on the original amount. It charges interest on money already repaid, so the instalment is too high and the schedule ends below zero.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE loan(principal, annual_rate_pct, months) AS ( VALUES (100000.0, 12.0, 6) ), terms AS (SELECT principal, months, annual_rate_pct / 100 / 12 AS r, principal / months + principal * annual_rate_pct / 100 / 12 AS emi FROM loan), schedule(month, opening) AS (SELECT 1, principal FROM terms UNION ALL SELECT s.month + 1, s.opening - (t.emi - s.opening * t.r) FROM schedule AS s, terms AS t WHERE s.month < t.months) SELECT s.month, ROUND(s.opening, 2) AS opening, ROUND(t.emi, 2) AS emi, ROUND(s.opening * t.r, 2) AS interest, ROUND(t.emi - s.opening * t.r, 2) AS principal_paid, ROUND(s.opening - (t.emi - s.opening * t.r), 2) AS closing FROM schedule AS s, terms AS t ORDER BY s.month;
```
