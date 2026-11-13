---
id: da-day-219
title: Exact age and tenure in whole years and months
order: 219
difficulty: advanced
topic: Dates
summary: Count completed years and months between dates the way people do, without dividing days by 365.25.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Count completed years and months
  - Avoid day-count approximations
prerequisites:
  - Day 22
  - Day 9
---

## Task

For the HR report dated **15 March 2025**, compute for each employee (starter query):

- `age`: completed years since `born` (a birthday counts once its day is reached),
- `tenure`: completed time since `joined`, as `tenure_years` and `tenure_months` (the months left over after the whole years).

A month is complete once the same day of the month is reached; someone who joined on the 16th has not completed the month on the 15th. Return `name`, `age`, `tenure_years` and `tenure_months`, sorted by `tenure_years` from longest, then `tenure_months` from longest, then `name`.

## Starter query

```sql
WITH employees(name, born, joined) AS (
  VALUES
    ('Asha', '2000-03-15', '2022-03-16'), ('Ravi', '1988-11-30', '2019-01-31'), ('Meera', '1996-02-29', '2024-02-29'),
    ('Vikram', '1979-03-16', '2015-03-15'), ('Kiran', '2003-01-01', '2025-01-01')
)
SELECT name, born, joined
FROM employees
ORDER BY name;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Count months as calendar arithmetic: `(year2 * 12 + month2) - (year1 * 12 + month1)`, minus 1 when the start's day of the month is later than the report's day (15). `strftime('%Y', d)`, `'%m'` and `'%d'` give the parts.
3. With completed months `m`: `age = m_born / 12`, `tenure_years = m_joined / 12` and `tenure_months = m_joined % 12` (integer division and remainder).

## Solution

```sql
WITH employees(name, born, joined) AS (
  VALUES
    ('Asha', '2000-03-15', '2022-03-16'), ('Ravi', '1988-11-30', '2019-01-31'), ('Meera', '1996-02-29', '2024-02-29'),
    ('Vikram', '1979-03-16', '2015-03-15'), ('Kiran', '2003-01-01', '2025-01-01')
),
months AS (
  SELECT name,
    (CAST(strftime('%Y', '2025-03-15') AS INTEGER) * 12 + CAST(strftime('%m', '2025-03-15') AS INTEGER)) - (CAST(strftime('%Y', born) AS INTEGER) * 12 + CAST(strftime('%m', born) AS INTEGER)) - (strftime('%d', born) > '15') AS age_months,
    (CAST(strftime('%Y', '2025-03-15') AS INTEGER) * 12 + CAST(strftime('%m', '2025-03-15') AS INTEGER)) - (CAST(strftime('%Y', joined) AS INTEGER) * 12 + CAST(strftime('%m', joined) AS INTEGER)) - (strftime('%d', joined) > '15') AS tenure_months
  FROM employees
)
SELECT name, age_months / 12 AS age, tenure_months / 12 AS tenure_years, tenure_months % 12 AS tenure_months
FROM months
ORDER BY tenure_years DESC, tenure_months DESC, name;
```

## Expected result

| name | age | tenure_years | tenure_months |
| --- | --- | --- | --- |
| Vikram | 45 | 10 | 0 |
| Ravi | 36 | 6 | 1 |
| Asha | 25 | 2 | 11 |
| Meera | 29 | 1 | 0 |
| Kiran | 22 | 0 | 2 |

## Explanation

People count age and tenure in calendar terms: you turn 25 on your birthday, not after 9,131.25 days. Months make that exact. `(year × 12 + month)` turns each date into a month count; the difference is the number of month boundaries crossed, minus one if the day of the month has not been reached yet (here, a start day after the 15th).

Asha, born on 15 March 2000, turns 25 on the report date. Dividing days by 365.25 gives 24.999 and rounds her down to 24, because the leap-year average does not fit her particular years. Vikram joined on 15 March 2015, so he has exactly 10 years; Asha joined on the 16th, one day later in the month, so she has 2 years and 11 months, not 3 years. Meera's leap-day dates work too: her February 29 start date has a day of 29, so March 15 has not completed her 13th month.

**Common mistake:** dividing day differences by 365.25 (or 30.4375 for months). Anyone near an anniversary can come out a year or a month short.

## Wrong answers

Feedback: incorrect-output

```sql
WITH employees(name, born, joined) AS ( VALUES ('Asha', '2000-03-15', '2022-03-16'), ('Ravi', '1988-11-30', '2019-01-31'), ('Meera', '1996-02-29', '2024-02-29'), ('Vikram', '1979-03-16', '2015-03-15'), ('Kiran', '2003-01-01', '2025-01-01') ), m AS (SELECT name, CAST((julianday('2025-03-15') - julianday(born)) / 365.25 AS INTEGER) AS age, CAST((julianday('2025-03-15') - julianday(joined)) / 30.4375 AS INTEGER) AS months FROM employees) SELECT name, age, months / 12 AS tenure_years, months % 12 AS tenure_months FROM m ORDER BY tenure_years DESC, tenure_months DESC, name;
```
