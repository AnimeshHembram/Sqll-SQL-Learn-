---
id: da-day-218
title: Payroll on the last working day of each month
order: 218
difficulty: advanced
topic: Dates
summary: Build a calendar, skip weekends and holidays, and pick each month's last working day.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Generate a calendar with a recursive CTE
  - Exclude weekends and holidays
prerequisites:
  - Day 159
  - Day 127
---

## Task

Salaries are paid on the **last working day** of each month: the last day that is neither a Saturday or Sunday nor a holiday (the holiday list is in the starter query). For each month from January to June 2025, return `month` (`'YYYY-MM'`), `pay_day` and `weekday` (the day's name, such as `'Friday'`). Sort by `month`.

## Starter query

```sql
WITH RECURSIVE holidays(day, name) AS (
  VALUES ('2025-01-26', 'Republic Day'), ('2025-01-31', 'Company day off'), ('2025-03-31', 'Id-ul-Fitr'), ('2025-05-01', 'Labour Day')
)
SELECT day, name
FROM holidays
ORDER BY day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. The `RECURSIVE` keyword is already there for the calendar you will add.
2. Generate every day: `calendar(day) AS (SELECT '2025-01-01' UNION ALL SELECT date(day, '+1 day') FROM calendar WHERE day < '2025-06-30')`. `strftime('%w', day)` is `'0'` for Sunday and `'6'` for Saturday.
3. Keep working days (`NOT IN ('0', '6')` and `day NOT IN (SELECT day FROM holidays)`), take `MAX(day)` per `strftime('%Y-%m', day)`, and name the weekday with a `CASE` on `strftime('%w', pay_day)`.

## Solution

```sql
WITH RECURSIVE holidays(day, name) AS (
  VALUES ('2025-01-26', 'Republic Day'), ('2025-01-31', 'Company day off'), ('2025-03-31', 'Id-ul-Fitr'), ('2025-05-01', 'Labour Day')
),
calendar(day) AS (
  SELECT '2025-01-01'
  UNION ALL
  SELECT date(day, '+1 day') FROM calendar WHERE day < '2025-06-30'
),
working AS (
  SELECT day FROM calendar
  WHERE strftime('%w', day) NOT IN ('0', '6') AND day NOT IN (SELECT day FROM holidays)
),
pay AS (
  SELECT strftime('%Y-%m', day) AS month, MAX(day) AS pay_day FROM working GROUP BY strftime('%Y-%m', day)
)
SELECT month, pay_day,
  CASE strftime('%w', pay_day) WHEN '1' THEN 'Monday' WHEN '2' THEN 'Tuesday' WHEN '3' THEN 'Wednesday'
    WHEN '4' THEN 'Thursday' WHEN '5' THEN 'Friday' END AS weekday
FROM pay
ORDER BY month;
```

## Expected result

| month | pay_day | weekday |
| --- | --- | --- |
| 2025-01 | 2025-01-30 | Thursday |
| 2025-02 | 2025-02-28 | Friday |
| 2025-03 | 2025-03-28 | Friday |
| 2025-04 | 2025-04-30 | Wednesday |
| 2025-05 | 2025-05-30 | Friday |
| 2025-06 | 2025-06-30 | Monday |

## Explanation

Payroll, settlement and reporting dates depend on a working calendar, which SQL does not have built in, so you build one: a recursive CTE yields every day of the half-year, `strftime('%w')` removes Saturdays (6) and Sundays (0), and `NOT IN (SELECT day FROM holidays)` removes the company's holidays. The latest remaining day of each month is the pay day.

The holidays change the answer twice. 31 January 2025 is a Friday but a company day off, so January's pay day moves to Thursday the 30th; 31 March is a Monday but Id-ul-Fitr, so March's pay day moves back over the weekend to Friday the 28th. In May the 31st is a Saturday, so the 30th is used without any holiday involved.

**Common mistake:** skipping only weekends. The query then pays on 31 January and 31 March, which are holidays this year.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE holidays(day, name) AS ( VALUES ('2025-01-26', 'Republic Day'), ('2025-01-31', 'Company day off'), ('2025-03-31', 'Id-ul-Fitr'), ('2025-05-01', 'Labour Day') ), calendar(day) AS (SELECT '2025-01-01' UNION ALL SELECT date(day, '+1 day') FROM calendar WHERE day < '2025-06-30'), pay AS (SELECT strftime('%Y-%m', day) AS month, MAX(day) AS pay_day FROM calendar WHERE strftime('%w', day) NOT IN ('0', '6') GROUP BY strftime('%Y-%m', day)) SELECT month, pay_day, CASE strftime('%w', pay_day) WHEN '1' THEN 'Monday' WHEN '2' THEN 'Tuesday' WHEN '3' THEN 'Wednesday' WHEN '4' THEN 'Thursday' WHEN '5' THEN 'Friday' END AS weekday FROM pay ORDER BY month;
```
