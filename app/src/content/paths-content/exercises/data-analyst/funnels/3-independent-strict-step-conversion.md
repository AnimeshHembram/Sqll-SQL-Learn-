---
id: da-strict-step-conversion
title: Step-by-step conversion in a strict funnel
order: 3
difficulty: advanced
topic: Strict funnels
summary: Turn a strict funnel into one row per step with the conversion from the previous step.
module: data-analyst
duration: 15
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Build a strict funnel
  - Calculate step-to-step conversion
---

## Task

Using the event log in the starter query, build the **strict** website funnel (a step counts only if every earlier step happened before it). Return four rows with `step_no`, `step` (`'Visit'`, `'Add to cart'`, `'Checkout'`, `'Purchase'`), `users` and `pct_of_previous` (rounded to 1 decimal place, `NULL` for the first step). Sort by `step_no`.

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
),
firsts AS (
  SELECT user_id,
    MIN(CASE WHEN event = 'visit' THEN happened_at END) AS visit_at,
    MIN(CASE WHEN event = 'add_to_cart' THEN happened_at END) AS cart_at,
    MIN(CASE WHEN event = 'checkout' THEN happened_at END) AS checkout_at,
    MIN(CASE WHEN event = 'purchase' THEN happened_at END) AS purchase_at
  FROM events
  GROUP BY user_id
)
SELECT *
FROM firsts;
```

## Hints

1. The starter query already has each user's first time at every step. Count each strict step in a third CTE with `UNION ALL`, one `SELECT` per step.
2. Step 2 counts users with `cart_at > visit_at`; step 3 also needs `checkout_at > cart_at`; step 4 adds `purchase_at > checkout_at`.
3. Then compare each step with the previous one: `(SELECT p.users FROM steps AS p WHERE p.step_no = s.step_no - 1)`.

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
    MIN(CASE WHEN event = 'visit' THEN happened_at END) AS visit_at,
    MIN(CASE WHEN event = 'add_to_cart' THEN happened_at END) AS cart_at,
    MIN(CASE WHEN event = 'checkout' THEN happened_at END) AS checkout_at,
    MIN(CASE WHEN event = 'purchase' THEN happened_at END) AS purchase_at
  FROM events
  GROUP BY user_id
),
steps AS (
  SELECT 1 AS step_no, 'Visit' AS step, COUNT(visit_at) AS users FROM firsts
  UNION ALL
  SELECT 2, 'Add to cart', SUM(CASE WHEN cart_at > visit_at THEN 1 ELSE 0 END) FROM firsts
  UNION ALL
  SELECT 3, 'Checkout', SUM(CASE WHEN checkout_at > cart_at AND cart_at > visit_at THEN 1 ELSE 0 END) FROM firsts
  UNION ALL
  SELECT 4, 'Purchase', SUM(CASE WHEN purchase_at > checkout_at AND checkout_at > cart_at AND cart_at > visit_at THEN 1 ELSE 0 END) FROM firsts
)
SELECT step_no, step, users,
  ROUND(100.0 * users / (SELECT p.users FROM steps AS p WHERE p.step_no = s.step_no - 1), 1) AS pct_of_previous
FROM steps AS s
ORDER BY step_no;
```

## Expected result

| step_no | step | users | pct_of_previous |
| --- | --- | --- | --- |
| 1 | Visit | 7 | NULL |
| 2 | Add to cart | 5 | 71.4 |
| 3 | Checkout | 3 | 60 |
| 4 | Purchase | 2 | 66.7 |

## Explanation

Seven users visited, five then added to the cart (71.4%), three checked out (60.0%) and two bought (66.7%). The weakest step is from cart to checkout. User 7's purchase without a visit is excluded, so the purchase step is not inflated.

## Wrong answers

Feedback: incorrect-output

```sql
WITH events(user_id, event, happened_at) AS ( VALUES (1, 'visit', '2025-05-01 09:00'), (1, 'add_to_cart', '2025-05-01 09:05'), (1, 'checkout', '2025-05-01 09:07'), (1, 'purchase', '2025-05-01 09:08'), (2, 'visit', '2025-05-01 10:00'), (2, 'add_to_cart', '2025-05-01 10:12'), (3, 'visit', '2025-05-02 11:00'), (4, 'visit', '2025-05-02 12:00'), (4, 'add_to_cart', '2025-05-02 12:03'), (4, 'checkout', '2025-05-02 12:09'), (5, 'visit', '2025-05-03 08:30'), (5, 'add_to_cart', '2025-05-03 08:31'), (5, 'add_to_cart', '2025-05-03 08:33'), (5, 'checkout', '2025-05-03 08:40'), (5, 'purchase', '2025-05-03 08:41'), (6, 'visit', '2025-05-03 09:00'), (7, 'purchase', '2025-05-03 09:30'), (8, 'visit', '2025-05-04 14:00'), (8, 'add_to_cart', '2025-05-04 14:02') ), steps AS (SELECT 1 AS step_no, 'Visit' AS step, COUNT(DISTINCT CASE WHEN event = 'visit' THEN user_id END) AS users FROM events UNION ALL SELECT 2, 'Add to cart', COUNT(DISTINCT CASE WHEN event = 'add_to_cart' THEN user_id END) FROM events UNION ALL SELECT 3, 'Checkout', COUNT(DISTINCT CASE WHEN event = 'checkout' THEN user_id END) FROM events UNION ALL SELECT 4, 'Purchase', COUNT(DISTINCT CASE WHEN event = 'purchase' THEN user_id END) FROM events) SELECT step_no, step, users, ROUND(100.0 * users / (SELECT p.users FROM steps AS p WHERE p.step_no = s.step_no - 1), 1) AS pct_of_previous FROM steps AS s ORDER BY step_no;
```
