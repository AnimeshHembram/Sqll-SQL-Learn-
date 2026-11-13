---
id: da-day-338
title: From gross sales to contribution: a revenue waterfall
order: 338
difficulty: advanced
topic: Interview practice
summary: Walk from gross sales through discounts, returns and shipping to contribution, one row per step.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Build a waterfall with UNION ALL
  - Keep subtotals out of a running total
prerequisites:
  - Day 183
  - Day 181
---

## Task

Finance wants a **waterfall**: start from gross sales and subtract each deduction in turn (starter query). Return one row per step, in this order:

1. `'Gross sales'` (sum of `gross`),
2. `'Discounts'` (negative),
3. `'Returns'` (negative),
4. `'Net sales'` (subtotal),
5. `'Shipping income'` (positive) and `'Shipping cost'` (negative),
6. `'Contribution'` (net sales plus shipping income minus shipping cost).

Return `step`, `amount` and `running_total` (the cumulative amount after the step; for the two subtotal rows it equals their amount). Keep the order above.

## Starter query

```sql
WITH order_lines(order_id, gross, discount, returned, shipping_charged, shipping_cost) AS (
  VALUES
    (1, 2000, 200, 0, 50, 80), (2, 1500, 0, 1500, 50, 80), (3, 3200, 320, 0, 0, 120), (4, 800, 80, 300, 50, 60),
    (5, 1200, 0, 0, 50, 70), (6, 2600, 520, 0, 0, 110)
)
SELECT order_id, gross, discount, returned, shipping_charged, shipping_cost
FROM order_lines
ORDER BY order_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Total each column once in a CTE. Then build the steps with `UNION ALL`, giving each a sort number and marking subtotals.
3. Running total: `SUM(CASE WHEN is_subtotal THEN 0 ELSE amount END) OVER (ORDER BY sort_no)`, since subtotals must not be added again.

## Solution

```sql
WITH order_lines(order_id, gross, discount, returned, shipping_charged, shipping_cost) AS (
  VALUES
    (1, 2000, 200, 0, 50, 80), (2, 1500, 0, 1500, 50, 80), (3, 3200, 320, 0, 0, 120), (4, 800, 80, 300, 50, 60),
    (5, 1200, 0, 0, 50, 70), (6, 2600, 520, 0, 0, 110)
),
totals AS (
  SELECT SUM(gross) AS gross, SUM(discount) AS discount, SUM(returned) AS returned,
    SUM(shipping_charged) AS ship_in, SUM(shipping_cost) AS ship_cost
  FROM order_lines
),
steps AS (
  SELECT 1 AS sort_no, 'Gross sales' AS step, gross AS amount, 0 AS is_subtotal FROM totals
  UNION ALL SELECT 2, 'Discounts', -discount, 0 FROM totals
  UNION ALL SELECT 3, 'Returns', -returned, 0 FROM totals
  UNION ALL SELECT 4, 'Net sales', gross - discount - returned, 1 FROM totals
  UNION ALL SELECT 5, 'Shipping income', ship_in, 0 FROM totals
  UNION ALL SELECT 6, 'Shipping cost', -ship_cost, 0 FROM totals
  UNION ALL SELECT 7, 'Contribution', gross - discount - returned + ship_in - ship_cost, 1 FROM totals
)
SELECT step, amount, SUM(CASE WHEN is_subtotal = 1 THEN 0 ELSE amount END) OVER (ORDER BY sort_no) AS running_total
FROM steps
ORDER BY sort_no;
```

## Expected result

| step | amount | running_total |
| --- | --- | --- |
| Gross sales | 11300 | 11300 |
| Discounts | -1120 | 10180 |
| Returns | -1800 | 8380 |
| Net sales | 8380 | 8380 |
| Shipping income | 200 | 8580 |
| Shipping cost | -520 | 8060 |
| Contribution | 8060 | 8060 |

## Explanation

A waterfall shows how gross sales turn into what the business keeps. Each step is one aggregate, stacked with `UNION ALL` and a sort number: discounts take 1,120, returns 1,800, giving net sales of 8,380; shipping costs more than it earns (−320 net), leaving a contribution of 8,060.

Subtotals are the subtle part. They are rows in the table, but they must not be added to the running total, or every later figure is counted twice. Marking them and adding 0 for them in the running total keeps the line consistent: the running total after each subtotal equals the subtotal itself.

**Common mistake:** a plain running sum over all rows. Net sales is added on top of the steps that make it up, so the running total after it doubles to 16,760, and the contribution line ends up wildly wrong.

## Wrong answers

Feedback: incorrect-output

```sql
WITH order_lines(order_id, gross, discount, returned, shipping_charged, shipping_cost) AS ( VALUES (1, 2000, 200, 0, 50, 80), (2, 1500, 0, 1500, 50, 80), (3, 3200, 320, 0, 0, 120), (4, 800, 80, 300, 50, 60), (5, 1200, 0, 0, 50, 70), (6, 2600, 520, 0, 0, 110) ), totals AS (SELECT SUM(gross) AS gross, SUM(discount) AS discount, SUM(returned) AS returned, SUM(shipping_charged) AS ship_in, SUM(shipping_cost) AS ship_cost FROM order_lines), steps AS (SELECT 1 AS sort_no, 'Gross sales' AS step, gross AS amount FROM totals UNION ALL SELECT 2, 'Discounts', -discount FROM totals UNION ALL SELECT 3, 'Returns', -returned FROM totals UNION ALL SELECT 4, 'Net sales', gross - discount - returned FROM totals UNION ALL SELECT 5, 'Shipping income', ship_in FROM totals UNION ALL SELECT 6, 'Shipping cost', -ship_cost FROM totals UNION ALL SELECT 7, 'Contribution', gross - discount - returned + ship_in - ship_cost FROM totals) SELECT step, amount, SUM(amount) OVER (ORDER BY sort_no) AS running_total FROM steps ORDER BY sort_no;
```
