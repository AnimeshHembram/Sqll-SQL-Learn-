---
id: da-day-260
title: A daily data quality score
order: 260
difficulty: intermediate
topic: Data quality
summary: Turn check results into a daily pass rate, count checks that did not run, and flag the worst day.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Score checks against what was expected
  - List values with GROUP_CONCAT
prerequisites:
  - Day 86
  - Day 150
---

## Task

Four data quality checks are expected to run every day (starter query). For each run day, report:

- `checks_run`, `passed` and `score_pct` (passed ÷ 4 expected checks × 100; a check that did not run counts as not passed),
- `not_run` (expected checks with no result that day),
- `failed_checks`: the names of checks that failed, in alphabetical order separated by `', '` (`NULL` when none failed).

Return `run_day`, `checks_run`, `passed`, `not_run`, `score_pct` (rounded to 1 decimal place) and `failed_checks`, sorted by `run_day`.

## Starter query

```sql
WITH checks(run_day, check_name, passed) AS (
  VALUES
    ('2025-03-10', 'not_null_email', 1), ('2025-03-10', 'unique_id', 1), ('2025-03-10', 'valid_status', 1), ('2025-03-10', 'fresh_orders', 1),
    ('2025-03-11', 'not_null_email', 1), ('2025-03-11', 'unique_id', 1), ('2025-03-11', 'valid_status', 0), ('2025-03-11', 'fresh_orders', 1),
    ('2025-03-12', 'not_null_email', 0), ('2025-03-12', 'unique_id', 1), ('2025-03-12', 'valid_status', 0), ('2025-03-12', 'fresh_orders', 0),
    ('2025-03-13', 'not_null_email', 1), ('2025-03-13', 'unique_id', 1), ('2025-03-13', 'valid_status', 0),
    ('2025-03-14', 'not_null_email', 1), ('2025-03-14', 'unique_id', 1), ('2025-03-14', 'valid_status', 1), ('2025-03-14', 'fresh_orders', 1)
)
SELECT run_day, check_name, passed
FROM checks
ORDER BY run_day, check_name;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Per day: `COUNT(*)` runs, `SUM(passed)` passes, and `4 - COUNT(*)` checks that did not run. The score divides by the 4 expected checks, not by the checks that ran.
3. `GROUP_CONCAT(name, ', ')` lists values, but its order is not guaranteed; feed it from a subquery that is already sorted by check name and filtered to failures, or use `GROUP_CONCAT(check_name, ', ' ORDER BY check_name)`.

## Solution

```sql
WITH checks(run_day, check_name, passed) AS (
  VALUES
    ('2025-03-10', 'not_null_email', 1), ('2025-03-10', 'unique_id', 1), ('2025-03-10', 'valid_status', 1), ('2025-03-10', 'fresh_orders', 1),
    ('2025-03-11', 'not_null_email', 1), ('2025-03-11', 'unique_id', 1), ('2025-03-11', 'valid_status', 0), ('2025-03-11', 'fresh_orders', 1),
    ('2025-03-12', 'not_null_email', 0), ('2025-03-12', 'unique_id', 1), ('2025-03-12', 'valid_status', 0), ('2025-03-12', 'fresh_orders', 0),
    ('2025-03-13', 'not_null_email', 1), ('2025-03-13', 'unique_id', 1), ('2025-03-13', 'valid_status', 0),
    ('2025-03-14', 'not_null_email', 1), ('2025-03-14', 'unique_id', 1), ('2025-03-14', 'valid_status', 1), ('2025-03-14', 'fresh_orders', 1)
),
daily AS (
  SELECT run_day, COUNT(*) AS checks_run, SUM(passed) AS passed FROM checks GROUP BY run_day
),
failures AS (
  SELECT run_day, GROUP_CONCAT(check_name, ', ') AS failed_checks
  FROM (SELECT run_day, check_name FROM checks WHERE passed = 0 ORDER BY run_day, check_name)
  GROUP BY run_day
)
SELECT d.run_day, d.checks_run, d.passed, 4 - d.checks_run AS not_run,
  ROUND(100.0 * d.passed / 4, 1) AS score_pct, f.failed_checks
FROM daily AS d
LEFT JOIN failures AS f ON f.run_day = d.run_day
ORDER BY d.run_day;
```

## Expected result

| run_day | checks_run | passed | not_run | score_pct | failed_checks |
| --- | --- | --- | --- | --- | --- |
| 2025-03-10 | 4 | 4 | 0 | 100 | NULL |
| 2025-03-11 | 4 | 3 | 0 | 75 | valid_status |
| 2025-03-12 | 4 | 1 | 0 | 25 | fresh_orders, not_null_email, valid_status |
| 2025-03-13 | 3 | 2 | 1 | 50 | valid_status |
| 2025-03-14 | 4 | 4 | 0 | 100 | NULL |

## Explanation

A quality score is only honest if it counts what did not happen. On 13 March, `fresh_orders` did not run at all; dividing by the 3 checks that ran would give 66.7%, while dividing by the 4 expected checks gives 50%, and the missing run is reported in `not_run`. The worst day is 12 March, when three of four checks failed.

`GROUP_CONCAT` lists the failing checks, so whoever reads the trend sees what went wrong without another query. Its order is only guaranteed if you ask for it: feed it from a sorted subquery, or write `ORDER BY` inside the call. The `LEFT JOIN` from the daily totals to the failures keeps clean days, with `NULL` failures.

**Common mistake:** dividing by the checks that ran. Days on which a check silently stopped running look better than days on which it ran and failed.

## Wrong answers

Feedback: incorrect-output

```sql
WITH checks(run_day, check_name, passed) AS ( VALUES ('2025-03-10', 'not_null_email', 1), ('2025-03-10', 'unique_id', 1), ('2025-03-10', 'valid_status', 1), ('2025-03-10', 'fresh_orders', 1), ('2025-03-11', 'not_null_email', 1), ('2025-03-11', 'unique_id', 1), ('2025-03-11', 'valid_status', 0), ('2025-03-11', 'fresh_orders', 1), ('2025-03-12', 'not_null_email', 0), ('2025-03-12', 'unique_id', 1), ('2025-03-12', 'valid_status', 0), ('2025-03-12', 'fresh_orders', 0), ('2025-03-13', 'not_null_email', 1), ('2025-03-13', 'unique_id', 1), ('2025-03-13', 'valid_status', 0), ('2025-03-14', 'not_null_email', 1), ('2025-03-14', 'unique_id', 1), ('2025-03-14', 'valid_status', 1), ('2025-03-14', 'fresh_orders', 1) ), daily AS (SELECT run_day, COUNT(*) AS checks_run, SUM(passed) AS passed FROM checks GROUP BY run_day), failures AS (SELECT run_day, GROUP_CONCAT(check_name, ', ') AS failed_checks FROM (SELECT run_day, check_name FROM checks WHERE passed = 0 ORDER BY run_day, check_name) GROUP BY run_day) SELECT d.run_day, d.checks_run, d.passed, 4 - d.checks_run AS not_run, ROUND(100.0 * d.passed / d.checks_run, 1) AS score_pct, f.failed_checks FROM daily AS d LEFT JOIN failures AS f ON f.run_day = d.run_day ORDER BY d.run_day;
```
