---
id: da-stuck-in-cart
title: Users who never reached checkout
order: 4
difficulty: intermediate
topic: Drop-off
summary: List the people who dropped off between two steps, for follow-up.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: false
checkColumnNames: true
objectives:
  - List the people who dropped off between steps
---

## Task

The marketing team wants to send a reminder to everyone who added a book to their cart but **never checked out**. Using the event log in the starter query, return `user_id` and `cart_at` (their first add-to-cart time). Row order does not matter.

## Starter query

```sql
WITH events(user_id, event, happened_at) AS (
  VALUES
    (1, 'visit', '2025-05-01 09:00'), (1, 'add_to_cart', '2025-05-01 09:05'), (1, 'checkout', '2025-05-01 09:07'), (1, 'purchase', '2025-05-01 09:08'),
    (2, 'visit', '2025-05-01 10:00'), (2, 'add_to_cart', '2025-05-01 10:12'),
    (3, 'visit', '2025-05-02 11:00'),
    (4, 'visit', '2025-05-02 12:00'), (4, 'add_to_cart', '2025-05-02 12:03'), (4, 'checkout', '2025-05-02 12:09'),
    (5, 'visit', '2025-05-03 08:30'), (5, 'add_to_cart', '2025-05-03 08:31'), (5, 'add_to_cart', '2025-05-03 08:33'), (5, 'checkout', '2025-05-03 08:40'), (5, 'purchase', '2025-05-03 08:41'),
    (6, 'visit', '2025-05-03 09:00'),
    (7, 'purchase', '2025-05-03 09:30'),
    (8, 'visit', '2025-05-04 14:00'), (8, 'add_to_cart', '2025-05-04 14:02')
)
SELECT user_id, event, happened_at
FROM events
WHERE event = 'add_to_cart';
```

## Hints

1. Start from add-to-cart events and group them by user, so each user appears once with `MIN(happened_at)`.
2. Keep users who have no checkout event: `NOT EXISTS (SELECT 1 FROM events AS c WHERE c.user_id = e.user_id AND c.event = 'checkout')`.
3. `SELECT e.user_id, MIN(e.happened_at) AS cart_at FROM events AS e WHERE e.event = 'add_to_cart' AND NOT EXISTS (...) GROUP BY e.user_id`

## Solution

```sql
WITH events(user_id, event, happened_at) AS (
  VALUES
    (1, 'visit', '2025-05-01 09:00'), (1, 'add_to_cart', '2025-05-01 09:05'), (1, 'checkout', '2025-05-01 09:07'), (1, 'purchase', '2025-05-01 09:08'),
    (2, 'visit', '2025-05-01 10:00'), (2, 'add_to_cart', '2025-05-01 10:12'),
    (3, 'visit', '2025-05-02 11:00'),
    (4, 'visit', '2025-05-02 12:00'), (4, 'add_to_cart', '2025-05-02 12:03'), (4, 'checkout', '2025-05-02 12:09'),
    (5, 'visit', '2025-05-03 08:30'), (5, 'add_to_cart', '2025-05-03 08:31'), (5, 'add_to_cart', '2025-05-03 08:33'), (5, 'checkout', '2025-05-03 08:40'), (5, 'purchase', '2025-05-03 08:41'),
    (6, 'visit', '2025-05-03 09:00'),
    (7, 'purchase', '2025-05-03 09:30'),
    (8, 'visit', '2025-05-04 14:00'), (8, 'add_to_cart', '2025-05-04 14:02')
)
SELECT e.user_id, MIN(e.happened_at) AS cart_at
FROM events AS e
WHERE e.event = 'add_to_cart'
  AND NOT EXISTS (
    SELECT 1 FROM events AS c WHERE c.user_id = e.user_id AND c.event = 'checkout'
  )
GROUP BY e.user_id;
```

## Expected result

| user_id | cart_at |
| --- | --- |
| 2 | 2025-05-01 10:12 |
| 8 | 2025-05-04 14:02 |

## Explanation

Users 2 and 8 added a book to their cart and stopped there. A funnel shows how many people drop off; this list shows who, which turns the analysis into something a team can act on.

## Other accepted answers

```sql
WITH events(user_id, event, happened_at) AS ( VALUES (1, 'visit', '2025-05-01 09:00'), (1, 'add_to_cart', '2025-05-01 09:05'), (1, 'checkout', '2025-05-01 09:07'), (1, 'purchase', '2025-05-01 09:08'), (2, 'visit', '2025-05-01 10:00'), (2, 'add_to_cart', '2025-05-01 10:12'), (3, 'visit', '2025-05-02 11:00'), (4, 'visit', '2025-05-02 12:00'), (4, 'add_to_cart', '2025-05-02 12:03'), (4, 'checkout', '2025-05-02 12:09'), (5, 'visit', '2025-05-03 08:30'), (5, 'add_to_cart', '2025-05-03 08:31'), (5, 'add_to_cart', '2025-05-03 08:33'), (5, 'checkout', '2025-05-03 08:40'), (5, 'purchase', '2025-05-03 08:41'), (6, 'visit', '2025-05-03 09:00'), (7, 'purchase', '2025-05-03 09:30'), (8, 'visit', '2025-05-04 14:00'), (8, 'add_to_cart', '2025-05-04 14:02') ) SELECT user_id, MIN(happened_at) AS cart_at FROM events WHERE event = 'add_to_cart' AND user_id NOT IN (SELECT user_id FROM events WHERE event = 'checkout') GROUP BY user_id;
```

## Wrong answers

Feedback: extra-rows

```sql
WITH events(user_id, event, happened_at) AS ( VALUES (1, 'visit', '2025-05-01 09:00'), (1, 'add_to_cart', '2025-05-01 09:05'), (1, 'checkout', '2025-05-01 09:07'), (1, 'purchase', '2025-05-01 09:08'), (2, 'visit', '2025-05-01 10:00'), (2, 'add_to_cart', '2025-05-01 10:12'), (3, 'visit', '2025-05-02 11:00'), (4, 'visit', '2025-05-02 12:00'), (4, 'add_to_cart', '2025-05-02 12:03'), (4, 'checkout', '2025-05-02 12:09'), (5, 'visit', '2025-05-03 08:30'), (5, 'add_to_cart', '2025-05-03 08:31'), (5, 'add_to_cart', '2025-05-03 08:33'), (5, 'checkout', '2025-05-03 08:40'), (5, 'purchase', '2025-05-03 08:41'), (6, 'visit', '2025-05-03 09:00'), (7, 'purchase', '2025-05-03 09:30'), (8, 'visit', '2025-05-04 14:00'), (8, 'add_to_cart', '2025-05-04 14:02') ) SELECT user_id, MIN(happened_at) AS cart_at FROM events WHERE event = 'add_to_cart' GROUP BY user_id;
```
