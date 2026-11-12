---
id: mfa-09-checkout-test-results
title: Checkout A/B test: the headline result
order: 9
difficulty: intermediate
topic: Experiments
summary: Compare checkout conversion and revenue per checkout between the current page (A) and the new page (B).
module: experiment
duration: 25
dataset: vidya-loop
tables:
  - sessions
  - events
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Compare an A/B test on the affected population
  - Report conversion and revenue per visitor together
prerequisites:
  - Common table expressions
  - LEFT JOIN
  - GROUP BY
---

## Task

From 17 February, every session was randomly shown the current checkout page (`variant = 'A'`) or a redesigned one (`'B'`). Using sessions in the test (`variant` is not NULL) that **reached checkout** (a `'checkout'` or `'purchase'` event), return per `variant`:

`checkout_sessions`, `purchases`, `conversion_pct` (one decimal) and `revenue_per_checkout`: the revenue of those sessions' orders divided by the number of checkout sessions, rounded to a whole rupee. Sort by `variant`.

## Starter query

```sql
SELECT variant, COUNT(*) AS sessions
FROM sessions
GROUP BY variant;
```

## Hints

1. Reuse the checkout-session CTE from Task 5 (one row per session that reached checkout, with a purchased flag), and add `s.variant`.
2. Keep only test sessions: `WHERE s.variant IS NOT NULL` before grouping the events.
3. `LEFT JOIN orders` to the checkout sessions so sessions without a purchase stay in the count; `SUM(o.price - o.discount)` ignores the missing rows.

## Solution

```sql
WITH checkouts AS (
  SELECT s.session_id, s.device, s.variant, MAX(e.step = 'purchase') AS purchased
  FROM sessions AS s
  JOIN events AS e ON e.session_id = s.session_id
  GROUP BY s.session_id
  HAVING MAX(e.step IN ('checkout', 'purchase')) = 1
)
SELECT c.variant,
       COUNT(*) AS checkout_sessions,
       SUM(c.purchased) AS purchases,
       ROUND(100.0 * SUM(c.purchased) / COUNT(*), 1) AS conversion_pct,
       ROUND(1.0 * COALESCE(SUM(o.price - o.discount), 0) / COUNT(*), 0) AS revenue_per_checkout
FROM checkouts AS c
LEFT JOIN orders AS o ON o.session_id = c.session_id
WHERE c.variant IS NOT NULL
GROUP BY c.variant
ORDER BY c.variant;
```

## Expected result

| variant | checkout_sessions | purchases | conversion_pct | revenue_per_checkout |
| --- | --- | --- | --- | --- |
| A | 71 | 32 | 45.1 | 1943 |
| B | 81 | 52 | 64.2 | 2858 |

## Explanation

The analysis unit is the checkout session, the population the redesign could affect. Revenue per checkout combines "did they buy?" and "how much?" into one number the business cares about.

**What it tells the business:** the new page converts **64.2% of checkouts against 45.1%**, and earns **₹2,858 per checkout against ₹1,943**, about 47% more. That looks like a clear win, but with 71 and 81 sessions the groups are small, and the overall number could hide a different story per device. Task 10 checks both.

**Common mistake:** comparing all test sessions instead of checkout sessions. Most sessions never reach checkout and could not be affected by the change, so they dilute the difference and make the redesign look weaker than it is.

## Wrong answers

Feedback: incorrect-output

```sql
WITH test_sessions AS (
  SELECT s.session_id, s.variant, MAX(e.step = 'purchase') AS purchased
  FROM sessions AS s LEFT JOIN events AS e ON e.session_id = s.session_id
  WHERE s.variant IS NOT NULL GROUP BY s.session_id
)
SELECT t.variant, COUNT(*) AS checkout_sessions, SUM(t.purchased) AS purchases,
       ROUND(100.0 * SUM(t.purchased) / COUNT(*), 1) AS conversion_pct,
       ROUND(1.0 * COALESCE(SUM(o.price - o.discount), 0) / COUNT(*), 0) AS revenue_per_checkout
FROM test_sessions AS t LEFT JOIN orders AS o ON o.session_id = t.session_id
GROUP BY t.variant ORDER BY t.variant;
```

Feedback: incorrect-output

```sql
WITH checkouts AS (
  SELECT s.session_id, s.device, s.variant, MAX(e.step = 'purchase') AS purchased
  FROM sessions AS s
  JOIN events AS e ON e.session_id = s.session_id
  GROUP BY s.session_id
  HAVING MAX(e.step IN ('checkout', 'purchase')) = 1
)
SELECT c.variant, COUNT(*) AS checkout_sessions, SUM(c.purchased) AS purchases,
       ROUND(100.0 * SUM(c.purchased) / COUNT(*), 1) AS conversion_pct,
       ROUND(AVG(o.price - o.discount), 0) AS revenue_per_checkout
FROM checkouts AS c LEFT JOIN orders AS o ON o.session_id = c.session_id
WHERE c.variant IS NOT NULL
GROUP BY c.variant ORDER BY c.variant;
```
