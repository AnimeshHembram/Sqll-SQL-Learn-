---
id: da-day-188
title: A moving median that ignores spikes
order: 188
difficulty: advanced
topic: Statistics
summary: Compute a centred 5-day moving median with a correlated subquery and compare it with a moving average.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute a moving median
  - Compare robust and non-robust smoothing
prerequisites:
  - Day 84
  - Day 143
---

## Task

Daily queue times (in the starter query) include one freak day. For each day with two days of data on **both** sides, compute the 5-day **centred** moving average and moving **median** (days `d − 2` to `d + 2`). Other days get `NULL` for both.

Return `day_no`, `minutes`, `moving_avg` (rounded to 1 decimal place) and `moving_median`. Sort by `day_no`.

## Starter query

```sql
WITH queue_times(day_no, minutes) AS (
  VALUES (1, 12), (2, 14), (3, 11), (4, 95), (5, 13), (6, 15), (7, 12), (8, 16), (9, 14)
)
SELECT day_no, minutes
FROM queue_times
ORDER BY day_no;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. The average is a window: `AVG(minutes) OVER (ORDER BY day_no ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING)`, with `COUNT(*)` over the same frame to require 5 rows.
3. There is no median window function. For each day, take the 5 values with a correlated subquery, sort them and pick the third: `(SELECT q.minutes FROM queue_times AS q WHERE q.day_no BETWEEN t.day_no - 2 AND t.day_no + 2 ORDER BY q.minutes LIMIT 1 OFFSET 2)`.

## Solution

```sql
WITH queue_times(day_no, minutes) AS (
  VALUES (1, 12), (2, 14), (3, 11), (4, 95), (5, 13), (6, 15), (7, 12), (8, 16), (9, 14)
),
framed AS (
  SELECT day_no, minutes,
    COUNT(*) OVER (ORDER BY day_no ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING) AS n,
    AVG(minutes) OVER (ORDER BY day_no ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING) AS avg5
  FROM queue_times
)
SELECT f.day_no, f.minutes,
  CASE WHEN f.n = 5 THEN ROUND(f.avg5, 1) END AS moving_avg,
  CASE WHEN f.n = 5 THEN (
    SELECT q.minutes FROM queue_times AS q
    WHERE q.day_no BETWEEN f.day_no - 2 AND f.day_no + 2
    ORDER BY q.minutes LIMIT 1 OFFSET 2
  ) END AS moving_median
FROM framed AS f
ORDER BY f.day_no;
```

## Expected result

| day_no | minutes | moving_avg | moving_median |
| --- | --- | --- | --- |
| 1 | 12 | NULL | NULL |
| 2 | 14 | NULL | NULL |
| 3 | 11 | 29 | 13 |
| 4 | 95 | 29.6 | 14 |
| 5 | 13 | 29.2 | 13 |
| 6 | 15 | 30.2 | 15 |
| 7 | 12 | 14 | 14 |
| 8 | 16 | NULL | NULL |
| 9 | 14 | NULL | NULL |

## Explanation

Day 4's 95 minutes (a system outage, perhaps) lifts every full moving average that contains it to about 30 minutes, four days in a row of "the queue doubled". The moving median stays between 13 and 15, because a single extreme value in a window of five can never be the middle value. That robustness is why medians are preferred for noisy operational data.

Medians need sorting, which window frames cannot do in SQLite, so each day collects its five neighbours in a correlated subquery and takes the middle one (`LIMIT 1 OFFSET 2`). Days 1, 2, 8 and 9 lack a full window on one side and are left empty rather than computed from fewer days.

**Common mistake:** choosing the median position with `OFFSET 3` (or counting from 1), which returns the fourth-smallest value instead of the middle one.

## Wrong answers

Feedback: incorrect-output

```sql
WITH queue_times(day_no, minutes) AS ( VALUES (1, 12), (2, 14), (3, 11), (4, 95), (5, 13), (6, 15), (7, 12), (8, 16), (9, 14) ), framed AS (SELECT day_no, minutes, COUNT(*) OVER (ORDER BY day_no ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING) AS n, AVG(minutes) OVER (ORDER BY day_no ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING) AS avg5 FROM queue_times) SELECT f.day_no, f.minutes, CASE WHEN f.n = 5 THEN ROUND(f.avg5, 1) END AS moving_avg, CASE WHEN f.n = 5 THEN (SELECT q.minutes FROM queue_times AS q WHERE q.day_no BETWEEN f.day_no - 2 AND f.day_no + 2 ORDER BY q.minutes LIMIT 1 OFFSET 3) END AS moving_median FROM framed AS f ORDER BY f.day_no;
```
