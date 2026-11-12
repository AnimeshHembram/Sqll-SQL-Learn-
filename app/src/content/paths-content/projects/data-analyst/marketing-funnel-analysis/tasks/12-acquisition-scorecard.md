---
id: mfa-12-acquisition-scorecard
title: The acquisition channel scorecard
order: 12
difficulty: advanced
topic: Executive reporting
summary: Score every channel that brings new visitors on funnel performance and on the revenue its visitors eventually bring, and recommend what to do with each.
module: final-challenge
duration: 45
dataset: vidya-loop
tables:
  - sessions
  - events
  - campaigns
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Build a multi-grain scorecard with CTEs
  - Judge channels on first-touch value with a CASE verdict
prerequisites:
  - Every earlier task in this project
---

## Task

Next quarter's budget is decided on this table. Score each **acquisition channel**: the channel of a visitor's **first** session (`'organic'` when it had no campaign). Return one row per channel with:

- `visitors`: visitors whose first session came from the channel,
- `signup_pct`: the share of them who reached signup or any later step, one decimal,
- `purchase_pct`: orders by them divided by visitors, one decimal,
- `first_touch_orders` and `last_touch_orders` (as in Task 7),
- `first_touch_revenue`: the revenue of the orders by these visitors,
- `spend`: the channel's total campaign spend (0 for organic),
- `revenue_to_spend`: first-touch revenue divided by spend, two decimals (NULL for organic),
- `verdict`: `'Owned channel'` when there is no spend; otherwise `'Invest more'` if first-touch revenue is at least 4 times spend, `'Keep and optimise'` if at least 2.5 times, else `'Cut back'`.

Sort by `first_touch_revenue`, highest first.

## Starter query

```sql
-- One possible plan, each CTE with one row per visitor or per channel:
--   touches      every session with its channel and touch_number (Task 7)
--   visitors     one row per visitor: first-touch channel and whether they reached signup
--   first_touch  per channel: visitors, signup rate, orders and revenue of those visitors
--   last_touch   per channel: orders placed in the channel's sessions
--   spend        per channel: total campaign spend
SELECT channel, SUM(spend) AS spend
FROM campaigns
GROUP BY channel;
```

## Hints

1. Build and test one CTE at a time; the plan in the starter query is one good order. Email never appears, because no visitor's first session came from an email.
2. For "reached signup or later", use `EXISTS` over the visitor's sessions and events with `e.step IN ('signup', 'start_trial', 'checkout', 'purchase')`, as a 0/1 column you can average.
3. Join the per-channel CTEs to `first_touch` with `LEFT JOIN` (organic has no spend), and use `NULLIF` or a `CASE` so organic gets NULL instead of a division error.

## Solution

```sql
WITH touches AS (
  SELECT s.visitor_id, s.session_id, COALESCE(c.channel, 'organic') AS channel,
         ROW_NUMBER() OVER (PARTITION BY s.visitor_id ORDER BY s.session_date, s.session_id) AS touch_number
  FROM sessions AS s
  LEFT JOIN campaigns AS c ON c.campaign_id = s.campaign_id
),
visitors AS (
  SELECT t.visitor_id, t.channel,
         EXISTS (
           SELECT 1 FROM sessions AS s JOIN events AS e ON e.session_id = s.session_id
           WHERE s.visitor_id = t.visitor_id AND e.step IN ('signup', 'start_trial', 'checkout', 'purchase')
         ) AS signed_up
  FROM touches AS t
  WHERE t.touch_number = 1
),
first_touch AS (
  SELECT v.channel,
         COUNT(*) AS visitors,
         ROUND(100.0 * AVG(v.signed_up), 1) AS signup_pct,
         COUNT(o.order_id) AS orders,
         COALESCE(SUM(o.price - o.discount), 0) AS revenue
  FROM visitors AS v
  LEFT JOIN orders AS o ON o.visitor_id = v.visitor_id
  GROUP BY v.channel
),
last_touch AS (
  SELECT t.channel, COUNT(*) AS orders
  FROM orders AS o
  JOIN touches AS t ON t.session_id = o.session_id
  GROUP BY t.channel
),
spend AS (
  SELECT channel, SUM(spend) AS spend
  FROM campaigns
  GROUP BY channel
)
SELECT f.channel,
       f.visitors,
       f.signup_pct,
       ROUND(100.0 * f.orders / f.visitors, 1) AS purchase_pct,
       f.orders AS first_touch_orders,
       COALESCE(l.orders, 0) AS last_touch_orders,
       f.revenue AS first_touch_revenue,
       COALESCE(sp.spend, 0) AS spend,
       ROUND(1.0 * f.revenue / sp.spend, 2) AS revenue_to_spend,
       CASE
         WHEN sp.spend IS NULL THEN 'Owned channel'
         WHEN f.revenue >= 4 * sp.spend THEN 'Invest more'
         WHEN f.revenue >= 2.5 * sp.spend THEN 'Keep and optimise'
         ELSE 'Cut back'
       END AS verdict
FROM first_touch AS f
LEFT JOIN last_touch AS l ON l.channel = f.channel
LEFT JOIN spend AS sp ON sp.channel = f.channel
ORDER BY first_touch_revenue DESC;
```

## Expected result

| channel | visitors | signup_pct | purchase_pct | first_touch_orders | last_touch_orders | first_touch_revenue | spend | revenue_to_spend | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| search | 224 | 61.2 | 26.8 | 60 | 34 | 260215 | 75200 | 3.46 | Keep and optimise |
| organic | 240 | 33.3 | 13.3 | 32 | 51 | 132868 | 0 | NULL | Owned channel |
| affiliate | 109 | 38.5 | 12.8 | 14 | 8 | 72436 | 14900 | 4.86 | Invest more |
| social | 245 | 24.5 | 9.8 | 24 | 5 | 72376 | 27500 | 2.63 | Keep and optimise |
| youtube | 82 | 48.8 | 13.4 | 11 | 7 | 44214 | 21800 | 2.03 | Cut back |

## Explanation

The scorecard joins measures built at three grains (session, visitor and campaign) only after each has been reduced to one row per channel. Each visitor bought at most one course, so joining visitors to orders keeps one row per visitor and the signup average stays correct.

**What it tells the business:**

- **Affiliates** bring fewer visitors but return **4.86 times their spend** on a first-touch basis. **Invest more.**
- **Search** is the biggest paid source: 224 visitors, 61.2% sign up and they bring ₹2.6 lakh, 3.46 times spend. **Keep and optimise.**
- **Social** looks like a failure on last touch (5 orders) but starts 24 purchases, **2.63 times its spend**: keep it, and judge it on first touch. **Keep and optimise.**
- **YouTube** returns only **2.03 times spend**, the weakest paid channel. **Cut back**, or renegotiate the creator deal.
- **Organic** visitors bring ₹1.33 lakh for free: worth protecting with search-engine content.

**Common mistake:** judging spend against **last-touch** revenue. Social's ratio would fall to 0.72 and it would be cut, although the visitors it brings go on to buy through email and organic visits. An acquisition budget should be judged on the customers each channel acquires.

## Wrong answers

Feedback: incorrect-output

```sql
WITH touches AS (
  SELECT s.visitor_id, s.session_id, COALESCE(c.channel, 'organic') AS channel,
         ROW_NUMBER() OVER (PARTITION BY s.visitor_id ORDER BY s.session_date, s.session_id) AS touch_number
  FROM sessions AS s LEFT JOIN campaigns AS c ON c.campaign_id = s.campaign_id
),
visitors AS (
  SELECT t.visitor_id, t.channel,
         EXISTS (SELECT 1 FROM sessions AS s JOIN events AS e ON e.session_id = s.session_id
                 WHERE s.visitor_id = t.visitor_id AND e.step IN ('signup', 'start_trial', 'checkout', 'purchase')) AS signed_up
  FROM touches AS t WHERE t.touch_number = 1
),
first_touch AS (
  SELECT v.channel, COUNT(DISTINCT v.visitor_id) AS visitors,
         ROUND(100.0 * (SELECT AVG(v2.signed_up) FROM visitors AS v2 WHERE v2.channel = v.channel), 1) AS signup_pct,
         COUNT(o.order_id) AS orders, COALESCE(SUM(o.price - o.discount), 0) AS revenue
  FROM visitors AS v LEFT JOIN orders AS o ON o.visitor_id = v.visitor_id GROUP BY v.channel
),
last_touch AS (SELECT t.channel, COUNT(*) AS orders, SUM(o.price - o.discount) AS revenue FROM orders AS o JOIN touches AS t ON t.session_id = o.session_id GROUP BY t.channel),
spend AS (SELECT channel, SUM(spend) AS spend FROM campaigns GROUP BY channel)
SELECT f.channel, f.visitors, f.signup_pct, ROUND(100.0 * f.orders / f.visitors, 1) AS purchase_pct, f.orders AS first_touch_orders,
       COALESCE(l.orders, 0) AS last_touch_orders, f.revenue AS first_touch_revenue, COALESCE(sp.spend, 0) AS spend,
       ROUND(1.0 * l.revenue / sp.spend, 2) AS revenue_to_spend,
       CASE WHEN sp.spend IS NULL THEN 'Owned channel' WHEN l.revenue >= 4 * sp.spend THEN 'Invest more' WHEN l.revenue >= 2.5 * sp.spend THEN 'Keep and optimise' ELSE 'Cut back' END AS verdict
FROM first_touch AS f LEFT JOIN last_touch AS l ON l.channel = f.channel LEFT JOIN spend AS sp ON sp.channel = f.channel
ORDER BY first_touch_revenue DESC;
```

Feedback: incorrect-output

```sql
WITH touches AS (
  SELECT s.visitor_id, s.session_id, COALESCE(c.channel, 'organic') AS channel
  FROM sessions AS s LEFT JOIN campaigns AS c ON c.campaign_id = s.campaign_id
),
visitors AS (
  SELECT DISTINCT t.visitor_id, t.channel,
         EXISTS (SELECT 1 FROM sessions AS s JOIN events AS e ON e.session_id = s.session_id
                 WHERE s.visitor_id = t.visitor_id AND e.step IN ('signup', 'start_trial', 'checkout', 'purchase')) AS signed_up
  FROM touches AS t
),
first_touch AS (
  SELECT v.channel, COUNT(*) AS visitors, ROUND(100.0 * AVG(v.signed_up), 1) AS signup_pct,
         COUNT(o.order_id) AS orders, COALESCE(SUM(o.price - o.discount), 0) AS revenue
  FROM visitors AS v LEFT JOIN orders AS o ON o.visitor_id = v.visitor_id GROUP BY v.channel
),
last_touch AS (SELECT t.channel, COUNT(*) AS orders FROM orders AS o JOIN touches AS t ON t.session_id = o.session_id GROUP BY t.channel),
spend AS (SELECT channel, SUM(spend) AS spend FROM campaigns GROUP BY channel)
SELECT f.channel, f.visitors, f.signup_pct, ROUND(100.0 * f.orders / f.visitors, 1) AS purchase_pct, f.orders AS first_touch_orders,
       COALESCE(l.orders, 0) AS last_touch_orders, f.revenue AS first_touch_revenue, COALESCE(sp.spend, 0) AS spend,
       ROUND(1.0 * f.revenue / sp.spend, 2) AS revenue_to_spend,
       CASE WHEN sp.spend IS NULL THEN 'Owned channel' WHEN f.revenue >= 4 * sp.spend THEN 'Invest more' WHEN f.revenue >= 2.5 * sp.spend THEN 'Keep and optimise' ELSE 'Cut back' END AS verdict
FROM first_touch AS f LEFT JOIN last_touch AS l ON l.channel = f.channel LEFT JOIN spend AS sp ON sp.channel = f.channel
ORDER BY first_touch_revenue DESC;
```
