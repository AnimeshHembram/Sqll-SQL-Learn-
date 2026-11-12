---
id: mfa-07-first-and-last-touch
title: First touch against last touch
order: 7
difficulty: advanced
topic: Attribution
summary: Credit every order to the channel of the buyer's first visit and to the channel of the buying session, and compare the two.
module: channels
duration: 30
dataset: vidya-loop
tables:
  - sessions
  - campaigns
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Compare first-touch and last-touch attribution
  - Order a customer journey with ROW_NUMBER
prerequisites:
  - ROW_NUMBER
  - Common table expressions
  - LEFT JOIN with COALESCE
---

## Task

Buyers often find Vidya Loop through one channel and buy through another. For each channel (the campaign's `channel`, or `'organic'` for sessions without a campaign), return:

- `last_touch_orders`: orders placed in a session from that channel,
- `first_touch_orders`: orders by visitors whose **first** session came from that channel,
- `difference`: first-touch minus last-touch orders.

Include every channel that appears in `sessions`, and sort by `first_touch_orders`, highest first, then by `channel`.

## Starter query

```sql
SELECT s.visitor_id, s.session_id, s.session_date, COALESCE(c.channel, 'organic') AS channel
FROM sessions AS s
LEFT JOIN campaigns AS c ON c.campaign_id = s.campaign_id
ORDER BY s.visitor_id, s.session_date
LIMIT 20;
```

## Hints

1. Number each visitor's sessions in order: `ROW_NUMBER() OVER (PARTITION BY s.visitor_id ORDER BY s.session_date, s.session_id) AS touch_number`. Touch 1 is the first visit.
2. Last touch: join `orders` to that CTE on `session_id`. First touch: join `orders` on `visitor_id` with `touch_number = 1`. Count each per channel in its own CTE.
3. Start from the list of channels (`SELECT DISTINCT channel FROM touches`) and `LEFT JOIN` both counts, with `COALESCE(..., 0)` for channels that get no credit.

## Solution

```sql
WITH touches AS (
  SELECT s.visitor_id, s.session_id, COALESCE(c.channel, 'organic') AS channel,
         ROW_NUMBER() OVER (PARTITION BY s.visitor_id ORDER BY s.session_date, s.session_id) AS touch_number
  FROM sessions AS s
  LEFT JOIN campaigns AS c ON c.campaign_id = s.campaign_id
),
last_touch AS (
  SELECT t.channel, COUNT(*) AS orders
  FROM orders AS o
  JOIN touches AS t ON t.session_id = o.session_id
  GROUP BY t.channel
),
first_touch AS (
  SELECT t.channel, COUNT(*) AS orders
  FROM orders AS o
  JOIN touches AS t ON t.visitor_id = o.visitor_id AND t.touch_number = 1
  GROUP BY t.channel
),
channels AS (
  SELECT DISTINCT channel FROM touches
)
SELECT ch.channel,
       COALESCE(l.orders, 0) AS last_touch_orders,
       COALESCE(f.orders, 0) AS first_touch_orders,
       COALESCE(f.orders, 0) - COALESCE(l.orders, 0) AS difference
FROM channels AS ch
LEFT JOIN last_touch AS l ON l.channel = ch.channel
LEFT JOIN first_touch AS f ON f.channel = ch.channel
ORDER BY first_touch_orders DESC, ch.channel;
```

## Expected result

| channel | last_touch_orders | first_touch_orders | difference |
| --- | --- | --- | --- |
| search | 34 | 60 | 26 |
| organic | 51 | 32 | -19 |
| social | 5 | 24 | 19 |
| affiliate | 8 | 14 | 6 |
| youtube | 7 | 11 | 4 |
| email | 36 | 0 | -36 |

## Explanation

`ROW_NUMBER` orders each visitor's journey, so the same orders can be credited two ways with one join each. Neither model is "true": last touch rewards the channel that closes the sale, first touch the one that starts the journey.

**What it tells the business:** the two views tell opposite stories. **Email closes 36 orders but starts none**: it only reaches people who already signed up. **Social starts 24 journeys that end in a purchase but closes only 5**, and search starts 60 against 34 closed. On last touch alone, the team would cut Instagram and pour money into email, yet without the channels that bring new visitors, email would have nobody to write to.

**Common mistake:** finding the first touch with `MIN(session_id)` per visitor while grouping on the channel. Grouping by visitor and channel gives each channel its own "first" session, so a visitor is counted once for every channel they ever used.

## Wrong answers

Feedback: incorrect-output

```sql
WITH touches AS (
  SELECT s.visitor_id, s.session_id, COALESCE(c.channel, 'organic') AS channel FROM sessions AS s LEFT JOIN campaigns AS c ON c.campaign_id = s.campaign_id
),
last_touch AS (SELECT t.channel, COUNT(*) AS orders FROM orders AS o JOIN touches AS t ON t.session_id = o.session_id GROUP BY t.channel),
first_touch AS (
  SELECT t.channel, COUNT(DISTINCT o.order_id) AS orders
  FROM orders AS o JOIN (SELECT visitor_id, channel, MIN(session_id) AS first_session FROM touches GROUP BY visitor_id, channel) AS t ON t.visitor_id = o.visitor_id
  GROUP BY t.channel
),
channels AS (SELECT DISTINCT channel FROM touches)
SELECT ch.channel, COALESCE(l.orders, 0) AS last_touch_orders, COALESCE(f.orders, 0) AS first_touch_orders,
       COALESCE(f.orders, 0) - COALESCE(l.orders, 0) AS difference
FROM channels AS ch LEFT JOIN last_touch AS l ON l.channel = ch.channel LEFT JOIN first_touch AS f ON f.channel = ch.channel
ORDER BY first_touch_orders DESC, ch.channel;
```

Feedback: missing-rows

```sql
WITH touches AS (
  SELECT s.visitor_id, s.session_id, COALESCE(c.channel, 'organic') AS channel,
         ROW_NUMBER() OVER (PARTITION BY s.visitor_id ORDER BY s.session_date, s.session_id) AS touch_number
  FROM sessions AS s LEFT JOIN campaigns AS c ON c.campaign_id = s.campaign_id
),
last_touch AS (SELECT t.channel, COUNT(*) AS orders FROM orders AS o JOIN touches AS t ON t.session_id = o.session_id GROUP BY t.channel),
first_touch AS (SELECT t.channel, COUNT(*) AS orders FROM orders AS o JOIN touches AS t ON t.visitor_id = o.visitor_id AND t.touch_number = 1 GROUP BY t.channel)
SELECT l.channel, l.orders AS last_touch_orders, COALESCE(f.orders, 0) AS first_touch_orders, COALESCE(f.orders, 0) - l.orders AS difference
FROM last_touch AS l LEFT JOIN first_touch AS f ON f.channel = l.channel
WHERE f.orders IS NOT NULL
ORDER BY first_touch_orders DESC, l.channel;
```
