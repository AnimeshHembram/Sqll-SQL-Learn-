---
id: da-fix-status-percentages
title: Fix the status percentages
order: 1
difficulty: intermediate
topic: Integer division
summary: Find why a share-of-orders report shows whole numbers and fix it.
module: data-analyst
duration: 7
dataset: bookstore
tables:
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Spot and fix integer division
---

## Task

A colleague's report (the starter query) shows each order `status` with `pct_of_orders`, but the percentages add up to 99. Fix the query so that `pct_of_orders` is correct to 1 decimal place. Keep the columns `status` and `pct_of_orders`. Row order does not matter.

**Steps**

1. Run the starter query and add up the percentages: 50 + 33 + 16 is not 100.
2. `COUNT(*) * 100` and the subquery's count are both whole numbers, so SQLite drops the remainder of the division.
3. Write `100.0` instead of `100`, and round the result to 1 decimal place.

## Starter query

```sql
SELECT status, COUNT(*) * 100 / (SELECT COUNT(*) FROM orders) AS pct_of_orders
FROM orders
GROUP BY status;
```

## Hints

1. Whole number ÷ whole number gives a whole number in SQLite.
2. Making one side a decimal makes the whole division decimal.
3. `ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM orders), 1) AS pct_of_orders`

## Solution

```sql
SELECT status, ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM orders), 1) AS pct_of_orders
FROM orders
GROUP BY status;
```

## Expected result

| status | pct_of_orders |
| --- | --- |
| cancelled | 16.7 |
| delivered | 50 |
| shipped | 33.3 |

## Explanation

The fixed shares are 50.0%, 33.3% and 16.7%, which add up to 100. Percentages that add up to 99 or 98 are a typical sign of integer division, and a quick sum is the easiest way to catch it.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT status, COUNT(*) * 100 / (SELECT COUNT(*) FROM orders) AS pct_of_orders FROM orders GROUP BY status;
```
