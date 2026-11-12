---
id: mfa-06-campaign-performance
title: Campaign performance
order: 6
difficulty: intermediate
topic: Marketing KPIs
summary: Report sessions, orders, revenue, cost per order and return on ad spend for every campaign.
module: channels
duration: 25
dataset: vidya-loop
tables:
  - campaigns
  - sessions
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Calculate cost per order and return on ad spend
  - Guard divisions with NULLIF
prerequisites:
  - LEFT JOIN chains
  - NULLIF
  - COALESCE
---

## Task

The marketing team reports campaigns the usual way: an order belongs to the campaign of the **session in which it was placed** (last-touch attribution). For every campaign, return:

- `campaign` (its name) and `channel`,
- `sessions` and `orders`,
- `revenue`: the sum of `price - discount` of its orders (0 if none),
- `spend`,
- `cost_per_order`: spend divided by orders, rounded to a whole rupee (NULL if the campaign has no orders),
- `roas`: return on ad spend, revenue divided by spend, rounded to two decimals.

Sort by `roas`, highest first.

## Starter query

```sql
SELECT campaign_id, name, channel, spend
FROM campaigns
ORDER BY campaign_id;
```

## Hints

1. Start from `campaigns` and `LEFT JOIN` sessions and then orders, so a campaign with no orders still appears.
2. Group by the campaign. `COUNT(s.session_id)` and `COUNT(o.order_id)` count only matched rows; `COALESCE(SUM(o.price - o.discount), 0)` is the revenue.
3. `NULLIF(COUNT(o.order_id), 0)` in the denominator avoids dividing by zero and gives NULL instead.

## Solution

```sql
SELECT c.name AS campaign,
       c.channel,
       COUNT(s.session_id) AS sessions,
       COUNT(o.order_id) AS orders,
       COALESCE(SUM(o.price - o.discount), 0) AS revenue,
       c.spend,
       ROUND(1.0 * c.spend / NULLIF(COUNT(o.order_id), 0), 0) AS cost_per_order,
       ROUND(1.0 * COALESCE(SUM(o.price - o.discount), 0) / c.spend, 2) AS roas
FROM campaigns AS c
LEFT JOIN sessions AS s ON s.campaign_id = c.campaign_id
LEFT JOIN orders AS o ON o.session_id = s.session_id
GROUP BY c.campaign_id, c.name, c.channel, c.spend
ORDER BY roas DESC;
```

## Expected result

| campaign | channel | sessions | orders | revenue | spend | cost_per_order | roas |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Email: trial reminders | email | 53 | 21 | 78929 | 800 | 38 | 98.66 |
| Email: newsletter | email | 45 | 15 | 41935 | 700 | 47 | 59.91 |
| Affiliate: deal sites | affiliate | 61 | 4 | 21596 | 4600 | 1150 | 4.69 |
| Search: SQL course | search | 114 | 16 | 73259 | 33200 | 2075 | 2.21 |
| Search: data analyst career | search | 132 | 18 | 85132 | 42000 | 2333 | 2.03 |
| Affiliate: college partners | affiliate | 68 | 4 | 15096 | 10300 | 2575 | 1.47 |
| YouTube creator: data careers | youtube | 92 | 7 | 26543 | 21800 | 3114 | 1.22 |
| Instagram stories: free trial | social | 142 | 3 | 14997 | 13400 | 4467 | 1.12 |
| Instagram reels: dashboards | social | 133 | 2 | 4673 | 14100 | 7050 | 0.33 |

## Explanation

Each order has exactly one session, so joining campaigns → sessions → orders does not double count. `NULLIF` is the standard guard against division by zero.

**What it tells the business:** on this view, the two **email** campaigns look extraordinary (ROAS 98.66 and 59.91) because they cost almost nothing, and **Instagram reels look like a waste: ₹14,100 spent for 2 orders (ROAS 0.33)**. Search earns about twice its cost, YouTube 1.22 times. Before cutting Instagram, ask who those email buyers were and how they first found Vidya Loop: Task 7 answers that.

**Common mistake:** an inner join from campaigns to orders. Campaigns without orders disappear from the report, which hides exactly the spend that produced nothing.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT c.name AS campaign, c.channel, COUNT(s.session_id) AS sessions, COUNT(o.order_id) AS orders,
       SUM(o.price - o.discount) AS revenue, c.spend,
       ROUND(1.0 * c.spend / COUNT(o.order_id), 0) AS cost_per_order,
       ROUND(1.0 * SUM(o.price - o.discount) / c.spend, 2) AS roas
FROM campaigns AS c JOIN sessions AS s ON s.campaign_id = c.campaign_id JOIN orders AS o ON o.session_id = s.session_id
GROUP BY c.campaign_id, c.name, c.channel, c.spend ORDER BY roas DESC;
```

Feedback: incorrect-output

```sql
SELECT c.name AS campaign, c.channel, COUNT(s.session_id) AS sessions, COUNT(o.order_id) AS orders,
       COALESCE(SUM(o.price), 0) AS revenue, c.spend,
       ROUND(1.0 * c.spend / NULLIF(COUNT(o.order_id), 0), 0) AS cost_per_order,
       ROUND(1.0 * COALESCE(SUM(o.price), 0) / c.spend, 2) AS roas
FROM campaigns AS c LEFT JOIN sessions AS s ON s.campaign_id = c.campaign_id LEFT JOIN orders AS o ON o.session_id = s.session_id
GROUP BY c.campaign_id, c.name, c.channel, c.spend ORDER BY roas DESC;
```
