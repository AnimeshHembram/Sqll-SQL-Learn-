---
id: da-day-297
title: Case study: do cancellation save offers work?
order: 297
difficulty: advanced
topic: Case studies
summary: Compare save rates by cancellation reason and offer, and check whether saved subscribers actually stayed.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Evaluate an intervention by segment
  - Look past the first outcome to the lasting one
prerequisites:
  - Day 244
  - Day 194
---

## Task

When subscribers try to cancel a meal-kit plan, the team may make a **save offer** (starter query). For each combination of `reason` and `offered` (show `'none'` when no offer was made), return:

- `requests`, `saved` and `save_pct` (saved ÷ requests),
- `kept_60d_pct`: of the saved subscribers, the share still active after 60 days (`NULL` when nobody was saved),
- `net_kept_pct`: still active after 60 days ÷ requests.

Round percentages to 1 decimal place. Sort by `net_kept_pct` from highest, then `reason`, then `offered`.

## Starter query

```sql
WITH subscribers(subscriber, cancel_requested_on, reason, offered) AS (
  VALUES
    ('s1', '2025-03-02', 'price', 'discount'), ('s2', '2025-03-03', 'price', 'discount'), ('s3', '2025-03-04', 'price', 'pause'),
    ('s4', '2025-03-05', 'too much food', 'pause'), ('s5', '2025-03-06', 'too much food', 'pause'), ('s6', '2025-03-07', 'too much food', 'skip week'),
    ('s7', '2025-03-08', 'moving', NULL), ('s8', '2025-03-09', 'price', 'discount'), ('s9', '2025-03-10', 'quality', 'discount'),
    ('s10', '2025-03-11', 'quality', NULL)
),
outcomes(subscriber, saved, still_active_60d) AS (
  VALUES ('s1', 1, 1), ('s2', 1, 0), ('s3', 0, 0), ('s4', 1, 1), ('s5', 1, 1), ('s6', 0, 0), ('s7', 0, 0), ('s8', 0, 0), ('s9', 1, 0), ('s10', 0, 0)
)
SELECT s.subscriber, s.reason, s.offered, o.saved, o.still_active_60d
FROM subscribers AS s
JOIN outcomes AS o ON o.subscriber = s.subscriber
ORDER BY s.subscriber;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Join outcomes to subscribers, label missing offers with `COALESCE(offered, 'none')`, and group by reason and offer.
3. `kept_60d_pct` is `100.0 * SUM(still_active_60d) / NULLIF(SUM(saved), 0)` (only saved subscribers can still be active here); `net_kept_pct` divides the same numerator by `COUNT(*)`.

## Solution

```sql
WITH subscribers(subscriber, cancel_requested_on, reason, offered) AS (
  VALUES
    ('s1', '2025-03-02', 'price', 'discount'), ('s2', '2025-03-03', 'price', 'discount'), ('s3', '2025-03-04', 'price', 'pause'),
    ('s4', '2025-03-05', 'too much food', 'pause'), ('s5', '2025-03-06', 'too much food', 'pause'), ('s6', '2025-03-07', 'too much food', 'skip week'),
    ('s7', '2025-03-08', 'moving', NULL), ('s8', '2025-03-09', 'price', 'discount'), ('s9', '2025-03-10', 'quality', 'discount'),
    ('s10', '2025-03-11', 'quality', NULL)
),
outcomes(subscriber, saved, still_active_60d) AS (
  VALUES ('s1', 1, 1), ('s2', 1, 0), ('s3', 0, 0), ('s4', 1, 1), ('s5', 1, 1), ('s6', 0, 0), ('s7', 0, 0), ('s8', 0, 0), ('s9', 1, 0), ('s10', 0, 0)
),
joined AS (
  SELECT s.reason, COALESCE(s.offered, 'none') AS offered, o.saved, o.still_active_60d
  FROM subscribers AS s
  JOIN outcomes AS o ON o.subscriber = s.subscriber
)
SELECT reason, offered, COUNT(*) AS requests, SUM(saved) AS saved,
  ROUND(100.0 * SUM(saved) / COUNT(*), 1) AS save_pct,
  ROUND(100.0 * SUM(still_active_60d) / NULLIF(SUM(saved), 0), 1) AS kept_60d_pct,
  ROUND(100.0 * SUM(still_active_60d) / COUNT(*), 1) AS net_kept_pct
FROM joined
GROUP BY reason, offered
ORDER BY net_kept_pct DESC, reason, offered;
```

## Expected result

| reason | offered | requests | saved | save_pct | kept_60d_pct | net_kept_pct |
| --- | --- | --- | --- | --- | --- | --- |
| too much food | pause | 2 | 2 | 100 | 100 | 100 |
| price | discount | 3 | 2 | 66.7 | 50 | 33.3 |
| moving | none | 1 | 0 | 0 | NULL | 0 |
| price | pause | 1 | 0 | 0 | NULL | 0 |
| quality | discount | 1 | 1 | 100 | 0 | 0 |
| quality | none | 1 | 0 | 0 | NULL | 0 |
| too much food | skip week | 1 | 0 | 0 | NULL | 0 |

## Explanation

A save offer has two outcomes: the subscriber stays today, and the subscriber is still there later. Price-motivated subscribers offered a discount were saved two times out of three, but only half of those stayed 60 days, so the offer kept just a third of requests. Subscribers with too much food who were offered a pause were all saved and all stayed: the offer fixed their actual problem.

The quality complaint is a warning: a discount saved that subscriber for a while, but they were gone within 60 days, because a discount does not fix quality. Requests with no offer are kept as `'none'` with `COALESCE`, which shows what happens without intervention (here, nobody stays).

**Common mistake:** dropping requests with no offer. The baseline disappears, so there is nothing to compare the offers with.

## Wrong answers

Feedback: missing-rows

```sql
WITH subscribers(subscriber, cancel_requested_on, reason, offered) AS ( VALUES ('s1', '2025-03-02', 'price', 'discount'), ('s2', '2025-03-03', 'price', 'discount'), ('s3', '2025-03-04', 'price', 'pause'), ('s4', '2025-03-05', 'too much food', 'pause'), ('s5', '2025-03-06', 'too much food', 'pause'), ('s6', '2025-03-07', 'too much food', 'skip week'), ('s7', '2025-03-08', 'moving', NULL), ('s8', '2025-03-09', 'price', 'discount'), ('s9', '2025-03-10', 'quality', 'discount'), ('s10', '2025-03-11', 'quality', NULL) ), outcomes(subscriber, saved, still_active_60d) AS ( VALUES ('s1', 1, 1), ('s2', 1, 0), ('s3', 0, 0), ('s4', 1, 1), ('s5', 1, 1), ('s6', 0, 0), ('s7', 0, 0), ('s8', 0, 0), ('s9', 1, 0), ('s10', 0, 0) ), joined AS (SELECT s.reason, s.offered, o.saved, o.still_active_60d FROM subscribers AS s JOIN outcomes AS o ON o.subscriber = s.subscriber WHERE s.offered IS NOT NULL) SELECT reason, offered, COUNT(*) AS requests, SUM(saved) AS saved, ROUND(100.0 * SUM(saved) / COUNT(*), 1) AS save_pct, ROUND(100.0 * SUM(still_active_60d) / NULLIF(SUM(saved), 0), 1) AS kept_60d_pct, ROUND(100.0 * SUM(still_active_60d) / COUNT(*), 1) AS net_kept_pct FROM joined GROUP BY reason, offered ORDER BY net_kept_pct DESC, reason, offered;
```
