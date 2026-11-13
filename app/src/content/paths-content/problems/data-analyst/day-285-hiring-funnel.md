---
id: da-day-285
title: The hiring funnel and time to hire by role
order: 285
difficulty: intermediate
topic: Workforce analytics
summary: Count candidates at each hiring stage per role, conversion from application to hire, and days to hire.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Count funnel stages with COUNT(column)
  - Average only over records that finished
prerequisites:
  - Day 156
  - Day 238
---

## Task

Recruiting tracks every application through interview, offer and hire (starter query; a `NULL` date means the stage was not reached). For each role, return `role`, `applied`, `interviewed`, `offered`, `hired`, `offer_accept_pct` (hires ÷ offers × 100), `hire_rate_pct` (hires ÷ applications × 100) and `avg_days_to_hire` (average days from application to hire among hires). Round percentages and days to 1 decimal place. Sort by `hire_rate_pct` from highest, then `role`.

## Starter query

```sql
WITH applications(app_id, role, applied_on, interviewed_on, offered_on, hired_on) AS (
  VALUES
    (1, 'Analyst', '2025-01-02', '2025-01-10', '2025-01-20', '2025-01-27'),
    (2, 'Analyst', '2025-01-03', '2025-01-12', NULL, NULL),
    (3, 'Analyst', '2025-01-05', NULL, NULL, NULL),
    (4, 'Analyst', '2025-01-06', '2025-01-15', '2025-01-25', NULL),
    (5, 'Analyst', '2025-01-08', '2025-01-14', '2025-01-28', '2025-02-10'),
    (6, 'Engineer', '2025-01-02', '2025-01-20', '2025-02-15', '2025-03-01'),
    (7, 'Engineer', '2025-01-04', NULL, NULL, NULL),
    (8, 'Engineer', '2025-01-07', '2025-01-30', NULL, NULL),
    (9, 'Engineer', '2025-01-09', NULL, NULL, NULL),
    (10, 'Designer', '2025-01-03', '2025-01-08', '2025-01-15', '2025-01-20'),
    (11, 'Designer', '2025-01-05', NULL, NULL, NULL)
)
SELECT app_id, role, applied_on, interviewed_on, offered_on, hired_on
FROM applications
ORDER BY role, app_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `COUNT(column)` counts non-null values, so `COUNT(interviewed_on)` is the number interviewed, and so on.
3. `AVG(julianday(hired_on) - julianday(applied_on))` ignores rows where `hired_on` is `NULL`, so it averages hires only. Use `NULLIF(COUNT(offered_on), 0)` for the acceptance rate.

## Solution

```sql
WITH applications(app_id, role, applied_on, interviewed_on, offered_on, hired_on) AS (
  VALUES
    (1, 'Analyst', '2025-01-02', '2025-01-10', '2025-01-20', '2025-01-27'),
    (2, 'Analyst', '2025-01-03', '2025-01-12', NULL, NULL),
    (3, 'Analyst', '2025-01-05', NULL, NULL, NULL),
    (4, 'Analyst', '2025-01-06', '2025-01-15', '2025-01-25', NULL),
    (5, 'Analyst', '2025-01-08', '2025-01-14', '2025-01-28', '2025-02-10'),
    (6, 'Engineer', '2025-01-02', '2025-01-20', '2025-02-15', '2025-03-01'),
    (7, 'Engineer', '2025-01-04', NULL, NULL, NULL),
    (8, 'Engineer', '2025-01-07', '2025-01-30', NULL, NULL),
    (9, 'Engineer', '2025-01-09', NULL, NULL, NULL),
    (10, 'Designer', '2025-01-03', '2025-01-08', '2025-01-15', '2025-01-20'),
    (11, 'Designer', '2025-01-05', NULL, NULL, NULL)
)
SELECT role, COUNT(*) AS applied, COUNT(interviewed_on) AS interviewed, COUNT(offered_on) AS offered, COUNT(hired_on) AS hired,
  ROUND(100.0 * COUNT(hired_on) / NULLIF(COUNT(offered_on), 0), 1) AS offer_accept_pct,
  ROUND(100.0 * COUNT(hired_on) / COUNT(*), 1) AS hire_rate_pct,
  ROUND(AVG(julianday(hired_on) - julianday(applied_on)), 1) AS avg_days_to_hire
FROM applications
GROUP BY role
ORDER BY hire_rate_pct DESC, role;
```

## Expected result

| role | applied | interviewed | offered | hired | offer_accept_pct | hire_rate_pct | avg_days_to_hire |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Designer | 2 | 1 | 1 | 1 | 100 | 50 | 17 |
| Analyst | 5 | 4 | 3 | 2 | 66.7 | 40 | 29 |
| Engineer | 4 | 2 | 1 | 1 | 100 | 25 | 58 |

## Explanation

`COUNT(column)` counts the non-null values in a column, so each stage of the funnel is simply the count of its date. The analyst role shows a typical funnel: 5 applications, 4 interviews, 3 offers, 2 hires. One candidate declined an offer, so only two thirds of offers were accepted.

`AVG` also skips `NULL`s, which here is exactly right: only hires have a time to hire. Engineers take far longer (58 days) and convert least (25%), which is a common pattern for scarce skills. With one hire per role, though, these averages are anecdotes; a recruiting team would look at a full year.

**Common mistake:** filling missing hire dates with today's date to "include everyone". Candidates who were never hired then add their whole time in the process to the average, which no longer measures time to hire.

## Wrong answers

Feedback: incorrect-output

```sql
WITH applications(app_id, role, applied_on, interviewed_on, offered_on, hired_on) AS ( VALUES (1, 'Analyst', '2025-01-02', '2025-01-10', '2025-01-20', '2025-01-27'), (2, 'Analyst', '2025-01-03', '2025-01-12', NULL, NULL), (3, 'Analyst', '2025-01-05', NULL, NULL, NULL), (4, 'Analyst', '2025-01-06', '2025-01-15', '2025-01-25', NULL), (5, 'Analyst', '2025-01-08', '2025-01-14', '2025-01-28', '2025-02-10'), (6, 'Engineer', '2025-01-02', '2025-01-20', '2025-02-15', '2025-03-01'), (7, 'Engineer', '2025-01-04', NULL, NULL, NULL), (8, 'Engineer', '2025-01-07', '2025-01-30', NULL, NULL), (9, 'Engineer', '2025-01-09', NULL, NULL, NULL), (10, 'Designer', '2025-01-03', '2025-01-08', '2025-01-15', '2025-01-20'), (11, 'Designer', '2025-01-05', NULL, NULL, NULL) ) SELECT role, COUNT(*) AS applied, COUNT(interviewed_on) AS interviewed, COUNT(offered_on) AS offered, COUNT(hired_on) AS hired, ROUND(100.0 * COUNT(hired_on) / NULLIF(COUNT(offered_on), 0), 1) AS offer_accept_pct, ROUND(100.0 * COUNT(hired_on) / COUNT(*), 1) AS hire_rate_pct, ROUND(AVG(COALESCE(julianday(hired_on), julianday('2025-03-31')) - julianday(applied_on)), 1) AS avg_days_to_hire FROM applications GROUP BY role ORDER BY hire_rate_pct DESC, role;
```
