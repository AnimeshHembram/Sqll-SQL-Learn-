---
id: da-day-194
title: Uplift by segment, with a minimum sample
order: 194
difficulty: intermediate
topic: Experimentation
summary: Compare treatment and control within each segment and refuse to judge segments that are too small.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compare treatment and control within segments
  - Apply a minimum sample size
prerequisites:
  - Day 154
  - Day 191
---

## Task

An offer was tested on users (in the starter query). For each segment, compute the conversion rate in treatment and control and the **uplift** (treatment rate − control rate, in percentage points). Segments where either group has **fewer than 3 users** are too small to judge.

Return `segment`, `treatment_users`, `control_users`, `treatment_pct`, `control_pct`, `uplift_pts` (rounded to 1 decimal place; `NULL` when too small) and `verdict`: `'too small'`, `'positive'` (uplift above 0), `'negative'` (below 0) or `'none'`. Sort by `segment`.

## Starter query

```sql
WITH users(user_id, segment, grp, converted) AS (
  VALUES
    (1, 'new', 'treatment', 1), (2, 'new', 'treatment', 1), (3, 'new', 'treatment', 0), (4, 'new', 'treatment', 1),
    (5, 'new', 'control', 0), (6, 'new', 'control', 1), (7, 'new', 'control', 0), (8, 'new', 'control', 0),
    (9, 'returning', 'treatment', 1), (10, 'returning', 'treatment', 0), (11, 'returning', 'treatment', 1),
    (12, 'returning', 'control', 1), (13, 'returning', 'control', 1), (14, 'returning', 'control', 0),
    (15, 'vip', 'treatment', 1), (16, 'vip', 'control', 1)
)
SELECT segment, grp, COUNT(*) AS users, SUM(converted) AS conversions
FROM users
GROUP BY segment, grp
ORDER BY segment, grp;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Per segment: `SUM(CASE WHEN grp = 'treatment' THEN 1 ELSE 0 END)` for the group sizes, and `AVG(CASE WHEN grp = 'treatment' THEN converted END)` for the rates (`AVG` skips the other group's `NULL`s).
3. Only compute the uplift when both groups have at least 3 users; check `'too small'` first in the verdict.

## Solution

```sql
WITH users(user_id, segment, grp, converted) AS (
  VALUES
    (1, 'new', 'treatment', 1), (2, 'new', 'treatment', 1), (3, 'new', 'treatment', 0), (4, 'new', 'treatment', 1),
    (5, 'new', 'control', 0), (6, 'new', 'control', 1), (7, 'new', 'control', 0), (8, 'new', 'control', 0),
    (9, 'returning', 'treatment', 1), (10, 'returning', 'treatment', 0), (11, 'returning', 'treatment', 1),
    (12, 'returning', 'control', 1), (13, 'returning', 'control', 1), (14, 'returning', 'control', 0),
    (15, 'vip', 'treatment', 1), (16, 'vip', 'control', 1)
),
per_segment AS (
  SELECT segment,
    SUM(CASE WHEN grp = 'treatment' THEN 1 ELSE 0 END) AS t_users,
    SUM(CASE WHEN grp = 'control' THEN 1 ELSE 0 END) AS c_users,
    100.0 * AVG(CASE WHEN grp = 'treatment' THEN converted END) AS t_pct,
    100.0 * AVG(CASE WHEN grp = 'control' THEN converted END) AS c_pct
  FROM users
  GROUP BY segment
)
SELECT segment, t_users AS treatment_users, c_users AS control_users,
  ROUND(t_pct, 1) AS treatment_pct, ROUND(c_pct, 1) AS control_pct,
  CASE WHEN t_users >= 3 AND c_users >= 3 THEN ROUND(t_pct - c_pct, 1) END AS uplift_pts,
  CASE
    WHEN t_users < 3 OR c_users < 3 THEN 'too small'
    WHEN t_pct > c_pct THEN 'positive'
    WHEN t_pct < c_pct THEN 'negative'
    ELSE 'none'
  END AS verdict
FROM per_segment
ORDER BY segment;
```

## Expected result

| segment | treatment_users | control_users | treatment_pct | control_pct | uplift_pts | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| new | 4 | 4 | 75 | 25 | 50 | positive |
| returning | 3 | 3 | 66.7 | 66.7 | 0 | none |
| vip | 1 | 1 | 100 | 100 | NULL | too small |

## Explanation

Segment results show **who** an offer works for: new users convert 50 points more with it, while returning users convert no better (two of three converted in both groups). That suggests targeting the offer at new users rather than everyone.

The VIP segment has one user per group. A 0-point uplift computed from one user each is not evidence of anything, so the query labels it instead of printing a number that looks precise. Real tests use far larger minimums, but the principle is the same: small segments produce extreme, unstable rates.

**Common mistake:** reporting an uplift for every segment, which invites decisions based on a single user.

## Wrong answers

Feedback: incorrect-output

```sql
WITH users(user_id, segment, grp, converted) AS ( VALUES (1, 'new', 'treatment', 1), (2, 'new', 'treatment', 1), (3, 'new', 'treatment', 0), (4, 'new', 'treatment', 1), (5, 'new', 'control', 0), (6, 'new', 'control', 1), (7, 'new', 'control', 0), (8, 'new', 'control', 0), (9, 'returning', 'treatment', 1), (10, 'returning', 'treatment', 0), (11, 'returning', 'treatment', 1), (12, 'returning', 'control', 1), (13, 'returning', 'control', 1), (14, 'returning', 'control', 0), (15, 'vip', 'treatment', 1), (16, 'vip', 'control', 1) ), per_segment AS (SELECT segment, SUM(CASE WHEN grp = 'treatment' THEN 1 ELSE 0 END) AS t_users, SUM(CASE WHEN grp = 'control' THEN 1 ELSE 0 END) AS c_users, 100.0 * AVG(CASE WHEN grp = 'treatment' THEN converted END) AS t_pct, 100.0 * AVG(CASE WHEN grp = 'control' THEN converted END) AS c_pct FROM users GROUP BY segment) SELECT segment, t_users AS treatment_users, c_users AS control_users, ROUND(t_pct, 1) AS treatment_pct, ROUND(c_pct, 1) AS control_pct, ROUND(t_pct - c_pct, 1) AS uplift_pts, CASE WHEN t_pct > c_pct THEN 'positive' WHEN t_pct < c_pct THEN 'negative' ELSE 'none' END AS verdict FROM per_segment ORDER BY segment;
```
