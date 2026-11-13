---
id: da-day-249
title: Did the promotion just move sales between products?
order: 249
difficulty: advanced
topic: Pricing
summary: Compare promotion-period sales with a pre-promotion baseline for the promoted product and its siblings.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compare a period with a baseline
  - Measure substitution between products
prerequisites:
  - Day 193
  - Day 208
---

## Task

Cola was on promotion from 4 to 6 March (starter query). Use 1 to 3 March as the **baseline**. For each product, compute average daily units in the baseline and during the promotion, and the change: `extra_units_per_day` (promotion average − baseline average) and `change_pct` (rounded to 1 decimal place).

Then add a final row `product` = `'Net'` with the total change across all products in `extra_units_per_day` (and `NULL` in the other columns). Return `product`, `baseline_avg`, `promo_avg`, `extra_units_per_day` and `change_pct` (averages rounded to 1 decimal place), with the promoted product first, then the others alphabetically, then `'Net'`.

## Starter query

```sql
WITH daily_sales(day, product, units) AS (
  VALUES
    ('2025-03-01', 'Cola', 40), ('2025-03-01', 'Lime', 30), ('2025-03-01', 'Ginger', 20),
    ('2025-03-02', 'Cola', 42), ('2025-03-02', 'Lime', 28), ('2025-03-02', 'Ginger', 22),
    ('2025-03-03', 'Cola', 38), ('2025-03-03', 'Lime', 32), ('2025-03-03', 'Ginger', 18),
    ('2025-03-04', 'Cola', 90), ('2025-03-04', 'Lime', 15), ('2025-03-04', 'Ginger', 19),
    ('2025-03-05', 'Cola', 95), ('2025-03-05', 'Lime', 12), ('2025-03-05', 'Ginger', 21),
    ('2025-03-06', 'Cola', 85), ('2025-03-06', 'Lime', 18), ('2025-03-06', 'Ginger', 20)
),
promo(product, starts, ends) AS (
  VALUES ('Cola', '2025-03-04', '2025-03-06')
)
SELECT day, product, units
FROM daily_sales
ORDER BY day, product;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Label each day with a `CROSS JOIN` to `promo`: `CASE WHEN day BETWEEN starts AND ends THEN 'promo' ELSE 'baseline' END`. Every product's days get the same label, because the promotion period is the same for the whole shelf.
3. Average per product and period with conditional `AVG(CASE WHEN period = 'promo' THEN units END)`. Add the `'Net'` row with `UNION ALL`, and sort with a key that puts the promoted product first and `'Net'` last.

## Solution

```sql
WITH daily_sales(day, product, units) AS (
  VALUES
    ('2025-03-01', 'Cola', 40), ('2025-03-01', 'Lime', 30), ('2025-03-01', 'Ginger', 20),
    ('2025-03-02', 'Cola', 42), ('2025-03-02', 'Lime', 28), ('2025-03-02', 'Ginger', 22),
    ('2025-03-03', 'Cola', 38), ('2025-03-03', 'Lime', 32), ('2025-03-03', 'Ginger', 18),
    ('2025-03-04', 'Cola', 90), ('2025-03-04', 'Lime', 15), ('2025-03-04', 'Ginger', 19),
    ('2025-03-05', 'Cola', 95), ('2025-03-05', 'Lime', 12), ('2025-03-05', 'Ginger', 21),
    ('2025-03-06', 'Cola', 85), ('2025-03-06', 'Lime', 18), ('2025-03-06', 'Ginger', 20)
),
promo(product, starts, ends) AS (
  VALUES ('Cola', '2025-03-04', '2025-03-06')
),
labelled AS (
  SELECT s.product, s.units,
    CASE WHEN s.day BETWEEN p.starts AND p.ends THEN 'promo' ELSE 'baseline' END AS period
  FROM daily_sales AS s
  CROSS JOIN promo AS p
),
averages AS (
  SELECT product,
    AVG(CASE WHEN period = 'baseline' THEN units END) AS baseline_avg,
    AVG(CASE WHEN period = 'promo' THEN units END) AS promo_avg
  FROM labelled
  GROUP BY product
),
report AS (
  SELECT CASE WHEN product IN (SELECT product FROM promo) THEN 0 ELSE 1 END AS sort_key, product, baseline_avg, promo_avg,
    promo_avg - baseline_avg AS extra, 100.0 * (promo_avg - baseline_avg) / baseline_avg AS change_pct
  FROM averages
  UNION ALL
  SELECT 2, 'Net', NULL, NULL, SUM(promo_avg - baseline_avg), NULL FROM averages
)
SELECT product, ROUND(baseline_avg, 1) AS baseline_avg, ROUND(promo_avg, 1) AS promo_avg,
  ROUND(extra, 1) AS extra_units_per_day, ROUND(change_pct, 1) AS change_pct
FROM report
ORDER BY sort_key, product;
```

## Expected result

| product | baseline_avg | promo_avg | extra_units_per_day | change_pct |
| --- | --- | --- | --- | --- |
| Cola | 40 | 90 | 50 | 125 |
| Ginger | 20 | 20 | 0 | 0 |
| Lime | 30 | 15 | -15 | -50 |
| Net | NULL | NULL | 35 | NULL |

## Explanation

A promotion's headline effect is the promoted product's uplift: Cola sold 90 a day against a baseline of 40, up 125%. But shoppers who bought Cola instead of Lime were not new sales. Comparing every product on the shelf with the same baseline shows Lime falling by 15 units a day, while Ginger did not move. The **net** gain for the shelf is 35 units a day, not 50.

The key to the query is that the promotion period applies to the whole shelf: the `CROSS JOIN` to `promo` labels every product's days, so siblings are compared over the same two periods. Real analyses would also compare margin, since the promoted units sold at a discount.

**Common mistake:** joining the promotion only to the promoted product. Lime and Ginger never get a promotion period, so their change cannot be measured and the cannibalisation is invisible.

## Wrong answers

Feedback: incorrect-output

```sql
WITH daily_sales(day, product, units) AS ( VALUES ('2025-03-01', 'Cola', 40), ('2025-03-01', 'Lime', 30), ('2025-03-01', 'Ginger', 20), ('2025-03-02', 'Cola', 42), ('2025-03-02', 'Lime', 28), ('2025-03-02', 'Ginger', 22), ('2025-03-03', 'Cola', 38), ('2025-03-03', 'Lime', 32), ('2025-03-03', 'Ginger', 18), ('2025-03-04', 'Cola', 90), ('2025-03-04', 'Lime', 15), ('2025-03-04', 'Ginger', 19), ('2025-03-05', 'Cola', 95), ('2025-03-05', 'Lime', 12), ('2025-03-05', 'Ginger', 21), ('2025-03-06', 'Cola', 85), ('2025-03-06', 'Lime', 18), ('2025-03-06', 'Ginger', 20) ), promo(product, starts, ends) AS ( VALUES ('Cola', '2025-03-04', '2025-03-06') ), labelled AS (SELECT s.product, s.units, CASE WHEN s.day BETWEEN p.starts AND p.ends THEN 'promo' ELSE 'baseline' END AS period FROM daily_sales AS s LEFT JOIN promo AS p ON p.product = s.product), averages AS (SELECT product, AVG(CASE WHEN period = 'baseline' THEN units END) AS baseline_avg, AVG(CASE WHEN period = 'promo' THEN units END) AS promo_avg FROM labelled GROUP BY product), report AS (SELECT CASE WHEN product IN (SELECT product FROM promo) THEN 0 ELSE 1 END AS sort_key, product, baseline_avg, promo_avg, promo_avg - baseline_avg AS extra, 100.0 * (promo_avg - baseline_avg) / baseline_avg AS change_pct FROM averages UNION ALL SELECT 2, 'Net', NULL, NULL, SUM(promo_avg - baseline_avg), NULL FROM averages) SELECT product, ROUND(baseline_avg, 1) AS baseline_avg, ROUND(promo_avg, 1) AS promo_avg, ROUND(extra, 1) AS extra_units_per_day, ROUND(change_pct, 1) AS change_pct FROM report ORDER BY sort_key, product;
```
