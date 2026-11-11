---
id: da-day-156
title: A funnel where order matters
order: 156
difficulty: advanced
topic: Temporal analysis
summary: Count users through view, cart and purchase steps that happen in sequence and inside a time window.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Enforce step order in a funnel
  - Apply a conversion window
prerequisites:
  - Day 110
  - Day 111
---

## Task

Growth wants a proper funnel from the event log (in the starter query). A user:

- **viewed** if they have any `view` event (their first view starts the funnel),
- reached **cart** if they have a `cart` event **after** their first view,
- reached **purchase** if they have a `purchase` event after that first cart, and **no more than 7 days** after their first view.

Repeated events count once. Return `step` (1, 2, 3), `event`, `users`, `pct_of_viewers` and `step_conversion_pct` (users at this step as a percentage of the previous step; 100 for step 1), both rounded to 1 decimal place. Sort by `step`.

## Starter query

```sql
WITH events(user_id, event, at) AS (
  VALUES
    ('u1', 'view', '2025-03-01 10:00'), ('u1', 'cart', '2025-03-01 10:05'), ('u1', 'purchase', '2025-03-02 09:00'),
    ('u2', 'view', '2025-03-01 11:00'), ('u2', 'cart', '2025-03-03 12:00'),
    ('u3', 'cart', '2025-02-28 18:00'), ('u3', 'view', '2025-03-02 08:00'),
    ('u4', 'view', '2025-03-01 09:00'), ('u4', 'cart', '2025-03-02 09:30'), ('u4', 'purchase', '2025-03-12 10:00'),
    ('u5', 'view', '2025-03-05 14:00'), ('u5', 'purchase', '2025-03-06 15:00'),
    ('u6', 'view', '2025-03-03 16:00'), ('u6', 'view', '2025-03-04 10:00'), ('u6', 'cart', '2025-03-04 10:10'),
    ('u6', 'cart', '2025-03-04 10:12'), ('u6', 'purchase', '2025-03-05 20:00'),
    ('u7', 'purchase', '2025-03-02 13:00')
)
SELECT user_id, event, at
FROM events
ORDER BY user_id, at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Per user, find the first view: `MIN(at) FILTER (WHERE event = 'view')`, or `MIN(CASE WHEN event = 'view' THEN at END)`. Then the first cart after it, and then the first purchase after that cart. Correlated subqueries or successive CTEs both work.
3. Count users with a non-`NULL` time at each step. For the 7-day limit use `julianday(purchase_at) - julianday(first_view) <= 7`. Build the three rows with `UNION ALL` in a CTE, then add the percentages with `FIRST_VALUE` and `LAG` over `step`.

## Solution

```sql
WITH events(user_id, event, at) AS (
  VALUES
    ('u1', 'view', '2025-03-01 10:00'), ('u1', 'cart', '2025-03-01 10:05'), ('u1', 'purchase', '2025-03-02 09:00'),
    ('u2', 'view', '2025-03-01 11:00'), ('u2', 'cart', '2025-03-03 12:00'),
    ('u3', 'cart', '2025-02-28 18:00'), ('u3', 'view', '2025-03-02 08:00'),
    ('u4', 'view', '2025-03-01 09:00'), ('u4', 'cart', '2025-03-02 09:30'), ('u4', 'purchase', '2025-03-12 10:00'),
    ('u5', 'view', '2025-03-05 14:00'), ('u5', 'purchase', '2025-03-06 15:00'),
    ('u6', 'view', '2025-03-03 16:00'), ('u6', 'view', '2025-03-04 10:00'), ('u6', 'cart', '2025-03-04 10:10'),
    ('u6', 'cart', '2025-03-04 10:12'), ('u6', 'purchase', '2025-03-05 20:00'),
    ('u7', 'purchase', '2025-03-02 13:00')
),
firsts AS (
  SELECT user_id, MIN(at) AS first_view FROM events WHERE event = 'view' GROUP BY user_id
),
carts AS (
  SELECT f.user_id, f.first_view,
    (SELECT MIN(e.at) FROM events AS e WHERE e.user_id = f.user_id AND e.event = 'cart' AND e.at > f.first_view) AS cart_at
  FROM firsts AS f
),
purchases AS (
  SELECT c.user_id, c.cart_at,
    (SELECT MIN(e.at) FROM events AS e
     WHERE e.user_id = c.user_id AND e.event = 'purchase' AND e.at > c.cart_at
       AND julianday(e.at) - julianday(c.first_view) <= 7) AS purchase_at
  FROM carts AS c
),
steps AS (
  SELECT 1 AS step, 'view' AS event, COUNT(*) AS users FROM purchases
  UNION ALL
  SELECT 2, 'cart', COUNT(cart_at) FROM purchases
  UNION ALL
  SELECT 3, 'purchase', COUNT(purchase_at) FROM purchases
)
SELECT step, event, users,
  ROUND(100.0 * users / FIRST_VALUE(users) OVER (ORDER BY step), 1) AS pct_of_viewers,
  ROUND(100.0 * users / COALESCE(LAG(users) OVER (ORDER BY step), users), 1) AS step_conversion_pct
FROM steps
ORDER BY step;
```

## Expected result

| step | event | users | pct_of_viewers | step_conversion_pct |
| --- | --- | --- | --- | --- |
| 1 | view | 6 | 100 | 100 |
| 2 | cart | 4 | 66.7 | 66.7 |
| 3 | purchase | 2 | 33.3 | 50 |

## Explanation

A funnel is only meaningful if the steps happen in order. u3 added to the cart **before** viewing, so u3 counts as a viewer but not a cart user. u5 bought without carting, which skips a step; u4's purchase came 11 days after the first view, outside the window. u6 viewed and carted twice; using the first time at each step keeps every user counted once.

That leaves 6 viewers, 4 cart users and 2 purchasers: 66.7% of viewers reach the cart, and half of those buy. u7 bought without ever viewing (for example from an email link), so u7 is not in a view-started funnel at all.

**Common mistake:** counting distinct users per event type, which ignores order and windows and reports 5 cart users and 5 purchasers, more purchasers than viewers who reach the cart.

## Wrong answers

Feedback: incorrect-output

```sql
WITH events(user_id, event, at) AS ( VALUES ('u1', 'view', '2025-03-01 10:00'), ('u1', 'cart', '2025-03-01 10:05'), ('u1', 'purchase', '2025-03-02 09:00'), ('u2', 'view', '2025-03-01 11:00'), ('u2', 'cart', '2025-03-03 12:00'), ('u3', 'cart', '2025-02-28 18:00'), ('u3', 'view', '2025-03-02 08:00'), ('u4', 'view', '2025-03-01 09:00'), ('u4', 'cart', '2025-03-02 09:30'), ('u4', 'purchase', '2025-03-12 10:00'), ('u5', 'view', '2025-03-05 14:00'), ('u5', 'purchase', '2025-03-06 15:00'), ('u6', 'view', '2025-03-03 16:00'), ('u6', 'view', '2025-03-04 10:00'), ('u6', 'cart', '2025-03-04 10:10'), ('u6', 'cart', '2025-03-04 10:12'), ('u6', 'purchase', '2025-03-05 20:00'), ('u7', 'purchase', '2025-03-02 13:00') ), steps AS (SELECT 1 AS step, 'view' AS event, COUNT(DISTINCT CASE WHEN event = 'view' THEN user_id END) AS users FROM events UNION ALL SELECT 2, 'cart', COUNT(DISTINCT CASE WHEN event = 'cart' THEN user_id END) FROM events UNION ALL SELECT 3, 'purchase', COUNT(DISTINCT CASE WHEN event = 'purchase' THEN user_id END) FROM events) SELECT step, event, users, ROUND(100.0 * users / FIRST_VALUE(users) OVER (ORDER BY step), 1) AS pct_of_viewers, ROUND(100.0 * users / COALESCE(LAG(users) OVER (ORDER BY step), users), 1) AS step_conversion_pct FROM steps ORDER BY step;
```
