---
id: da-day-317
title: Views that led to an add-to-cart within 30 minutes
order: 317
difficulty: intermediate
topic: SQL patterns
summary: Pair events with later events of the same user inside a time window, keeping the first match only.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Pair events inside a time window
  - Keep the first match per event
prerequisites:
  - Day 156
  - Day 311
---

## Task

For each **view** event (starter query), find the user's **first** `add_to_cart` that happened **after** the view and within **30 minutes** of it. Return every view with `event_id`, `user_id`, `viewed_at`, `added_at` (`NULL` when there was none in the window) and `minutes` (between the view and the add, `NULL` when none). Sort by `event_id`.

## Starter query

```sql
WITH events(event_id, user_id, happened_at, action) AS (
  VALUES
    (1, 'u1', '2025-03-10 10:00', 'view'), (2, 'u1', '2025-03-10 10:12', 'add_to_cart'), (3, 'u1', '2025-03-10 11:00', 'add_to_cart'),
    (4, 'u2', '2025-03-10 09:00', 'view'), (5, 'u2', '2025-03-10 09:45', 'add_to_cart'), (6, 'u3', '2025-03-10 12:00', 'view'),
    (7, 'u3', '2025-03-10 12:05', 'view'), (8, 'u3', '2025-03-10 12:20', 'add_to_cart'), (9, 'u4', '2025-03-10 15:00', 'add_to_cart')
)
SELECT event_id, user_id, happened_at, action
FROM events
ORDER BY user_id, happened_at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `LEFT JOIN` each view to the same user's adds with `a.happened_at > v.happened_at AND a.happened_at <= datetime(v.happened_at, '+30 minutes')`, normalising both sides with `datetime()`.
3. Keep the first match with `MIN(a.happened_at)` grouped by the view. Minutes: `(julianday(added) - julianday(viewed)) * 1440`.

## Solution

```sql
WITH events(event_id, user_id, happened_at, action) AS (
  VALUES
    (1, 'u1', '2025-03-10 10:00', 'view'), (2, 'u1', '2025-03-10 10:12', 'add_to_cart'), (3, 'u1', '2025-03-10 11:00', 'add_to_cart'),
    (4, 'u2', '2025-03-10 09:00', 'view'), (5, 'u2', '2025-03-10 09:45', 'add_to_cart'), (6, 'u3', '2025-03-10 12:00', 'view'),
    (7, 'u3', '2025-03-10 12:05', 'view'), (8, 'u3', '2025-03-10 12:20', 'add_to_cart'), (9, 'u4', '2025-03-10 15:00', 'add_to_cart')
),
matched AS (
  SELECT v.event_id, v.user_id, v.happened_at AS viewed_at, MIN(a.happened_at) AS added_at
  FROM events AS v
  LEFT JOIN events AS a ON a.user_id = v.user_id AND a.action = 'add_to_cart'
    AND datetime(a.happened_at) > datetime(v.happened_at) AND datetime(a.happened_at) <= datetime(v.happened_at, '+30 minutes')
  WHERE v.action = 'view'
  GROUP BY v.event_id, v.user_id, v.happened_at
)
SELECT event_id, user_id, viewed_at, added_at,
  CAST(ROUND((julianday(added_at) - julianday(viewed_at)) * 1440) AS INTEGER) AS minutes
FROM matched
ORDER BY event_id;
```

## Expected result

| event_id | user_id | viewed_at | added_at | minutes |
| --- | --- | --- | --- | --- |
| 1 | u1 | 2025-03-10 10:00 | 2025-03-10 10:12 | 12 |
| 4 | u2 | 2025-03-10 09:00 | NULL | NULL |
| 6 | u3 | 2025-03-10 12:00 | 2025-03-10 12:20 | 20 |
| 7 | u3 | 2025-03-10 12:05 | 2025-03-10 12:20 | 15 |

## Explanation

Pairing events within a time window is a self-join with conditions on both sides: the same user, a later time and no more than 30 minutes later. `MIN(added_at)` per view keeps the first matching add, so each view has at most one partner.

u1's view at 10:00 led to an add 12 minutes later; their second add at 11:00 is outside the window. u2 added to cart 45 minutes after viewing, too late to count. Both of u3's views precede the same add, and both get credit, since each view was followed by an add within 30 minutes. u4 added to cart without a view and does not appear, because the report starts from views.

**Common mistake:** an inner join. Views without an add in the window, like u2's, disappear, so the report shows only successes and no conversion rate can be computed from it.

## Wrong answers

Feedback: missing-rows

```sql
WITH events(event_id, user_id, happened_at, action) AS ( VALUES (1, 'u1', '2025-03-10 10:00', 'view'), (2, 'u1', '2025-03-10 10:12', 'add_to_cart'), (3, 'u1', '2025-03-10 11:00', 'add_to_cart'), (4, 'u2', '2025-03-10 09:00', 'view'), (5, 'u2', '2025-03-10 09:45', 'add_to_cart'), (6, 'u3', '2025-03-10 12:00', 'view'), (7, 'u3', '2025-03-10 12:05', 'view'), (8, 'u3', '2025-03-10 12:20', 'add_to_cart'), (9, 'u4', '2025-03-10 15:00', 'add_to_cart') ), matched AS (SELECT v.event_id, v.user_id, v.happened_at AS viewed_at, MIN(a.happened_at) AS added_at FROM events AS v JOIN events AS a ON a.user_id = v.user_id AND a.action = 'add_to_cart' AND datetime(a.happened_at) > datetime(v.happened_at) AND datetime(a.happened_at) <= datetime(v.happened_at, '+30 minutes') WHERE v.action = 'view' GROUP BY v.event_id, v.user_id, v.happened_at) SELECT event_id, user_id, viewed_at, added_at, CAST(ROUND((julianday(added_at) - julianday(viewed_at)) * 1440) AS INTEGER) AS minutes FROM matched ORDER BY event_id;
```
