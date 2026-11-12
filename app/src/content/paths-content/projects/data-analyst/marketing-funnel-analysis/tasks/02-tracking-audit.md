---
id: mfa-02-tracking-audit
title: Audit the event tracking
order: 2
difficulty: intermediate
topic: Data quality
summary: Check the event log for duplicate events and purchases whose checkout event is missing before building a funnel on it.
module: traffic-and-tracking
duration: 20
dataset: vidya-loop
tables:
  - events
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Audit an event log before analysing it
  - Report several checks in one row with scalar subqueries
prerequisites:
  - Scalar subqueries
  - GROUP BY with HAVING
  - DISTINCT
---

## Task

Funnels are built from tracking events, and tracking is never perfect. Before you trust the `events` table, return **one row** with:

- `events`: all rows in `events`,
- `duplicate_events`: rows that repeat a step already logged in the same session (all events minus the distinct session-and-step pairs),
- `purchases_without_checkout`: sessions that have a `'purchase'` event but no `'checkout'` event,
- `purchase_sessions`: sessions with a `'purchase'` event,
- `orders`: rows in `orders` (the finance system's record of sales).

## Starter query

```sql
SELECT step, COUNT(*) AS events
FROM events
GROUP BY step;
```

## Hints

1. Each value can be its own scalar subquery: `SELECT (SELECT COUNT(*) FROM events) AS events, (...) AS duplicate_events, ...`.
2. Distinct session-and-step pairs: `SELECT COUNT(*) FROM (SELECT DISTINCT session_id, step FROM events)`. Subtract that from all events.
3. For sessions with a purchase but no checkout, group events by session and keep `HAVING MAX(step = 'purchase') = 1 AND MAX(step = 'checkout') = 0`, then count those sessions.

## Solution

```sql
SELECT (SELECT COUNT(*) FROM events) AS events,
       (SELECT COUNT(*) FROM events) - (SELECT COUNT(*) FROM (SELECT DISTINCT session_id, step FROM events)) AS duplicate_events,
       (SELECT COUNT(*) FROM (
          SELECT session_id
          FROM events
          GROUP BY session_id
          HAVING MAX(step = 'purchase') = 1 AND MAX(step = 'checkout') = 0
        )) AS purchases_without_checkout,
       (SELECT COUNT(DISTINCT session_id) FROM events WHERE step = 'purchase') AS purchase_sessions,
       (SELECT COUNT(*) FROM orders) AS orders;
```

## Expected result

| events | duplicate_events | purchases_without_checkout | purchase_sessions | orders |
| --- | --- | --- | --- | --- |
| 2027 | 67 | 9 | 141 | 141 |

## Explanation

Scalar subqueries let one row report several unrelated checks. `MAX(condition)` per session is 1 if any event in the session matches, which is how a session's steps are tested throughout this project.

**What it tells the business:** **67 events (3.3%) are duplicates**, logged twice by the tracking script, and **9 purchases have no checkout event**. Purchase events match the 141 orders in the finance system exactly, so sales are tracked reliably. Two rules follow for every funnel in this project: count **sessions or visitors that reached a step**, never raw events, and treat a purchase as proof that checkout was reached.

**Common mistake:** counting rows of `events` per step and calling it a funnel. Duplicates inflate every step, and the lost checkout events make the checkout step look smaller than the purchase step that follows it.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT (SELECT COUNT(*) FROM events) AS events,
       (SELECT COUNT(*) FROM events) - (SELECT COUNT(DISTINCT session_id) FROM events) AS duplicate_events,
       (SELECT COUNT(*) FROM (SELECT session_id FROM events GROUP BY session_id HAVING MAX(step = 'purchase') = 1 AND MAX(step = 'checkout') = 0)) AS purchases_without_checkout,
       (SELECT COUNT(DISTINCT session_id) FROM events WHERE step = 'purchase') AS purchase_sessions,
       (SELECT COUNT(*) FROM orders) AS orders;
```

Feedback: incorrect-output

```sql
SELECT (SELECT COUNT(*) FROM events) AS events,
       (SELECT COUNT(*) FROM events) - (SELECT COUNT(*) FROM (SELECT DISTINCT session_id, step FROM events)) AS duplicate_events,
       (SELECT COUNT(*) FROM events WHERE step = 'purchase') - (SELECT COUNT(*) FROM events WHERE step = 'checkout') AS purchases_without_checkout,
       (SELECT COUNT(*) FROM events WHERE step = 'purchase') AS purchase_sessions,
       (SELECT COUNT(*) FROM orders) AS orders;
```
