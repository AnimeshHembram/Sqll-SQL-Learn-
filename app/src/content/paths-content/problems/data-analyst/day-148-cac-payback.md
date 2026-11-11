---
id: da-day-148
title: Case study: customer acquisition payback by channel
order: 148
difficulty: advanced
topic: Case studies
summary: Compare acquisition cost with cumulative margin per customer and find the payback month.
module: data-analyst
duration: 18
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Find the first period meeting a condition
  - Combine unit economics with running totals
prerequisites:
  - Day 131
  - Day 116
---

## Task

Each acquisition channel (in the starter query) spent money to win a cohort of customers; `cohort_margin` holds the cohort's total gross margin in each month after acquisition. For each channel, return:

- `channel`,
- `cac`: customer acquisition cost, spend ÷ customers,
- `payback_month`: the first month in which the **cumulative** margin per customer reaches or exceeds the CAC, or `NULL` if it has not happened within the six months,
- `margin_per_customer_6m`: cumulative margin per customer after month 6.

Sort by `payback_month` (channels that have not paid back last), then `channel`.

## Starter query

```sql
WITH channels(channel, spend, customers) AS (
  VALUES ('search', 3000, 30), ('social', 2000, 40), ('referral', 600, 20), ('display', 5000, 25)
),
cohort_margin(channel, month_index, margin) AS (
  VALUES
    ('search', 1, 600), ('search', 2, 600), ('search', 3, 900), ('search', 4, 900), ('search', 5, 900), ('search', 6, 900),
    ('social', 1, 400), ('social', 2, 400), ('social', 3, 400), ('social', 4, 400), ('social', 5, 400), ('social', 6, 400),
    ('referral', 1, 700), ('referral', 2, 300), ('referral', 3, 300), ('referral', 4, 300), ('referral', 5, 300), ('referral', 6, 300),
    ('display', 1, 500), ('display', 2, 500), ('display', 3, 500), ('display', 4, 500), ('display', 5, 500), ('display', 6, 500)
)
SELECT c.channel, c.spend, c.customers, m.month_index, m.margin
FROM channels AS c
JOIN cohort_margin AS m ON m.channel = c.channel
ORDER BY c.channel, m.month_index;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Running margin per customer: `SUM(m.margin) OVER (PARTITION BY m.channel ORDER BY m.month_index) * 1.0 / c.customers`, next to `c.spend * 1.0 / c.customers` as the CAC.
3. Group by channel: `MIN(CASE WHEN cumulative >= cac THEN month_index END)` is the payback month, and `MAX(CASE WHEN month_index = 6 THEN cumulative END)` the six-month figure. Sort with `ORDER BY payback_month IS NULL, payback_month, channel`.

## Solution

```sql
WITH channels(channel, spend, customers) AS (
  VALUES ('search', 3000, 30), ('social', 2000, 40), ('referral', 600, 20), ('display', 5000, 25)
),
cohort_margin(channel, month_index, margin) AS (
  VALUES
    ('search', 1, 600), ('search', 2, 600), ('search', 3, 900), ('search', 4, 900), ('search', 5, 900), ('search', 6, 900),
    ('social', 1, 400), ('social', 2, 400), ('social', 3, 400), ('social', 4, 400), ('social', 5, 400), ('social', 6, 400),
    ('referral', 1, 700), ('referral', 2, 300), ('referral', 3, 300), ('referral', 4, 300), ('referral', 5, 300), ('referral', 6, 300),
    ('display', 1, 500), ('display', 2, 500), ('display', 3, 500), ('display', 4, 500), ('display', 5, 500), ('display', 6, 500)
),
running AS (
  SELECT c.channel, m.month_index,
    c.spend * 1.0 / c.customers AS cac,
    SUM(m.margin) OVER (PARTITION BY m.channel ORDER BY m.month_index) * 1.0 / c.customers AS cumulative
  FROM channels AS c
  JOIN cohort_margin AS m ON m.channel = c.channel
)
SELECT channel,
  MAX(cac) AS cac,
  MIN(CASE WHEN cumulative >= cac THEN month_index END) AS payback_month,
  MAX(CASE WHEN month_index = 6 THEN cumulative END) AS margin_per_customer_6m
FROM running
GROUP BY channel
ORDER BY payback_month IS NULL, payback_month, channel;
```

## Expected result

| channel | cac | payback_month | margin_per_customer_6m |
| --- | --- | --- | --- |
| referral | 30 | 1 | 110 |
| search | 100 | 4 | 160 |
| social | 50 | 5 | 60 |
| display | 200 | NULL | 120 |

## Explanation

Payback period answers "how long until a new customer has earned back what it cost to win them?". It combines three earlier ideas: a per-customer division, a running total, and "the first period where a condition holds", found with `MIN(CASE WHEN ... THEN month_index END)`.

Referral customers cost 30 each and pay back in the first month. Social reaches its CAC of 50 **exactly** in month 5, and "reaches or exceeds" counts that. Display customers cost 200 and have earned 120 after six months: no payback yet, so `NULL`, and the six-month figure shows how far there is still to go.

**Common mistake:** comparing each month's margin (not the cumulative margin) with the CAC; no single month ever covers it, so every channel looks like it never pays back.

## Wrong answers

Feedback: incorrect-output

```sql
WITH channels(channel, spend, customers) AS ( VALUES ('search', 3000, 30), ('social', 2000, 40), ('referral', 600, 20), ('display', 5000, 25) ), cohort_margin(channel, month_index, margin) AS ( VALUES ('search', 1, 600), ('search', 2, 600), ('search', 3, 900), ('search', 4, 900), ('search', 5, 900), ('search', 6, 900), ('social', 1, 400), ('social', 2, 400), ('social', 3, 400), ('social', 4, 400), ('social', 5, 400), ('social', 6, 400), ('referral', 1, 700), ('referral', 2, 300), ('referral', 3, 300), ('referral', 4, 300), ('referral', 5, 300), ('referral', 6, 300), ('display', 1, 500), ('display', 2, 500), ('display', 3, 500), ('display', 4, 500), ('display', 5, 500), ('display', 6, 500) ), running AS (SELECT c.channel, m.month_index, c.spend * 1.0 / c.customers AS cac, m.margin * 1.0 / c.customers AS monthly, SUM(m.margin) OVER (PARTITION BY m.channel ORDER BY m.month_index) * 1.0 / c.customers AS cumulative FROM channels AS c JOIN cohort_margin AS m ON m.channel = c.channel) SELECT channel, MAX(cac) AS cac, MIN(CASE WHEN monthly >= cac THEN month_index END) AS payback_month, MAX(CASE WHEN month_index = 6 THEN cumulative END) AS margin_per_customer_6m FROM running GROUP BY channel ORDER BY payback_month IS NULL, payback_month, channel;
```
