---
id: da-day-238
title: Case study: email campaign performance
order: 238
difficulty: advanced
topic: Case studies
summary: Count unique opens and clicks per campaign, compute the standard email rates and keep silent campaigns.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Count unique actions per recipient
  - Report email funnel rates
prerequisites:
  - Day 156
  - Day 233
---

## Task

The email tool logs every open, click and unsubscribe (starter query), so a recipient who opens twice appears twice. A click also proves the email was opened, even when no open was logged (images were blocked). For each campaign, report:

- `sent` and `opened` (recipients who opened **or** clicked),
- `open_rate_pct` (opened ÷ sent), `click_rate_pct` (recipients who clicked ÷ sent), `click_to_open_pct` (recipients who clicked ÷ opened, `NULL` when nobody opened) and `unsubscribe_pct` (unsubscribed ÷ sent).

Round rates to 1 decimal place. Return `campaign`, `sent`, `opened`, `open_rate_pct`, `click_rate_pct`, `click_to_open_pct` and `unsubscribe_pct`, sorted by `click_rate_pct` from highest, then `campaign`.

## Starter query

```sql
WITH sends(campaign, recipient) AS (
  VALUES
    ('Spring sale', 'a'), ('Spring sale', 'b'), ('Spring sale', 'c'), ('Spring sale', 'd'), ('Spring sale', 'e'),
    ('Spring sale', 'f'), ('Spring sale', 'g'), ('Spring sale', 'h'),
    ('New arrivals', 'a'), ('New arrivals', 'b'), ('New arrivals', 'c'), ('New arrivals', 'd'),
    ('Survey', 'a'), ('Survey', 'b'), ('Survey', 'c')
),
events(campaign, recipient, event) AS (
  VALUES
    ('Spring sale', 'a', 'open'), ('Spring sale', 'a', 'open'), ('Spring sale', 'a', 'click'), ('Spring sale', 'a', 'click'),
    ('Spring sale', 'b', 'open'), ('Spring sale', 'c', 'open'), ('Spring sale', 'c', 'click'), ('Spring sale', 'd', 'open'),
    ('Spring sale', 'e', 'unsubscribe'), ('Spring sale', 'f', 'open'),
    ('New arrivals', 'a', 'open'), ('New arrivals', 'b', 'open'), ('New arrivals', 'b', 'click'), ('New arrivals', 'b', 'open'),
    ('New arrivals', 'c', 'click')
)
SELECT s.campaign, s.recipient, e.event
FROM sends AS s
LEFT JOIN events AS e ON e.campaign = s.campaign AND e.recipient = s.recipient
ORDER BY s.campaign, s.recipient;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Summarise each **recipient of each campaign** first, from `sends` with a `LEFT JOIN` to `events`: `MAX(e.event IN ('open', 'click'))` (opened), `MAX(e.event = 'click')` (clicked) and `MAX(e.event = 'unsubscribe')`. `COALESCE` them to 0 for recipients with no events.
3. Then group by campaign: `COUNT(*)` is sent, the sums are unique counts, and `NULLIF(SUM(opened), 0)` protects the click-to-open rate.

## Solution

```sql
WITH sends(campaign, recipient) AS (
  VALUES
    ('Spring sale', 'a'), ('Spring sale', 'b'), ('Spring sale', 'c'), ('Spring sale', 'd'), ('Spring sale', 'e'),
    ('Spring sale', 'f'), ('Spring sale', 'g'), ('Spring sale', 'h'),
    ('New arrivals', 'a'), ('New arrivals', 'b'), ('New arrivals', 'c'), ('New arrivals', 'd'),
    ('Survey', 'a'), ('Survey', 'b'), ('Survey', 'c')
),
events(campaign, recipient, event) AS (
  VALUES
    ('Spring sale', 'a', 'open'), ('Spring sale', 'a', 'open'), ('Spring sale', 'a', 'click'), ('Spring sale', 'a', 'click'),
    ('Spring sale', 'b', 'open'), ('Spring sale', 'c', 'open'), ('Spring sale', 'c', 'click'), ('Spring sale', 'd', 'open'),
    ('Spring sale', 'e', 'unsubscribe'), ('Spring sale', 'f', 'open'),
    ('New arrivals', 'a', 'open'), ('New arrivals', 'b', 'open'), ('New arrivals', 'b', 'click'), ('New arrivals', 'b', 'open'),
    ('New arrivals', 'c', 'click')
),
per_recipient AS (
  SELECT s.campaign, s.recipient,
    COALESCE(MAX(e.event IN ('open', 'click')), 0) AS opened,
    COALESCE(MAX(e.event = 'click'), 0) AS clicked,
    COALESCE(MAX(e.event = 'unsubscribe'), 0) AS unsubscribed
  FROM sends AS s
  LEFT JOIN events AS e ON e.campaign = s.campaign AND e.recipient = s.recipient
  GROUP BY s.campaign, s.recipient
)
SELECT campaign, COUNT(*) AS sent, SUM(opened) AS opened,
  ROUND(100.0 * SUM(opened) / COUNT(*), 1) AS open_rate_pct,
  ROUND(100.0 * SUM(clicked) / COUNT(*), 1) AS click_rate_pct,
  ROUND(100.0 * SUM(clicked) / NULLIF(SUM(opened), 0), 1) AS click_to_open_pct,
  ROUND(100.0 * SUM(unsubscribed) / COUNT(*), 1) AS unsubscribe_pct
FROM per_recipient
GROUP BY campaign
ORDER BY click_rate_pct DESC, campaign;
```

## Expected result

| campaign | sent | opened | open_rate_pct | click_rate_pct | click_to_open_pct | unsubscribe_pct |
| --- | --- | --- | --- | --- | --- | --- |
| New arrivals | 4 | 3 | 75 | 50 | 66.7 | 0 |
| Spring sale | 8 | 5 | 62.5 | 25 | 40 | 12.5 |
| Survey | 3 | 0 | 0 | 0 | NULL | 0 |

## Explanation

Email logs record events, but email metrics count people. Recipient `a` opened Spring sale twice and clicked twice; counting events would make one person look like four actions. Summarising each campaign and recipient first, with `MAX` of each condition, turns events into yes/no facts per person.

A click proves an open even when no open was logged, as with recipient `c` of New arrivals, so `opened` counts recipients who opened or clicked: 3 of 4. Click-to-open (clickers ÷ openers) shows whether the content worked for those who saw it: 66.7% for New arrivals against 40% for Spring sale. The Survey campaign had no events at all; `sends` with `LEFT JOIN` keeps it in the report with zeros, and its click-to-open is `NULL` because nobody opened it.

**Common mistake:** summing events. Repeat opens and clicks are counted again, and clicks without a logged open are missing from the opens, so rates can even exceed 100%.

## Wrong answers

Feedback: incorrect-output

```sql
WITH sends(campaign, recipient) AS ( VALUES ('Spring sale', 'a'), ('Spring sale', 'b'), ('Spring sale', 'c'), ('Spring sale', 'd'), ('Spring sale', 'e'), ('Spring sale', 'f'), ('Spring sale', 'g'), ('Spring sale', 'h'), ('New arrivals', 'a'), ('New arrivals', 'b'), ('New arrivals', 'c'), ('New arrivals', 'd'), ('Survey', 'a'), ('Survey', 'b'), ('Survey', 'c') ), events(campaign, recipient, event) AS ( VALUES ('Spring sale', 'a', 'open'), ('Spring sale', 'a', 'open'), ('Spring sale', 'a', 'click'), ('Spring sale', 'a', 'click'), ('Spring sale', 'b', 'open'), ('Spring sale', 'c', 'open'), ('Spring sale', 'c', 'click'), ('Spring sale', 'd', 'open'), ('Spring sale', 'e', 'unsubscribe'), ('Spring sale', 'f', 'open'), ('New arrivals', 'a', 'open'), ('New arrivals', 'b', 'open'), ('New arrivals', 'b', 'click'), ('New arrivals', 'b', 'open'), ('New arrivals', 'c', 'click') ) SELECT s.campaign, COUNT(DISTINCT s.recipient) AS sent, SUM(e.event = 'open') AS opened, ROUND(100.0 * SUM(e.event = 'open') / COUNT(DISTINCT s.recipient), 1) AS open_rate_pct, ROUND(100.0 * SUM(e.event = 'click') / COUNT(DISTINCT s.recipient), 1) AS click_rate_pct, ROUND(100.0 * SUM(e.event = 'click') / NULLIF(SUM(e.event = 'open'), 0), 1) AS click_to_open_pct, ROUND(100.0 * SUM(e.event = 'unsubscribe') / COUNT(DISTINCT s.recipient), 1) AS unsubscribe_pct FROM sends AS s LEFT JOIN events AS e ON e.campaign = s.campaign AND e.recipient = s.recipient GROUP BY s.campaign ORDER BY click_rate_pct DESC, s.campaign;
```
