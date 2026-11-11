---
id: da-day-146
title: Case study: campaign return on ad spend
order: 146
difficulty: advanced
topic: Case studies
summary: Attribute orders to the latest click within a window, then compute ROAS and cost per acquisition.
module: data-analyst
duration: 18
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Attribute events with a time window
  - Combine attribution with spend into ROI metrics
prerequisites:
  - Day 111
  - Day 115
---

## Task

Marketing wants the March return on each campaign (data in the starter query). An order is credited to the user's **most recent click on or before the order date, at most 7 days earlier**; otherwise it is unattributed. For every campaign, return:

- `campaign`, `spend`, `orders`, `revenue`,
- `roas`: revenue ÷ spend, rounded to 2 decimal places,
- `cpa`: spend ÷ orders, rounded to 2 decimal places, `NULL` when there are no orders.

Add a final row `'unattributed'` with its `orders` and `revenue`, and `NULL` for `spend`, `roas` and `cpa`. Sort the campaigns alphabetically, with `'unattributed'` last.

## Starter query

```sql
WITH campaign_spend(campaign, spend) AS (
  VALUES ('display', 400), ('email', 100), ('search', 500), ('social', 300)
),
clicks(user_id, campaign, clicked_on) AS (
  VALUES
    ('u1', 'social', '2025-03-01'), ('u1', 'search', '2025-03-05'),
    ('u2', 'email', '2025-03-02'),
    ('u3', 'display', '2025-02-20'), ('u3', 'search', '2025-03-03'),
    ('u4', 'social', '2025-03-04'),
    ('u5', 'display', '2025-03-06')
),
web_orders(order_id, user_id, ordered_on, revenue) AS (
  VALUES
    ('o1', 'u1', '2025-03-06', 120), ('o2', 'u2', '2025-03-08', 80), ('o3', 'u3', '2025-03-03', 200),
    ('o4', 'u4', '2025-03-15', 60), ('o5', 'u1', '2025-03-20', 90), ('o6', 'u6', '2025-03-07', 50)
)
SELECT o.order_id, o.user_id, o.ordered_on, c.campaign, c.clicked_on
FROM web_orders AS o
LEFT JOIN clicks AS c ON c.user_id = o.user_id
ORDER BY o.order_id, c.clicked_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. For each order, find its credited click: clicks by the same user with `clicked_on <= ordered_on` and at most 7 days before (`julianday(o.ordered_on) - julianday(c.clicked_on) <= 7`), keeping the latest with `ROW_NUMBER() ... ORDER BY c.clicked_on DESC`.
3. Give every order its campaign or `'unattributed'` (a `LEFT JOIN` to the credited clicks with `COALESCE`). Aggregate per campaign, `LEFT JOIN` it to `campaign_spend`, and add the unattributed row with `UNION ALL`. Put the union in a CTE and sort the outer query with `ORDER BY campaign = 'unattributed', campaign`.

## Solution

```sql
WITH campaign_spend(campaign, spend) AS (
  VALUES ('display', 400), ('email', 100), ('search', 500), ('social', 300)
),
clicks(user_id, campaign, clicked_on) AS (
  VALUES
    ('u1', 'social', '2025-03-01'), ('u1', 'search', '2025-03-05'),
    ('u2', 'email', '2025-03-02'),
    ('u3', 'display', '2025-02-20'), ('u3', 'search', '2025-03-03'),
    ('u4', 'social', '2025-03-04'),
    ('u5', 'display', '2025-03-06')
),
web_orders(order_id, user_id, ordered_on, revenue) AS (
  VALUES
    ('o1', 'u1', '2025-03-06', 120), ('o2', 'u2', '2025-03-08', 80), ('o3', 'u3', '2025-03-03', 200),
    ('o4', 'u4', '2025-03-15', 60), ('o5', 'u1', '2025-03-20', 90), ('o6', 'u6', '2025-03-07', 50)
),
candidates AS (
  SELECT o.order_id, c.campaign,
    ROW_NUMBER() OVER (PARTITION BY o.order_id ORDER BY c.clicked_on DESC) AS n
  FROM web_orders AS o
  JOIN clicks AS c ON c.user_id = o.user_id
   AND c.clicked_on <= o.ordered_on
   AND julianday(o.ordered_on) - julianday(c.clicked_on) <= 7
),
credited AS (
  SELECT o.order_id, o.revenue, COALESCE(x.campaign, 'unattributed') AS campaign
  FROM web_orders AS o
  LEFT JOIN candidates AS x ON x.order_id = o.order_id AND x.n = 1
),
per_campaign AS (
  SELECT campaign, COUNT(*) AS orders, SUM(revenue) AS revenue FROM credited GROUP BY campaign
),
report AS (
  SELECT s.campaign, s.spend,
    COALESCE(p.orders, 0) AS orders,
    COALESCE(p.revenue, 0) AS revenue,
    ROUND(1.0 * COALESCE(p.revenue, 0) / s.spend, 2) AS roas,
    ROUND(1.0 * s.spend / p.orders, 2) AS cpa
  FROM campaign_spend AS s
  LEFT JOIN per_campaign AS p ON p.campaign = s.campaign
  UNION ALL
  SELECT 'unattributed', NULL, orders, revenue, NULL, NULL
  FROM per_campaign
  WHERE campaign = 'unattributed'
)
SELECT campaign, spend, orders, revenue, roas, cpa
FROM report
ORDER BY campaign = 'unattributed', campaign;
```

## Expected result

| campaign | spend | orders | revenue | roas | cpa |
| --- | --- | --- | --- | --- | --- |
| display | 400 | 0 | 0 | 0 | NULL |
| email | 100 | 1 | 80 | 0.8 | 100 |
| search | 500 | 2 | 320 | 0.64 | 250 |
| social | 300 | 0 | 0 | 0 | NULL |
| unattributed | NULL | 3 | 200 | NULL | NULL |

## Explanation

Attribution windows make ROI comparable: a click from weeks ago is unlikely to have caused today's order. u1's March 6 order comes a day after a search click, so search gets it even though social was clicked earlier; u1's March 20 order is 15 days after their last click and is unattributed. u3 clicked display on 20 February, too long before, and search on the day of the order, so search gets that order too.

Social and display have spend but no attributed orders: ROAS 0, and CPA is undefined rather than infinite, so it is `NULL`. Showing the unattributed row keeps the report honest about how much revenue no campaign can claim (200 of 600 here).

**Common mistake:** crediting the user's first click or any click ever, which gives display credit for an order it could not have influenced.

## Wrong answers

Feedback: incorrect-output

```sql
WITH campaign_spend(campaign, spend) AS ( VALUES ('display', 400), ('email', 100), ('search', 500), ('social', 300) ), clicks(user_id, campaign, clicked_on) AS ( VALUES ('u1', 'social', '2025-03-01'), ('u1', 'search', '2025-03-05'), ('u2', 'email', '2025-03-02'), ('u3', 'display', '2025-02-20'), ('u3', 'search', '2025-03-03'), ('u4', 'social', '2025-03-04'), ('u5', 'display', '2025-03-06') ), web_orders(order_id, user_id, ordered_on, revenue) AS ( VALUES ('o1', 'u1', '2025-03-06', 120), ('o2', 'u2', '2025-03-08', 80), ('o3', 'u3', '2025-03-03', 200), ('o4', 'u4', '2025-03-15', 60), ('o5', 'u1', '2025-03-20', 90), ('o6', 'u6', '2025-03-07', 50) ), candidates AS (SELECT o.order_id, c.campaign, ROW_NUMBER() OVER (PARTITION BY o.order_id ORDER BY c.clicked_on DESC) AS n FROM web_orders AS o JOIN clicks AS c ON c.user_id = o.user_id AND c.clicked_on <= o.ordered_on), credited AS (SELECT o.order_id, o.revenue, COALESCE(x.campaign, 'unattributed') AS campaign FROM web_orders AS o LEFT JOIN candidates AS x ON x.order_id = o.order_id AND x.n = 1), per_campaign AS (SELECT campaign, COUNT(*) AS orders, SUM(revenue) AS revenue FROM credited GROUP BY campaign), report AS (SELECT s.campaign, s.spend, COALESCE(p.orders, 0) AS orders, COALESCE(p.revenue, 0) AS revenue, ROUND(1.0 * COALESCE(p.revenue, 0) / s.spend, 2) AS roas, ROUND(1.0 * s.spend / p.orders, 2) AS cpa FROM campaign_spend AS s LEFT JOIN per_campaign AS p ON p.campaign = s.campaign UNION ALL SELECT 'unattributed', NULL, orders, revenue, NULL, NULL FROM per_campaign WHERE campaign = 'unattributed') SELECT campaign, spend, orders, revenue, roas, cpa FROM report ORDER BY campaign = 'unattributed', campaign;
```
