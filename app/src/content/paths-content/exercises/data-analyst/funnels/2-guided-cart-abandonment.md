---
id: da-cart-abandonment
title: Cart abandonment rate
order: 2
difficulty: intermediate
topic: Conversion
summary: Find the share of users who added to the cart but never bought.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: false
checkColumnNames: true
objectives:
  - Calculate a drop-off rate
  - Compare event times per user
---

## Task

Using the event log in the starter query, return one row with `cart_users` (users who added to the cart), `cart_buyers` (of those users, how many have a purchase after their first add to cart) and `abandonment_pct` (the percentage of cart users who did **not** buy, rounded to 1 decimal place).

**Steps**

1. Keep the `WITH events ...` block. Add a second CTE, `firsts`, with one row per user: their first `add_to_cart` time and first `purchase` time, using `MIN(CASE WHEN event = '...' THEN happened_at END)`.
2. Cart users have a cart time: `COUNT(cart_at)` counts the non-`NULL` ones. Cart buyers also have a purchase time later than the cart time.
3. Abandonment is `100.0 * (cart_users - cart_buyers) / cart_users`.

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
FROM events;
```

## Hints

1. Work per user first: grouping the events by `user_id` gives one row per person.
2. `SUM(CASE WHEN purchase_at > cart_at THEN 1 ELSE 0 END)` counts buyers; a missing purchase time makes the comparison fail.
3. Final query: `SELECT COUNT(cart_at) AS cart_users, SUM(CASE WHEN purchase_at > cart_at THEN 1 ELSE 0 END) AS cart_buyers, ROUND(100.0 * (COUNT(cart_at) - SUM(CASE WHEN purchase_at > cart_at THEN 1 ELSE 0 END)) / COUNT(cart_at), 1) AS abandonment_pct FROM firsts`.

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
),
firsts AS (
  SELECT user_id,
    MIN(CASE WHEN event = 'add_to_cart' THEN happened_at END) AS cart_at,
    MIN(CASE WHEN event = 'purchase' THEN happened_at END) AS purchase_at
  FROM events
  GROUP BY user_id
)
SELECT COUNT(cart_at) AS cart_users,
  SUM(CASE WHEN purchase_at > cart_at THEN 1 ELSE 0 END) AS cart_buyers,
  ROUND(100.0 * (COUNT(cart_at) - SUM(CASE WHEN purchase_at > cart_at THEN 1 ELSE 0 END)) / COUNT(cart_at), 1) AS abandonment_pct
FROM firsts;
```

## Expected result

| cart_users | cart_buyers | abandonment_pct |
| --- | --- | --- |
| 5 | 2 | 60 |

## Explanation

Five users added to the cart and two of them bought afterwards, so 60.0% abandoned their cart. User 7 bought without a cart event and user 5's second cart event is ignored, because the calculation works per user, from first times.

## Wrong answers

Feedback: incorrect-output

```sql
WITH events(user_id, event, happened_at) AS ( VALUES (1, 'visit', '2025-05-01 09:00'), (1, 'add_to_cart', '2025-05-01 09:05'), (1, 'checkout', '2025-05-01 09:07'), (1, 'purchase', '2025-05-01 09:08'), (2, 'visit', '2025-05-01 10:00'), (2, 'add_to_cart', '2025-05-01 10:12'), (3, 'visit', '2025-05-02 11:00'), (4, 'visit', '2025-05-02 12:00'), (4, 'add_to_cart', '2025-05-02 12:03'), (4, 'checkout', '2025-05-02 12:09'), (5, 'visit', '2025-05-03 08:30'), (5, 'add_to_cart', '2025-05-03 08:31'), (5, 'add_to_cart', '2025-05-03 08:33'), (5, 'checkout', '2025-05-03 08:40'), (5, 'purchase', '2025-05-03 08:41'), (6, 'visit', '2025-05-03 09:00'), (7, 'purchase', '2025-05-03 09:30'), (8, 'visit', '2025-05-04 14:00'), (8, 'add_to_cart', '2025-05-04 14:02') ) SELECT COUNT(CASE WHEN event = 'add_to_cart' THEN 1 END) AS cart_users, COUNT(CASE WHEN event = 'purchase' THEN 1 END) AS cart_buyers, ROUND(100.0 * (COUNT(CASE WHEN event = 'add_to_cart' THEN 1 END) - COUNT(CASE WHEN event = 'purchase' THEN 1 END)) / COUNT(CASE WHEN event = 'add_to_cart' THEN 1 END), 1) AS abandonment_pct FROM events;
```
