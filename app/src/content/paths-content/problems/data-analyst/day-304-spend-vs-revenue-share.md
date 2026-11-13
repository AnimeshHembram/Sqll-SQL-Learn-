---
id: da-day-304
title: Spend share against revenue share
order: 304
difficulty: intermediate
topic: Marketing analytics
summary: Compare each channel's share of spend with its share of attributed revenue to spot over- and under-funded channels.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compare two shares of total
  - Turn ratios into budget signals
prerequisites:
  - Day 146
  - Day 242
---

## Task

For each marketing channel (starter query), compare its **share of total spend** with its **share of attributed revenue**. Return `channel`, `spend_share_pct`, `revenue_share_pct` (both rounded to 1 decimal place), `roas` (revenue ÷ spend, rounded to 2 decimal places) and `signal`: `'scale up'` when the revenue share is at least 1.5 times the spend share, `'cut back'` when it is under 0.75 times, otherwise `'hold'`.

Sort by `roas` from highest.

## Starter query

```sql
WITH channel_results(channel, spend, attributed_revenue) AS (
  VALUES ('search', 400000, 1800000), ('social', 300000, 900000), ('video', 200000, 300000), ('email', 50000, 600000), ('affiliate', 50000, 400000)
)
SELECT channel, spend, attributed_revenue
FROM channel_results;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Shares over the whole table: `100.0 * spend / SUM(spend) OVER ()` and the same for revenue.
3. Compare the two shares as a ratio in a `CASE`; compute it in a CTE on unrounded values.

## Solution

```sql
WITH channel_results(channel, spend, attributed_revenue) AS (
  VALUES ('search', 400000, 1800000), ('social', 300000, 900000), ('video', 200000, 300000), ('email', 50000, 600000), ('affiliate', 50000, 400000)
),
shares AS (
  SELECT channel, spend, attributed_revenue,
    100.0 * spend / SUM(spend) OVER () AS spend_share,
    100.0 * attributed_revenue / SUM(attributed_revenue) OVER () AS revenue_share
  FROM channel_results
)
SELECT channel, ROUND(spend_share, 1) AS spend_share_pct, ROUND(revenue_share, 1) AS revenue_share_pct,
  ROUND(1.0 * attributed_revenue / spend, 2) AS roas,
  CASE WHEN revenue_share >= 1.5 * spend_share THEN 'scale up' WHEN revenue_share < 0.75 * spend_share THEN 'cut back' ELSE 'hold' END AS signal
FROM shares
ORDER BY roas DESC;
```

## Expected result

| channel | spend_share_pct | revenue_share_pct | roas | signal |
| --- | --- | --- | --- | --- |
| email | 5 | 15 | 12 | scale up |
| affiliate | 5 | 10 | 8 | scale up |
| search | 40 | 45 | 4.5 | hold |
| social | 30 | 22.5 | 3 | hold |
| video | 20 | 7.5 | 1.5 | cut back |

## Explanation

Comparing share of spend with share of results is a quick way to spot budget imbalances. Email takes 5% of the budget but brings 15% of attributed revenue, three times its share; video takes 20% and brings 7.5%. ROAS says the same in absolute terms: 12 for email, 1.5 for video.

The signal compares shares, not raw amounts, so it adapts to how money is spread. Two caveats keep this from being a final answer: attributed revenue depends on the attribution model (Day 239), and channels like email have limited room to scale, since you cannot email people who have not signed up.

**Common mistake:** comparing revenue with spend directly instead of comparing shares. Every channel returns more than 1.5 times its spend here, so everything would be marked "scale up", which is not a budget decision.

## Wrong answers

Feedback: incorrect-output

```sql
WITH channel_results(channel, spend, attributed_revenue) AS ( VALUES ('search', 400000, 1800000), ('social', 300000, 900000), ('video', 200000, 300000), ('email', 50000, 600000), ('affiliate', 50000, 400000) ) SELECT channel, ROUND(100.0 * spend / SUM(spend) OVER (), 1) AS spend_share_pct, ROUND(100.0 * attributed_revenue / SUM(attributed_revenue) OVER (), 1) AS revenue_share_pct, ROUND(1.0 * attributed_revenue / spend, 2) AS roas, CASE WHEN attributed_revenue >= 1.5 * spend THEN 'scale up' WHEN attributed_revenue < 0.75 * spend THEN 'cut back' ELSE 'hold' END AS signal FROM channel_results ORDER BY roas DESC;
```
