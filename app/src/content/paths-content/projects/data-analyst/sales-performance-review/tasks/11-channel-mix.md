---
id: spr-11-channel-mix
title: Channel mix and returns
order: 11
difficulty: intermediate
topic: Operations
summary: Compare 2024 sales channels on revenue share, return rate and the value of returned orders.
module: customers-and-channels
duration: 25
dataset: kalaa-home
tables:
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Handle missing categories with COALESCE
  - Compare channels on several KPIs at once
prerequisites:
  - CASE inside SUM
  - COALESCE
  - Window functions over aggregates
---

## Task

Orders arrive through the website, the app and an online **marketplace**. A few imported orders have no channel (`NULL`): report them as `'unknown'` rather than dropping them.

For 2024 orders that were not cancelled, return per `channel`:

- `orders` (delivered and returned),
- `net_revenue` (delivered orders),
- `revenue_share_pct`: the channel's share of 2024 net revenue, rounded to one decimal,
- `return_rate_pct`: returned orders as a percentage of the channel's orders, rounded to one decimal,
- `returned_value`: the net value of the returned orders.

Sort by `net_revenue`, largest first.

## Starter query

```sql
SELECT channel, status, COUNT(*) AS orders
FROM orders
WHERE order_date >= '2024-01-01'
GROUP BY channel, status
ORDER BY channel, status;
```

## Hints

1. Build one row per order (channel, status and the order's net value) in a CTE. `COALESCE(o.channel, 'unknown')` gives the missing channels a name.
2. Net revenue counts delivered orders only: `SUM(CASE WHEN status = 'delivered' THEN revenue ELSE 0 END)`. The returned value is the same with `'returned'`.
3. For the revenue share, wrap that sum in a window: `SUM(SUM(CASE ... END)) OVER ()` is total net revenue across all channels.

## Solution

```sql
WITH order_totals AS (
  SELECT o.order_id, COALESCE(o.channel, 'unknown') AS channel, o.status,
         SUM(i.quantity * i.unit_price - i.discount) AS revenue
  FROM orders AS o
  JOIN order_items AS i ON i.order_id = o.order_id
  WHERE o.order_date >= '2024-01-01' AND o.status <> 'cancelled'
  GROUP BY o.order_id
)
SELECT channel,
       COUNT(*) AS orders,
       SUM(CASE WHEN status = 'delivered' THEN revenue ELSE 0 END) AS net_revenue,
       ROUND(100.0 * SUM(CASE WHEN status = 'delivered' THEN revenue ELSE 0 END)
             / SUM(SUM(CASE WHEN status = 'delivered' THEN revenue ELSE 0 END)) OVER (), 1) AS revenue_share_pct,
       ROUND(100.0 * SUM(status = 'returned') / COUNT(*), 1) AS return_rate_pct,
       SUM(CASE WHEN status = 'returned' THEN revenue ELSE 0 END) AS returned_value
FROM order_totals
GROUP BY channel
ORDER BY net_revenue DESC;
```

## Expected result

| channel | orders | net_revenue | revenue_share_pct | return_rate_pct | returned_value |
| --- | --- | --- | --- | --- | --- |
| web | 134 | 701866 | 45.5 | 4.5 | 41965 |
| app | 110 | 495856 | 32.1 | 6.4 | 43912 |
| marketplace | 75 | 334571 | 21.7 | 24 | 65438 |
| unknown | 4 | 10943 | 0.7 | 0 | 0 |

## Explanation

`COALESCE` keeps the four orders with no channel visible instead of hiding them in a `NULL` group, so totals still reconcile with Task 3.

**What it tells the business:** the **marketplace returns almost one order in four (24.0%)**, against 4.5% on the website and 6.4% in the app. It brings 21.7% of net revenue but ₹65,438 of returned orders, more than either the website or the app, and every return also costs shipping both ways. The website remains the largest channel (45.5% of revenue). The marketplace listings and its customer expectations need a review.

**Common mistake:** grouping by `channel` without `COALESCE`. The unknown orders then appear as an unlabelled `NULL` row that is easy to misread or drop from a report.

## Wrong answers

Feedback: incorrect-output

```sql
WITH order_totals AS (
  SELECT o.order_id, o.channel, o.status, SUM(i.quantity * i.unit_price - i.discount) AS revenue
  FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id
  WHERE o.order_date >= '2024-01-01' AND o.status <> 'cancelled'
  GROUP BY o.order_id
)
SELECT channel, COUNT(*) AS orders,
       SUM(CASE WHEN status = 'delivered' THEN revenue ELSE 0 END) AS net_revenue,
       ROUND(100.0 * SUM(CASE WHEN status = 'delivered' THEN revenue ELSE 0 END) / SUM(SUM(CASE WHEN status = 'delivered' THEN revenue ELSE 0 END)) OVER (), 1) AS revenue_share_pct,
       ROUND(100.0 * SUM(status = 'returned') / COUNT(*), 1) AS return_rate_pct,
       SUM(CASE WHEN status = 'returned' THEN revenue ELSE 0 END) AS returned_value
FROM order_totals GROUP BY channel ORDER BY net_revenue DESC;
```

Feedback: incorrect-output

```sql
WITH order_totals AS (
  SELECT o.order_id, COALESCE(o.channel, 'unknown') AS channel, o.status, SUM(i.quantity * i.unit_price - i.discount) AS revenue
  FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id
  WHERE o.order_date >= '2024-01-01'
  GROUP BY o.order_id
)
SELECT channel, COUNT(*) AS orders,
       SUM(CASE WHEN status = 'delivered' THEN revenue ELSE 0 END) AS net_revenue,
       ROUND(100.0 * SUM(CASE WHEN status = 'delivered' THEN revenue ELSE 0 END) / SUM(SUM(CASE WHEN status = 'delivered' THEN revenue ELSE 0 END)) OVER (), 1) AS revenue_share_pct,
       ROUND(100.0 * SUM(status = 'returned') / COUNT(*), 1) AS return_rate_pct,
       SUM(CASE WHEN status = 'returned' THEN revenue ELSE 0 END) AS returned_value
FROM order_totals GROUP BY channel ORDER BY net_revenue DESC;
```
