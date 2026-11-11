---
id: da-day-158
title: Where do visitors go after pricing?
order: 158
difficulty: intermediate
topic: Temporal analysis
summary: Collapse repeated events, then read the next event in each session with LEAD.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Collapse consecutive duplicate events
  - Read the next event with LEAD
prerequisites:
  - Day 110
  - Day 122
---

## Task

Each row in the starter query is a page view in a session. Marketing asks what visitors do right after the **pricing** page. First collapse reloads: a view of the same page as the session's previous view is ignored. Then, for every remaining pricing view, take the next page in the same session, or `'exit'` if the session ends there.

Return `next_page`, `views` and `pct` (share of pricing views, rounded to 1 decimal place). Sort by `views` from most to fewest, then `next_page`.

## Starter query

```sql
WITH pageviews(session_id, seen_at, page) AS (
  VALUES
    ('s1', '10:00', 'home'), ('s1', '10:01', 'pricing'), ('s1', '10:02', 'pricing'), ('s1', '10:04', 'signup'),
    ('s2', '11:00', 'pricing'), ('s2', '11:03', 'docs'), ('s2', '11:09', 'pricing'),
    ('s3', '12:00', 'blog'), ('s3', '12:02', 'pricing'), ('s3', '12:05', 'signup'),
    ('s4', '13:00', 'pricing'), ('s4', '13:01', 'home'),
    ('s5', '14:00', 'pricing'),
    ('s6', '15:00', 'pricing'), ('s6', '15:01', 'pricing')
)
SELECT session_id, seen_at, page
FROM pageviews
ORDER BY session_id, seen_at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Remove reloads: keep rows where `page IS NOT LAG(page) OVER (PARTITION BY session_id ORDER BY seen_at)` (`IS NOT` also keeps the first view, whose previous page is `NULL`).
3. On the cleaned rows, `COALESCE(LEAD(page) OVER (PARTITION BY session_id ORDER BY seen_at), 'exit')` is the next page. Keep `page = 'pricing'`, then group and count.

## Solution

```sql
WITH pageviews(session_id, seen_at, page) AS (
  VALUES
    ('s1', '10:00', 'home'), ('s1', '10:01', 'pricing'), ('s1', '10:02', 'pricing'), ('s1', '10:04', 'signup'),
    ('s2', '11:00', 'pricing'), ('s2', '11:03', 'docs'), ('s2', '11:09', 'pricing'),
    ('s3', '12:00', 'blog'), ('s3', '12:02', 'pricing'), ('s3', '12:05', 'signup'),
    ('s4', '13:00', 'pricing'), ('s4', '13:01', 'home'),
    ('s5', '14:00', 'pricing'),
    ('s6', '15:00', 'pricing'), ('s6', '15:01', 'pricing')
),
marked AS (
  SELECT session_id, seen_at, page,
    LAG(page) OVER (PARTITION BY session_id ORDER BY seen_at) AS previous_page
  FROM pageviews
),
collapsed AS (
  SELECT session_id, seen_at, page FROM marked WHERE page IS NOT previous_page
),
transitions AS (
  SELECT page,
    COALESCE(LEAD(page) OVER (PARTITION BY session_id ORDER BY seen_at), 'exit') AS next_page
  FROM collapsed
)
SELECT next_page, COUNT(*) AS views,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM transitions
WHERE page = 'pricing'
GROUP BY next_page
ORDER BY views DESC, next_page;
```

## Expected result

| next_page | views | pct |
| --- | --- | --- |
| exit | 3 | 42.9 |
| signup | 2 | 28.6 |
| docs | 1 | 14.3 |
| home | 1 | 14.3 |

## Explanation

Path analysis with `LEAD` answers "what happens next?" questions. Reloads distort it: without collapsing, s1 and s6 would report "pricing → pricing", which tells nobody anything. After collapsing, the 7 pricing views lead to an exit 3 times, to sign-up twice, and once each to docs and home.

The filter `page = 'pricing'` must be applied **after** `LEAD`. Window functions see only the rows that survive `WHERE`, so filtering first would make every pricing view's "next page" another pricing view.

`IS NOT` matters in the collapse step: `page <> previous_page` is `NULL` for each session's first view, which would drop it.

**Common mistake:** skipping the collapse, which adds a meaningless "pricing" row and splits the exits.

## Wrong answers

Feedback: incorrect-output

```sql
WITH pageviews(session_id, seen_at, page) AS ( VALUES ('s1', '10:00', 'home'), ('s1', '10:01', 'pricing'), ('s1', '10:02', 'pricing'), ('s1', '10:04', 'signup'), ('s2', '11:00', 'pricing'), ('s2', '11:03', 'docs'), ('s2', '11:09', 'pricing'), ('s3', '12:00', 'blog'), ('s3', '12:02', 'pricing'), ('s3', '12:05', 'signup'), ('s4', '13:00', 'pricing'), ('s4', '13:01', 'home'), ('s5', '14:00', 'pricing'), ('s6', '15:00', 'pricing'), ('s6', '15:01', 'pricing') ), transitions AS (SELECT page, COALESCE(LEAD(page) OVER (PARTITION BY session_id ORDER BY seen_at), 'exit') AS next_page FROM pageviews) SELECT next_page, COUNT(*) AS views, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct FROM transitions WHERE page = 'pricing' GROUP BY next_page ORDER BY views DESC, next_page;
```
