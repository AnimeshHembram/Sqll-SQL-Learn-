---
id: da-day-239
title: Case study: linear multi-touch attribution
order: 239
difficulty: advanced
topic: Case studies
summary: Share each conversion's revenue equally across the touches before it, and compare with last-touch credit.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Split credit across touches
  - Compare attribution models
prerequisites:
  - Day 111
  - Day 148
---

## Task

Marketing wants to move beyond last-touch credit. The starter query has each customer's marketing touches and conversions. For each conversion, only touches **on or before** the conversion date count. Credit revenue two ways:

- **linear**: the revenue is split equally across those touches,
- **last touch**: all of it goes to the latest of those touches.

For each channel with at least one counted touch, return `channel`, `touches` (counted touches), `linear_revenue` and `last_touch_revenue` (both rounded to 2 decimal places; 0 when none). Sort by `linear_revenue` from highest, then `channel`.

## Starter query

```sql
WITH touches(customer, touched_at, channel) AS (
  VALUES
    ('c1', '2025-03-01', 'search'), ('c1', '2025-03-03', 'email'), ('c1', '2025-03-05', 'social'),
    ('c2', '2025-03-02', 'social'), ('c2', '2025-03-04', 'social'), ('c2', '2025-03-06', 'search'), ('c2', '2025-03-08', 'email'),
    ('c3', '2025-03-03', 'email'),
    ('c4', '2025-03-01', 'search'), ('c4', '2025-03-09', 'social'),
    ('c5', '2025-03-04', 'affiliate')
),
conversions(customer, converted_at, revenue) AS (
  VALUES ('c1', '2025-03-05', 300), ('c2', '2025-03-07', 600), ('c3', '2025-03-04', 100), ('c4', '2025-03-05', 200)
)
SELECT t.customer, t.touched_at, t.channel, c.converted_at, c.revenue
FROM touches AS t
LEFT JOIN conversions AS c ON c.customer = t.customer
ORDER BY t.customer, t.touched_at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Join touches to conversions on the customer with `t.touched_at <= c.converted_at`, so later touches and customers who never converted drop out.
3. Per row: linear credit is `c.revenue / COUNT(*) OVER (PARTITION BY t.customer)`. Last touch: number the touches with `ROW_NUMBER() OVER (PARTITION BY t.customer ORDER BY t.touched_at DESC)` and credit revenue only where it is 1. Then group by channel.

## Solution

```sql
WITH touches(customer, touched_at, channel) AS (
  VALUES
    ('c1', '2025-03-01', 'search'), ('c1', '2025-03-03', 'email'), ('c1', '2025-03-05', 'social'),
    ('c2', '2025-03-02', 'social'), ('c2', '2025-03-04', 'social'), ('c2', '2025-03-06', 'search'), ('c2', '2025-03-08', 'email'),
    ('c3', '2025-03-03', 'email'),
    ('c4', '2025-03-01', 'search'), ('c4', '2025-03-09', 'social'),
    ('c5', '2025-03-04', 'affiliate')
),
conversions(customer, converted_at, revenue) AS (
  VALUES ('c1', '2025-03-05', 300), ('c2', '2025-03-07', 600), ('c3', '2025-03-04', 100), ('c4', '2025-03-05', 200)
),
counted AS (
  SELECT t.customer, t.channel, c.revenue,
    COUNT(*) OVER (PARTITION BY t.customer) AS n_touches,
    ROW_NUMBER() OVER (PARTITION BY t.customer ORDER BY t.touched_at DESC) AS from_last
  FROM touches AS t
  JOIN conversions AS c ON c.customer = t.customer AND t.touched_at <= c.converted_at
)
SELECT channel, COUNT(*) AS touches,
  ROUND(SUM(1.0 * revenue / n_touches), 2) AS linear_revenue,
  ROUND(SUM(CASE WHEN from_last = 1 THEN revenue ELSE 0 END), 2) AS last_touch_revenue
FROM counted
GROUP BY channel
ORDER BY linear_revenue DESC, channel;
```

## Expected result

| channel | touches | linear_revenue | last_touch_revenue |
| --- | --- | --- | --- |
| search | 3 | 500 | 800 |
| social | 3 | 500 | 300 |
| email | 2 | 200 | 100 |

## Explanation

Last-touch attribution gives all the credit to the final step before a purchase. Linear attribution shares each conversion equally among the touches that led to it: c1's 300 is split 100 to search, email and social. Only touches on or before the conversion count, so c2's email two days after buying and c4's later social visit get nothing; c5 never converted, so affiliate earns no credit.

The two models tell different stories. Last touch puts search far ahead (800 against 300 for social), because search often comes just before buying. Linear credit shows social and search contributing equally (500 each), since social starts many journeys. Neither model is the truth; comparing them shows which channels open journeys and which close them.

**Common mistake:** joining touches to conversions without the date condition. Touches after the purchase get credit and dilute the others, and the "last touch" becomes a visit that happened after the sale.

## Wrong answers

Feedback: incorrect-output

```sql
WITH touches(customer, touched_at, channel) AS ( VALUES ('c1', '2025-03-01', 'search'), ('c1', '2025-03-03', 'email'), ('c1', '2025-03-05', 'social'), ('c2', '2025-03-02', 'social'), ('c2', '2025-03-04', 'social'), ('c2', '2025-03-06', 'search'), ('c2', '2025-03-08', 'email'), ('c3', '2025-03-03', 'email'), ('c4', '2025-03-01', 'search'), ('c4', '2025-03-09', 'social'), ('c5', '2025-03-04', 'affiliate') ), conversions(customer, converted_at, revenue) AS ( VALUES ('c1', '2025-03-05', 300), ('c2', '2025-03-07', 600), ('c3', '2025-03-04', 100), ('c4', '2025-03-05', 200) ), counted AS (SELECT t.customer, t.channel, c.revenue, COUNT(*) OVER (PARTITION BY t.customer) AS n_touches, ROW_NUMBER() OVER (PARTITION BY t.customer ORDER BY t.touched_at DESC) AS from_last FROM touches AS t JOIN conversions AS c ON c.customer = t.customer) SELECT channel, COUNT(*) AS touches, ROUND(SUM(1.0 * revenue / n_touches), 2) AS linear_revenue, ROUND(SUM(CASE WHEN from_last = 1 THEN revenue ELSE 0 END), 2) AS last_touch_revenue FROM counted GROUP BY channel ORDER BY linear_revenue DESC, channel;
```
