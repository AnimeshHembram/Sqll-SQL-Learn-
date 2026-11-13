---
id: da-day-274
title: How long until new accounts reach the key action?
order: 274
difficulty: advanced
topic: Product analytics
summary: Measure hours from sign-up to the first key action per plan, with a median and the share never reaching it.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Measure time to a first event
  - Compute a median among those who got there
prerequisites:
  - Day 247
  - Day 79
---

## Task

"Time to value" is the time from sign-up to an account's **first** key action (starter query). For each plan, return:

- `accounts` and `reached_pct` (share of accounts with a key action, rounded to 1 decimal place),
- `median_hours`: the median hours to the first key action among accounts that reached it (for an even count, the average of the middle two), rounded to 1 decimal place,
- `within_day_pct`: share of **all** the plan's accounts that reached it within 24 hours, rounded to 1 decimal place.

Sort by `median_hours` from shortest.

## Starter query

```sql
WITH accounts(account, plan, signed_up_at) AS (
  VALUES
    ('a1', 'free', '2025-03-01 10:00'), ('a2', 'free', '2025-03-01 12:00'), ('a3', 'free', '2025-03-02 09:00'), ('a4', 'free', '2025-03-02 18:00'),
    ('a5', 'pro', '2025-03-01 08:00'), ('a6', 'pro', '2025-03-03 11:00'), ('a7', 'pro', '2025-03-04 15:00'),
    ('a8', 'team', '2025-03-02 10:00'), ('a9', 'team', '2025-03-05 10:00')
),
key_actions(account, done_at) AS (
  VALUES
    ('a1', '2025-03-01 11:30'), ('a1', '2025-03-03 09:00'), ('a2', '2025-03-03 12:00'), ('a3', '2025-03-02 10:00'),
    ('a5', '2025-03-01 08:20'), ('a6', '2025-03-03 15:00'), ('a7', '2025-03-05 15:00'),
    ('a8', '2025-03-02 16:00'), ('a9', '2025-03-05 10:45')
)
SELECT a.account, a.plan, a.signed_up_at, k.done_at
FROM accounts AS a
LEFT JOIN key_actions AS k ON k.account = a.account
ORDER BY a.account, k.done_at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. First action per account: `MIN(done_at)`; hours: `(julianday(first_action) - julianday(signed_up_at)) * 24`. A `LEFT JOIN` keeps accounts that never got there (hours `NULL`).
3. Median per plan: number the non-null hours with `ROW_NUMBER() OVER (PARTITION BY plan ORDER BY hours)` and count them, then average the rows at `(n + 1) / 2` and `(n + 2) / 2`. Join that back to the plan totals.

## Solution

```sql
WITH accounts(account, plan, signed_up_at) AS (
  VALUES
    ('a1', 'free', '2025-03-01 10:00'), ('a2', 'free', '2025-03-01 12:00'), ('a3', 'free', '2025-03-02 09:00'), ('a4', 'free', '2025-03-02 18:00'),
    ('a5', 'pro', '2025-03-01 08:00'), ('a6', 'pro', '2025-03-03 11:00'), ('a7', 'pro', '2025-03-04 15:00'),
    ('a8', 'team', '2025-03-02 10:00'), ('a9', 'team', '2025-03-05 10:00')
),
key_actions(account, done_at) AS (
  VALUES
    ('a1', '2025-03-01 11:30'), ('a1', '2025-03-03 09:00'), ('a2', '2025-03-03 12:00'), ('a3', '2025-03-02 10:00'),
    ('a5', '2025-03-01 08:20'), ('a6', '2025-03-03 15:00'), ('a7', '2025-03-05 15:00'),
    ('a8', '2025-03-02 16:00'), ('a9', '2025-03-05 10:45')
),
firsts AS (
  SELECT a.account, a.plan, (julianday(MIN(k.done_at)) - julianday(a.signed_up_at)) * 24 AS hours
  FROM accounts AS a
  LEFT JOIN key_actions AS k ON k.account = a.account
  GROUP BY a.account, a.plan, a.signed_up_at
),
ranked AS (
  SELECT plan, hours,
    ROW_NUMBER() OVER (PARTITION BY plan ORDER BY hours) AS rn,
    COUNT(*) OVER (PARTITION BY plan) AS n
  FROM firsts
  WHERE hours IS NOT NULL
),
medians AS (
  SELECT plan, AVG(hours) AS median_hours FROM ranked WHERE rn IN ((n + 1) / 2, (n + 2) / 2) GROUP BY plan
),
totals AS (
  SELECT plan, COUNT(*) AS accounts, SUM(hours IS NOT NULL) AS reached, SUM(hours <= 24) AS within_day FROM firsts GROUP BY plan
)
SELECT t.plan, t.accounts, ROUND(100.0 * t.reached / t.accounts, 1) AS reached_pct, ROUND(m.median_hours, 1) AS median_hours,
  ROUND(100.0 * t.within_day / t.accounts, 1) AS within_day_pct
FROM totals AS t
JOIN medians AS m ON m.plan = t.plan
ORDER BY median_hours;
```

## Expected result

| plan | accounts | reached_pct | median_hours | within_day_pct |
| --- | --- | --- | --- | --- |
| free | 4 | 75 | 1.5 | 50 |
| team | 2 | 100 | 3.4 | 100 |
| pro | 3 | 100 | 4 | 100 |

## Explanation

Time to value has two parts: how many accounts reach the key action at all, and how fast. Free accounts look fastest by median (1.5 hours), but that median only covers the three that got there; one free account in four never did, and only half reached it within a day. Pro and team accounts all got there, within a few hours.

A median is used because one slow account (a2 took two days) would drag an average up to 16.8 hours for the free plan and misrepresent the typical experience. Computing it only over accounts that reached the action, while `reached_pct` and `within_day_pct` use all accounts, keeps the picture honest.

**Common mistake:** reporting the average as the typical time. The free plan's single two-day account pulls its "median" to 16.8 hours, and it suddenly looks like the slowest plan.

## Wrong answers

Feedback: incorrect-output

```sql
WITH accounts(account, plan, signed_up_at) AS ( VALUES ('a1', 'free', '2025-03-01 10:00'), ('a2', 'free', '2025-03-01 12:00'), ('a3', 'free', '2025-03-02 09:00'), ('a4', 'free', '2025-03-02 18:00'), ('a5', 'pro', '2025-03-01 08:00'), ('a6', 'pro', '2025-03-03 11:00'), ('a7', 'pro', '2025-03-04 15:00'), ('a8', 'team', '2025-03-02 10:00'), ('a9', 'team', '2025-03-05 10:00') ), key_actions(account, done_at) AS ( VALUES ('a1', '2025-03-01 11:30'), ('a1', '2025-03-03 09:00'), ('a2', '2025-03-03 12:00'), ('a3', '2025-03-02 10:00'), ('a5', '2025-03-01 08:20'), ('a6', '2025-03-03 15:00'), ('a7', '2025-03-05 15:00'), ('a8', '2025-03-02 16:00'), ('a9', '2025-03-05 10:45') ), firsts AS (SELECT a.account, a.plan, (julianday(MIN(k.done_at)) - julianday(a.signed_up_at)) * 24 AS hours FROM accounts AS a LEFT JOIN key_actions AS k ON k.account = a.account GROUP BY a.account, a.plan, a.signed_up_at) SELECT plan, COUNT(*) AS accounts, ROUND(100.0 * SUM(hours IS NOT NULL) / COUNT(*), 1) AS reached_pct, ROUND(AVG(hours), 1) AS median_hours, ROUND(100.0 * SUM(hours <= 24) / COUNT(*), 1) AS within_day_pct FROM firsts GROUP BY plan ORDER BY median_hours;
```
