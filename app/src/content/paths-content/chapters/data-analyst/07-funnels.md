---
id: funnels
title: Funnels and conversion
module: data-analyst
order: 7
level: intermediate
duration: 40
summary: Measure how many people reach each step of a process, the conversion between steps and where they drop off.
objectives:
  - Define a funnel as an ordered list of steps, each counted once per person
  - Count the people who reached each step and stack the steps into one table with UNION ALL
  - Calculate conversion from the start and from the previous step
  - Require steps to happen in order, and find the people who dropped off
---

A **funnel** follows people through a sequence of steps: visit the site, add a book to the cart, check out, pay. At each step some people continue and some stop. The funnel shows how many reach each step, and therefore where the biggest losses happen. It is one of the most requested analyses in product and marketing teams.

## Why analysts use this

A single "conversion rate" (buyers ÷ visitors) says that something is wrong, but not where. A funnel breaks the journey into steps so a team can see that, say, half of the people who add to cart never reach checkout, and work on that step.

Every funnel needs three decisions, written down before any query:

1. **The steps, in order.** For example: signed up → ordered → order not cancelled → order delivered.
2. **Who is counted.** Usually each person once per step, however many times they did it.
3. **Whether order matters.** A strict funnel only counts a step if the previous step happened earlier.

## Syntax

```sql syntax
-- People who reached a step: count each person once
SELECT COUNT(DISTINCT person_id) FROM events WHERE event = 'step_name';

-- Stack one row per step into a single table
SELECT 1 AS step_no, 'First step' AS step, COUNT(...) AS people FROM ...
UNION ALL
SELECT 2, 'Second step', COUNT(...) FROM ...
ORDER BY step_no;

-- Conversion from the first step
ROUND(100.0 * people / first_step_people, 1)
```

- `UNION ALL` stacks the rows of several `SELECT`s that have the same number of columns. Unlike `UNION`, it keeps every row and does not check for duplicates, which is what you want when each `SELECT` is a different step.
- The column names come from the first `SELECT`.
- A step number column keeps the steps in the right order; alphabetical order would mix them up.

## Examples

### A customer funnel from the bookstore tables

The bookstore's own data has a funnel: customers sign up, place an order, keep it (not cancelled), and receive it (delivered). Each step is a count of different customers:

```sql
SELECT 1 AS step_no, 'Signed up' AS step, COUNT(*) AS customers FROM customers
UNION ALL
SELECT 2, 'Placed an order', COUNT(DISTINCT customer_id) FROM orders
UNION ALL
SELECT 3, 'Kept an order', COUNT(DISTINCT customer_id) FROM orders WHERE status <> 'cancelled'
UNION ALL
SELECT 4, 'Received an order', COUNT(DISTINCT customer_id) FROM orders WHERE status = 'delivered'
ORDER BY step_no;
```

Expected output:

| step_no | step | customers |
| --- | --- | --- |
| 1 | Signed up | 5 |
| 2 | Placed an order | 4 |
| 3 | Kept an order | 3 |
| 4 | Received an order | 3 |

`COUNT(DISTINCT customer_id)` counts a customer once even if they placed several orders. Steps 2 and 3 each lose one customer: Meera Pillai has not ordered yet, and Sofia Rossi ordered but cancelled. Every customer who kept an order also received one.

### Conversion rates

Put the funnel in a CTE, then compare every step with the first step and with the step before it. The previous step's count comes from a scalar subquery on the same CTE:

```sql
WITH funnel AS (
  SELECT 1 AS step_no, 'Signed up' AS step, COUNT(*) AS customers FROM customers
  UNION ALL
  SELECT 2, 'Placed an order', COUNT(DISTINCT customer_id) FROM orders
  UNION ALL
  SELECT 3, 'Kept an order', COUNT(DISTINCT customer_id) FROM orders WHERE status <> 'cancelled'
)
SELECT step_no, step, customers,
  ROUND(100.0 * customers / (SELECT customers FROM funnel WHERE step_no = 1), 1) AS pct_of_start,
  ROUND(100.0 * customers / (SELECT p.customers FROM funnel AS p WHERE p.step_no = f.step_no - 1), 1) AS pct_of_previous
FROM funnel AS f
ORDER BY step_no;
```

| step_no | step | customers | pct_of_start | pct_of_previous |
| --- | --- | --- | --- | --- |
| 1 | Signed up | 5 | 100 | NULL |
| 2 | Placed an order | 4 | 80 | 80 |
| 3 | Kept an order | 3 | 60 | 75 |

The first step has no previous step, so its `pct_of_previous` is `NULL`, which is correct. Sixty percent of sign-ups became buyers who kept an order.

### A website funnel from event data

Product funnels are usually built from an **event log**: one row each time a person does something. The `WITH` block below creates a small log so you can run the queries; in real work this would be a table.

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
SELECT event, COUNT(*) AS events, COUNT(DISTINCT user_id) AS users
FROM events
GROUP BY event
ORDER BY users DESC, event;
```

| event | events | users |
| --- | --- | --- |
| visit | 7 | 7 |
| add_to_cart | 6 | 5 |
| checkout | 3 | 3 |
| purchase | 3 | 3 |

User 5 added to cart twice, so `add_to_cart` has 6 events but 5 users. A funnel counts **users**. Notice also user 7: a purchase with no visit. Logs often contain events like this (a tracking gap, or a purchase from an old link), which is why the next example checks the order of steps.

### A strict funnel: each step after the previous one

To count a step only when the previous step happened first, find each user's first time at every step, then compare the times. One row per user, one column per step:

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
SELECT
  COUNT(visit_at) AS visited,
  SUM(CASE WHEN cart_at > visit_at THEN 1 ELSE 0 END) AS added_to_cart,
  SUM(CASE WHEN checkout_at > cart_at AND cart_at > visit_at THEN 1 ELSE 0 END) AS checked_out,
  SUM(CASE WHEN purchase_at > checkout_at AND checkout_at > cart_at AND cart_at > visit_at THEN 1 ELSE 0 END) AS purchased
FROM firsts;
```

| visited | added_to_cart | checked_out | purchased |
| --- | --- | --- | --- |
| 7 | 5 | 3 | 2 |

User 7's purchase is not counted, because there is no visit before it: the strict funnel reports 2 purchasers, the simple count above reported 3. A comparison with `NULL` is never true, so a missing step automatically fails every later condition.

## How the query runs

For the strict funnel:

1. `events` provides the log.
2. `firsts` groups the log by user. Each `MIN(CASE WHEN event = ... THEN happened_at END)` keeps that user's first time at one step; `CASE` returns `NULL` for other events, and `MIN` ignores `NULL`s.
3. The final query looks at one row per user. Each `CASE` checks that the times increase step by step and adds 1 for every user who passes.

## Common mistakes

**Counting events instead of people.** `COUNT(*)` on an event log counts actions. A user who adds to cart five times would count five times and make the funnel look better than it is. Use `COUNT(DISTINCT user_id)`.

**Sorting steps by name.** Without a step number, `ORDER BY step` puts "Kept an order" before "Placed an order". Keep an explicit `step_no`.

**Using `UNION` for the steps.** `UNION` removes duplicate rows. Two steps with the same name and count would collapse into one row. Use `UNION ALL`.

**Mismatched columns.** Every `SELECT` in a `UNION ALL` must return the same number of columns:

```sql error
SELECT 1 AS step_no, 'Signed up' AS step, COUNT(*) AS customers FROM customers
UNION ALL
SELECT 2, COUNT(DISTINCT customer_id) FROM orders;
```

**Ignoring order.** A simple count per step can include people who skipped steps or did them backwards. Decide whether the funnel is strict, and say so in the report.

## Key takeaways

- A funnel is an ordered list of steps; each step counts each person once.
- `UNION ALL` stacks one row per step; a `step_no` column keeps the order.
- Conversion from the start compares every step with step 1; step conversion compares it with the previous step.
- For a strict funnel, take each person's first time at each step with `MIN(CASE ...)` and require the times to increase.
- Event logs contain surprises; a strict funnel stops them inflating later steps.
