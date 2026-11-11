---
id: da-day-166
title: Unpivot a spreadsheet export
order: 166
difficulty: intermediate
topic: Data engineering
summary: Turn one column per month into rows, keeping zeros and blanks apart, and report who is missing.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Unpivot columns into rows
  - Keep NULL and zero apart
prerequisites:
  - Day 37
  - Day 166
---

## Task

Finance exported a budget sheet with one column per month (in the starter query). A blank cell (`NULL`) means the department has not entered that month; `0` is a real budget of zero. Turn the sheet into one row per department and month, then summarise each month.

Return `month` (`'Jan'`, `'Feb'`, `'Mar'`), `total`, `departments_reporting` and `missing` (the departments that have not entered that month, alphabetical and joined with `', '`, or `NULL` if none). Sort in calendar order.

## Starter query

```sql
WITH budget_sheet(dept, jan, feb, mar) AS (
  VALUES ('Ops', 100, 120, NULL), ('Sales', 200, NULL, 210), ('HR', 50, 50, 50), ('IT', 0, 80, 90)
)
SELECT dept, jan, feb, mar
FROM budget_sheet;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Unpivot with `UNION ALL`: `SELECT dept, 1 AS month_no, 'Jan' AS month, jan AS amount FROM budget_sheet UNION ALL SELECT dept, 2, 'Feb', feb FROM budget_sheet ...`.
3. Per month: `SUM(amount)`, `COUNT(amount)` (skips blanks but counts zeros) and `group_concat(CASE WHEN amount IS NULL THEN dept END, ', ' ORDER BY dept)`; sort by `month_no`.

## Solution

```sql
WITH budget_sheet(dept, jan, feb, mar) AS (
  VALUES ('Ops', 100, 120, NULL), ('Sales', 200, NULL, 210), ('HR', 50, 50, 50), ('IT', 0, 80, 90)
),
long_form AS (
  SELECT dept, 1 AS month_no, 'Jan' AS month, jan AS amount FROM budget_sheet
  UNION ALL
  SELECT dept, 2, 'Feb', feb FROM budget_sheet
  UNION ALL
  SELECT dept, 3, 'Mar', mar FROM budget_sheet
)
SELECT month,
  SUM(amount) AS total,
  COUNT(amount) AS departments_reporting,
  group_concat(CASE WHEN amount IS NULL THEN dept END, ', ' ORDER BY dept) AS missing
FROM long_form
GROUP BY month_no, month
ORDER BY month_no;
```

## Expected result

| month | total | departments_reporting | missing |
| --- | --- | --- | --- |
| Jan | 350 | 4 | NULL |
| Feb | 250 | 3 | Sales |
| Mar | 350 | 3 | Ops |

## Explanation

Spreadsheets arrive "wide" (one column per period), but SQL works best "long" (one row per period). After unpivoting, every month is handled by the same `GROUP BY`, and adding April means one more `UNION ALL` branch instead of a change to every calculation.

Blanks and zeros must stay different. IT's January budget of 0 is a real answer, so IT counts as reporting; Sales' blank February and Ops' blank March are gaps to chase. `COUNT(amount)` counts zeros and skips `NULL`s, and `group_concat` skips the `NULL`s that the `CASE` produces for reporting departments.

**Common mistakes:** `COUNT(*)`, which says everyone reported, and filtering `amount > 0`, which treats IT's zero as missing.

## Wrong answers

Feedback: incorrect-output

```sql
WITH budget_sheet(dept, jan, feb, mar) AS ( VALUES ('Ops', 100, 120, NULL), ('Sales', 200, NULL, 210), ('HR', 50, 50, 50), ('IT', 0, 80, 90) ), long_form AS (SELECT dept, 1 AS month_no, 'Jan' AS month, jan AS amount FROM budget_sheet UNION ALL SELECT dept, 2, 'Feb', feb FROM budget_sheet UNION ALL SELECT dept, 3, 'Mar', mar FROM budget_sheet) SELECT month, SUM(amount) AS total, COUNT(CASE WHEN amount > 0 THEN 1 END) AS departments_reporting, group_concat(CASE WHEN amount IS NULL OR amount = 0 THEN dept END, ', ' ORDER BY dept) AS missing FROM long_form GROUP BY month_no, month ORDER BY month_no;
```
