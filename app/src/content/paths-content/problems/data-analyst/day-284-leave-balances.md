---
id: da-day-284
title: Leave balances at the end of March
order: 284
difficulty: advanced
topic: Workforce analytics
summary: Accrue leave month by month from the join date, add capped carry-over, and subtract leave taken so far.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Accrue an entitlement by completed months
  - Apply a cap and a cut-off date
prerequisites:
  - Day 219
  - Day 204
---

## Task

Employees earn **1.5 days** of leave for each **completed month** of service in 2025 (from 1 January 2025, or from their join date if later), up to **31 March 2025**. A month is complete once the same day of the next month is reached. Carry-over from 2024 is capped at **10 days**. Leave taken counts only up to 31 March.

Return `employee`, `carried_over` (after the cap), `earned`, `taken` and `balance` (carried over + earned − taken). Sort by `balance` from highest, then `employee`.

## Starter query

```sql
WITH employees(employee, joined, carried_in) AS (
  VALUES ('Anu', '2023-06-01', 8), ('Bala', '2024-01-15', 0), ('Chen', '2025-02-01', 0), ('Dev', '2020-04-01', 12)
),
leave_taken(employee, taken_on, days) AS (
  VALUES ('Anu', '2025-02-10', 3), ('Anu', '2025-04-21', 5), ('Bala', '2025-03-03', 2), ('Dev', '2025-01-20', 10), ('Dev', '2025-05-12', 4)
)
SELECT e.employee, e.joined, e.carried_in, t.taken_on, t.days
FROM employees AS e
LEFT JOIN leave_taken AS t ON t.employee = e.employee
ORDER BY e.employee;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Accrual start: `MAX(joined, '2025-01-01')`. Completed months to 31 March: `(2025 * 12 + 3) - (year * 12 + month)` of the start. (The cut-off is the last day of a month, so the day of the month never holds a month back here; Day 219 shows the general rule.)
3. Taken up to the date: a `LEFT JOIN` with `taken_on <= '2025-03-31'` in the join condition, then `COALESCE(SUM(days), 0)`. Carry-over: `MIN(carried_in, 10)`.

## Solution

```sql
WITH employees(employee, joined, carried_in) AS (
  VALUES ('Anu', '2023-06-01', 8), ('Bala', '2024-01-15', 0), ('Chen', '2025-02-01', 0), ('Dev', '2020-04-01', 12)
),
leave_taken(employee, taken_on, days) AS (
  VALUES ('Anu', '2025-02-10', 3), ('Anu', '2025-04-21', 5), ('Bala', '2025-03-03', 2), ('Dev', '2025-01-20', 10), ('Dev', '2025-05-12', 4)
),
starts AS (
  SELECT employee, carried_in, MAX(joined, '2025-01-01') AS accrual_start FROM employees
),
months AS (
  SELECT employee, carried_in,
    (2025 * 12 + 3) - (CAST(strftime('%Y', accrual_start) AS INTEGER) * 12 + CAST(strftime('%m', accrual_start) AS INTEGER)) AS completed_months
  FROM starts
),
taken AS (
  SELECT e.employee, COALESCE(SUM(t.days), 0) AS taken
  FROM employees AS e
  LEFT JOIN leave_taken AS t ON t.employee = e.employee AND t.taken_on <= '2025-03-31'
  GROUP BY e.employee
)
SELECT m.employee, MIN(m.carried_in, 10) AS carried_over, m.completed_months * 1.5 AS earned, t.taken,
  MIN(m.carried_in, 10) + m.completed_months * 1.5 - t.taken AS balance
FROM months AS m
JOIN taken AS t ON t.employee = m.employee
ORDER BY balance DESC, m.employee;
```

## Expected result

| employee | carried_over | earned | taken | balance |
| --- | --- | --- | --- | --- |
| Anu | 8 | 3 | 3 | 8 |
| Dev | 10 | 3 | 10 | 3 |
| Chen | 0 | 1.5 | 0 | 1.5 |
| Bala | 0 | 3 | 2 | 1 |

## Explanation

Leave balances combine three rules, and each one appears in the data. Earned leave is 1.5 days per completed month since the accrual start: two months (January and February) for anyone employed from 1 January, but only one for Chen, who joined on 1 February. Carry-over is capped at 10 days, so Dev's 12 days become 10. And leave taken after the cut-off date (Anu's 5 days in April, Dev's 4 days in May) does not count yet.

The `LEFT JOIN` puts the date cut-off in the join condition so that Chen, who has taken no leave, still appears with 0 taken. Everyone's balance is positive, with Anu's 8 days the highest.

**Common mistake:** ignoring the cap and the cut-off. Leave booked for April and May is subtracted early, so Anu's balance falls from 8 to 3, and Dev keeps 2 days above the cap but loses 4 to May leave, ending at 1 instead of 3.

## Wrong answers

Feedback: incorrect-output

```sql
WITH employees(employee, joined, carried_in) AS ( VALUES ('Anu', '2023-06-01', 8), ('Bala', '2024-01-15', 0), ('Chen', '2025-02-01', 0), ('Dev', '2020-04-01', 12) ), leave_taken(employee, taken_on, days) AS ( VALUES ('Anu', '2025-02-10', 3), ('Anu', '2025-04-21', 5), ('Bala', '2025-03-03', 2), ('Dev', '2025-01-20', 10), ('Dev', '2025-05-12', 4) ), months AS (SELECT employee, carried_in, (2025 * 12 + 3) - (CAST(strftime('%Y', MAX(joined, '2025-01-01')) AS INTEGER) * 12 + CAST(strftime('%m', MAX(joined, '2025-01-01')) AS INTEGER)) AS completed_months FROM employees), taken AS (SELECT e.employee, COALESCE(SUM(t.days), 0) AS taken FROM employees AS e LEFT JOIN leave_taken AS t ON t.employee = e.employee GROUP BY e.employee) SELECT m.employee, m.carried_in AS carried_over, m.completed_months * 1.5 AS earned, t.taken, m.carried_in + m.completed_months * 1.5 - t.taken AS balance FROM months AS m JOIN taken AS t ON t.employee = m.employee ORDER BY balance DESC, m.employee;
```
