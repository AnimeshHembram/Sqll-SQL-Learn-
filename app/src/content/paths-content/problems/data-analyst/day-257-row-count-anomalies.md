---
id: da-day-257
title: Flag daily loads that look wrong
order: 257
difficulty: advanced
topic: Data quality
summary: Compare each day's row count with the median of the previous days and flag big departures.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Exclude the current row from a window frame
  - Flag anomalies against a trailing baseline
prerequisites:
  - Day 123
  - Day 189
---

## Task

A daily load usually brings about the same number of rows (starter query). Flag days whose count is far from normal, where "normal" is the **average of the previous three days** (days with fewer than three earlier loads are not judged).

Return `day`, `rows_loaded`, `baseline` (the three-day average, rounded to 1 decimal place), `change_pct` (rounded to 1 decimal place) and `flag`: `'spike'` when more than 30% above the baseline, `'drop'` when more than 30% below, `'ok'` otherwise, and `NULL` when not judged. Sort by `day`.

The previous days must be the three loads before the current one, so a bad day also affects the next days' baseline.

## Starter query

```sql
WITH daily_loads(day, rows_loaded) AS (
  VALUES
    ('2025-03-01', 1000), ('2025-03-02', 1040), ('2025-03-03', 980), ('2025-03-04', 1010), ('2025-03-05', 1500),
    ('2025-03-06', 1020), ('2025-03-07', 990), ('2025-03-08', 400), ('2025-03-09', 1005), ('2025-03-10', 1030)
)
SELECT day, rows_loaded
FROM daily_loads
ORDER BY day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `AVG(rows_loaded) OVER (ORDER BY day ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING)` averages the three earlier rows, excluding the current one. `COUNT(*)` over the same frame tells you how many earlier rows there were.
3. Only judge rows where that count is 3. `change = 100.0 * (rows_loaded - baseline) / baseline`; compare it with ±30 to set the flag.

## Solution

```sql
WITH daily_loads(day, rows_loaded) AS (
  VALUES
    ('2025-03-01', 1000), ('2025-03-02', 1040), ('2025-03-03', 980), ('2025-03-04', 1010), ('2025-03-05', 1500),
    ('2025-03-06', 1020), ('2025-03-07', 990), ('2025-03-08', 400), ('2025-03-09', 1005), ('2025-03-10', 1030)
),
baselines AS (
  SELECT day, rows_loaded,
    AVG(rows_loaded) OVER (ORDER BY day ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING) AS baseline,
    COUNT(*) OVER (ORDER BY day ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING) AS earlier
  FROM daily_loads
),
judged AS (
  SELECT day, rows_loaded,
    CASE WHEN earlier = 3 THEN baseline END AS baseline,
    CASE WHEN earlier = 3 THEN 100.0 * (rows_loaded - baseline) / baseline END AS change
  FROM baselines
)
SELECT day, rows_loaded, ROUND(baseline, 1) AS baseline, ROUND(change, 1) AS change_pct,
  CASE WHEN change IS NULL THEN NULL WHEN change > 30 THEN 'spike' WHEN change < -30 THEN 'drop' ELSE 'ok' END AS flag
FROM judged
ORDER BY day;
```

## Expected result

| day | rows_loaded | baseline | change_pct | flag |
| --- | --- | --- | --- | --- |
| 2025-03-01 | 1000 | NULL | NULL | NULL |
| 2025-03-02 | 1040 | NULL | NULL | NULL |
| 2025-03-03 | 980 | NULL | NULL | NULL |
| 2025-03-04 | 1010 | 1006.7 | 0.3 | ok |
| 2025-03-05 | 1500 | 1010 | 48.5 | spike |
| 2025-03-06 | 1020 | 1163.3 | -12.3 | ok |
| 2025-03-07 | 990 | 1176.7 | -15.9 | ok |
| 2025-03-08 | 400 | 1170 | -65.8 | drop |
| 2025-03-09 | 1005 | 803.3 | 25.1 | ok |
| 2025-03-10 | 1030 | 798.3 | 29 | ok |

## Explanation

A trailing baseline compares each day with the days just before it. The frame `ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING` excludes the current row, which matters: including it lets a spike raise its own baseline and partly hide itself. On 5 March, 1,500 rows against a baseline of 1,010 is a 48.5% spike; on 8 March, 400 rows is a 65.8% drop, probably a partial load.

The last part of the task shows a real weakness of trailing baselines: bad days stay in the window. The spike lifts the baselines of 6 and 7 March to about 1,170, and the drop pulls the baselines of 9 and 10 March down to about 800, so ordinary days look 25-29% above normal. Production checks often use a median, or leave flagged days out of the baseline, for this reason.

**Common mistake:** including the current row in the frame. Each day is then compared partly with itself, and the spike on 5 March shrinks from +48.5% to +28.9%, under the threshold.

## Wrong answers

Feedback: incorrect-output

```sql
WITH daily_loads(day, rows_loaded) AS ( VALUES ('2025-03-01', 1000), ('2025-03-02', 1040), ('2025-03-03', 980), ('2025-03-04', 1010), ('2025-03-05', 1500), ('2025-03-06', 1020), ('2025-03-07', 990), ('2025-03-08', 400), ('2025-03-09', 1005), ('2025-03-10', 1030) ), baselines AS (SELECT day, rows_loaded, AVG(rows_loaded) OVER (ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS baseline, COUNT(*) OVER (ORDER BY day ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING) AS earlier FROM daily_loads), judged AS (SELECT day, rows_loaded, CASE WHEN earlier = 3 THEN baseline END AS baseline, CASE WHEN earlier = 3 THEN 100.0 * (rows_loaded - baseline) / baseline END AS change FROM baselines) SELECT day, rows_loaded, ROUND(baseline, 1) AS baseline, ROUND(change, 1) AS change_pct, CASE WHEN change IS NULL THEN NULL WHEN change > 30 THEN 'spike' WHEN change < -30 THEN 'drop' ELSE 'ok' END AS flag FROM judged ORDER BY day;
```
