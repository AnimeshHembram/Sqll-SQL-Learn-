---
id: da-day-111
title: First-touch and last-touch attribution
order: 111
difficulty: advanced
topic: Business analysis
summary: Credit each conversion to the first or the last marketing touch before it.
module: data-analyst
duration: 15
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Rank events within a user from both ends
  - Compare two attribution models in one query
prerequisites:
  - Day 101
  - Data Analyst chapter: Funnels
---

## Task

Marketing touches (ad clicks, emails, searches) and conversions are in the starter query. Only touches **on or before** the conversion day count, and users who never converted are ignored. For every channel that appears in `touches`, return `channel`, `first_touch` (conversions whose first counted touch was this channel) and `last_touch` (conversions whose last counted touch was this channel). Channels with no credit show 0. Sort by `channel`.

No user has two touches on the same day.

## Starter query

```sql
WITH touches(user_id, channel, touched_on) AS (
  VALUES
    ('u1', 'ads', '2025-03-01'), ('u1', 'email', '2025-03-03'), ('u1', 'search', '2025-03-05'),
    ('u2', 'search', '2025-03-02'), ('u2', 'ads', '2025-03-04'),
    ('u3', 'email', '2025-03-01'),
    ('u4', 'social', '2025-03-03'), ('u4', 'email', '2025-03-08'),
    ('u5', 'ads', '2025-03-02'),
    ('u6', 'email', '2025-03-01'), ('u6', 'email', '2025-03-04'), ('u6', 'ads', '2025-03-05')
),
conversions(user_id, converted_on) AS (
  VALUES ('u1', '2025-03-06'), ('u2', '2025-03-04'), ('u3', '2025-03-02'), ('u4', '2025-03-05'), ('u6', '2025-03-07')
)
SELECT t.user_id, t.channel, t.touched_on, c.converted_on
FROM touches AS t
JOIN conversions AS c ON c.user_id = t.user_id
ORDER BY t.user_id, t.touched_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. The starter query already joins each touch to its user's conversion.
2. Keep the touches with `t.touched_on <= c.converted_on`, and number them both ways per user: `ROW_NUMBER() OVER (PARTITION BY t.user_id ORDER BY t.touched_on)` and the same with `DESC`.
3. Start from the distinct channels and count with `SUM(CASE WHEN first_rank = 1 THEN 1 ELSE 0 END)`, using a `LEFT JOIN` so channels without credit get 0.

## Solution

```sql
WITH touches(user_id, channel, touched_on) AS (
  VALUES
    ('u1', 'ads', '2025-03-01'), ('u1', 'email', '2025-03-03'), ('u1', 'search', '2025-03-05'),
    ('u2', 'search', '2025-03-02'), ('u2', 'ads', '2025-03-04'),
    ('u3', 'email', '2025-03-01'),
    ('u4', 'social', '2025-03-03'), ('u4', 'email', '2025-03-08'),
    ('u5', 'ads', '2025-03-02'),
    ('u6', 'email', '2025-03-01'), ('u6', 'email', '2025-03-04'), ('u6', 'ads', '2025-03-05')
),
conversions(user_id, converted_on) AS (
  VALUES ('u1', '2025-03-06'), ('u2', '2025-03-04'), ('u3', '2025-03-02'), ('u4', '2025-03-05'), ('u6', '2025-03-07')
),
counted AS (
  SELECT t.user_id, t.channel,
    ROW_NUMBER() OVER (PARTITION BY t.user_id ORDER BY t.touched_on) AS first_rank,
    ROW_NUMBER() OVER (PARTITION BY t.user_id ORDER BY t.touched_on DESC) AS last_rank
  FROM touches AS t
  JOIN conversions AS c ON c.user_id = t.user_id
  WHERE t.touched_on <= c.converted_on
),
channels AS (
  SELECT DISTINCT channel FROM touches
)
SELECT ch.channel,
  COALESCE(SUM(CASE WHEN x.first_rank = 1 THEN 1 ELSE 0 END), 0) AS first_touch,
  COALESCE(SUM(CASE WHEN x.last_rank = 1 THEN 1 ELSE 0 END), 0) AS last_touch
FROM channels AS ch
LEFT JOIN counted AS x ON x.channel = ch.channel
GROUP BY ch.channel
ORDER BY ch.channel;
```

## Expected result

| channel | first_touch | last_touch |
| --- | --- | --- |
| ads | 1 | 2 |
| email | 2 | 1 |
| search | 1 | 1 |
| social | 1 | 1 |

## Explanation

Attribution models answer "which channel gets the credit?". First touch rewards the channel that introduced the customer; last touch rewards the one that closed the sale. Numbering touches in both directions gives both models from one CTE.

Email gets two first touches but only one last touch; ads get the reverse. u4's email arrived after their conversion, so it gets no credit, and u5 never converted.

**Common mistake:** forgetting the "on or before the conversion" condition. u4's last touch would become the later email and email would collect credit for a sale it could not have caused.

## Wrong answers

Feedback: incorrect-output

```sql
WITH touches(user_id, channel, touched_on) AS ( VALUES ('u1', 'ads', '2025-03-01'), ('u1', 'email', '2025-03-03'), ('u1', 'search', '2025-03-05'), ('u2', 'search', '2025-03-02'), ('u2', 'ads', '2025-03-04'), ('u3', 'email', '2025-03-01'), ('u4', 'social', '2025-03-03'), ('u4', 'email', '2025-03-08'), ('u5', 'ads', '2025-03-02'), ('u6', 'email', '2025-03-01'), ('u6', 'email', '2025-03-04'), ('u6', 'ads', '2025-03-05') ), conversions(user_id, converted_on) AS ( VALUES ('u1', '2025-03-06'), ('u2', '2025-03-04'), ('u3', '2025-03-02'), ('u4', '2025-03-05'), ('u6', '2025-03-07') ), counted AS (SELECT t.user_id, t.channel, ROW_NUMBER() OVER (PARTITION BY t.user_id ORDER BY t.touched_on) AS first_rank, ROW_NUMBER() OVER (PARTITION BY t.user_id ORDER BY t.touched_on DESC) AS last_rank FROM touches AS t JOIN conversions AS c ON c.user_id = t.user_id), channels AS (SELECT DISTINCT channel FROM touches) SELECT ch.channel, COALESCE(SUM(CASE WHEN x.first_rank = 1 THEN 1 ELSE 0 END), 0) AS first_touch, COALESCE(SUM(CASE WHEN x.last_rank = 1 THEN 1 ELSE 0 END), 0) AS last_touch FROM channels AS ch LEFT JOIN counted AS x ON x.channel = ch.channel GROUP BY ch.channel ORDER BY ch.channel;
```
