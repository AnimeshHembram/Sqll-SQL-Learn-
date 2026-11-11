---
id: da-day-205
title: The most common user journeys
order: 205
difficulty: intermediate
topic: Behavioural analytics
summary: Concatenate each session's pages in order into a path string, then count identical journeys.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Build ordered path strings with group_concat
  - Count identical journeys
prerequisites:
  - Day 158
  - Day 161
---

## Task

Turn each session's clicks (in the starter query) into a **journey** string: its pages in time order joined with `' > '`, for example `'home > pricing > signup'`. Then count how many sessions followed each journey. A journey **converted** if it ends with `signup`.

Return `journey`, `sessions`, `share_pct` (of all sessions, rounded to 1 decimal place) and `converted` (`'yes'`/`'no'`). Sort by `sessions` from most to fewest, then `journey`.

## Starter query

```sql
WITH clicks(session_id, seen_at, page) AS (
  VALUES
    ('s1', 1, 'home'), ('s1', 2, 'pricing'), ('s1', 3, 'signup'),
    ('s2', 1, 'home'), ('s2', 2, 'pricing'), ('s2', 3, 'signup'),
    ('s3', 2, 'pricing'), ('s3', 1, 'blog'), ('s3', 3, 'signup'),
    ('s4', 1, 'home'), ('s4', 2, 'pricing'), ('s4', 3, 'docs'),
    ('s5', 1, 'home'), ('s5', 2, 'pricing'), ('s5', 3, 'signup'),
    ('s6', 1, 'docs')
)
SELECT session_id, seen_at, page
FROM clicks
ORDER BY session_id, seen_at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `group_concat(page, ' > ' ORDER BY seen_at)` per session builds the journey in time order, whatever order the rows are stored in.
3. Group the journeys and count; `journey LIKE '%signup'` tells whether it ends with sign-up. `SUM(COUNT(*)) OVER ()` is the total for the share.

## Solution

```sql
WITH clicks(session_id, seen_at, page) AS (
  VALUES
    ('s1', 1, 'home'), ('s1', 2, 'pricing'), ('s1', 3, 'signup'),
    ('s2', 1, 'home'), ('s2', 2, 'pricing'), ('s2', 3, 'signup'),
    ('s3', 2, 'pricing'), ('s3', 1, 'blog'), ('s3', 3, 'signup'),
    ('s4', 1, 'home'), ('s4', 2, 'pricing'), ('s4', 3, 'docs'),
    ('s5', 1, 'home'), ('s5', 2, 'pricing'), ('s5', 3, 'signup'),
    ('s6', 1, 'docs')
),
journeys AS (
  SELECT session_id, group_concat(page, ' > ' ORDER BY seen_at) AS journey FROM clicks GROUP BY session_id
)
SELECT journey, COUNT(*) AS sessions,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS share_pct,
  CASE WHEN journey LIKE '%signup' THEN 'yes' ELSE 'no' END AS converted
FROM journeys
GROUP BY journey
ORDER BY sessions DESC, journey;
```

## Expected result

| journey | sessions | share_pct | converted |
| --- | --- | --- | --- |
| home > pricing > signup | 3 | 50 | yes |
| blog > pricing > signup | 1 | 16.7 | yes |
| docs | 1 | 16.7 | no |
| home > pricing > docs | 1 | 16.7 | no |

## Explanation

Whole-journey strings answer questions that step-by-step metrics miss: half the sessions follow exactly home, pricing, sign-up, and the blog route converts too. Grouping identical journeys gives a quick "top paths" report that product teams can read without a funnel tool.

The order inside `group_concat` must be explicit. Session s3's rows are stored out of order (pricing before blog); without `ORDER BY seen_at`, its journey could come out as `'pricing > blog > signup'`, a path nobody took.

**Common mistake:** `group_concat(page, ' > ')` without an order, which depends on storage order and can scramble journeys.

## Wrong answers

Feedback: incorrect-output

```sql
WITH clicks(session_id, seen_at, page) AS ( VALUES ('s1', 1, 'home'), ('s1', 2, 'pricing'), ('s1', 3, 'signup'), ('s2', 1, 'home'), ('s2', 2, 'pricing'), ('s2', 3, 'signup'), ('s3', 2, 'pricing'), ('s3', 1, 'blog'), ('s3', 3, 'signup'), ('s4', 1, 'home'), ('s4', 2, 'pricing'), ('s4', 3, 'docs'), ('s5', 1, 'home'), ('s5', 2, 'pricing'), ('s5', 3, 'signup'), ('s6', 1, 'docs') ), journeys AS (SELECT session_id, group_concat(page, ' > ' ORDER BY page) AS journey FROM clicks GROUP BY session_id) SELECT journey, COUNT(*) AS sessions, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS share_pct, CASE WHEN journey LIKE '%signup' THEN 'yes' ELSE 'no' END AS converted FROM journeys GROUP BY journey ORDER BY sessions DESC, journey;
```
