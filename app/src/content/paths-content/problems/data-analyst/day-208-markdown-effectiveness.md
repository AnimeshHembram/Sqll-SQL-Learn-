---
id: da-day-208
title: Case study: did the markdown work?
order: 208
difficulty: advanced
topic: Case studies
summary: Compare daily sales rates before and after a markdown, with the revenue given away and the sell-through reached.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compare rates before and after an intervention
  - Weigh a lift against its cost
prerequisites:
  - Day 193
  - Day 162
---

## Task

A fashion retailer marked items down on **2025-03-08** (data in the starter query; the season runs 1–14 March, so 7 days before and 7 days from the markdown). For each item **that was marked down**, return:

- `sku`, `units_before` and `units_after` (before 8 March, and from 8 March on),
- `daily_rate_before` and `daily_rate_after` (units per day, rounded to 2 decimal places),
- `discount_given` (units after × (full price − markdown price)),
- `sell_through_pct` (all units sold ÷ starting stock, rounded to 1 decimal place),
- `verdict`: `'worked'` if the daily rate at least doubled, `'some lift'` if it rose, `'no lift'` otherwise.

Sort by `sku`.

## Starter query

```sql
WITH items(sku, full_price, markdown_price, markdown_on, stock_start) AS (
  VALUES
    ('J1', 50, 35, '2025-03-08', 40), ('J2', 80, 60, '2025-03-08', 30), ('J3', 30, 20, '2025-03-08', 50), ('J4', 60, NULL, NULL, 20)
),
daily_units(sku, day, units) AS (
  VALUES
    ('J1', '2025-03-01', 1), ('J1', '2025-03-04', 2), ('J1', '2025-03-09', 5), ('J1', '2025-03-12', 6),
    ('J2', '2025-03-02', 2), ('J2', '2025-03-06', 2), ('J2', '2025-03-10', 3), ('J2', '2025-03-13', 1),
    ('J3', '2025-03-03', 1), ('J3', '2025-03-11', 1),
    ('J4', '2025-03-05', 3), ('J4', '2025-03-12', 2)
)
SELECT i.sku, i.markdown_on, d.day, d.units
FROM items AS i
JOIN daily_units AS d ON d.sku = i.sku
ORDER BY i.sku, d.day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Keep marked-down items (`markdown_on IS NOT NULL`) and split units with `SUM(CASE WHEN d.day < i.markdown_on THEN d.units ELSE 0 END)`. Both periods are 7 days long.
3. Rates are units ÷ 7.0. Compare rates (not raw units) for the verdict, checking 'worked' (`rate_after >= 2 * rate_before`) first.

## Solution

```sql
WITH items(sku, full_price, markdown_price, markdown_on, stock_start) AS (
  VALUES
    ('J1', 50, 35, '2025-03-08', 40), ('J2', 80, 60, '2025-03-08', 30), ('J3', 30, 20, '2025-03-08', 50), ('J4', 60, NULL, NULL, 20)
),
daily_units(sku, day, units) AS (
  VALUES
    ('J1', '2025-03-01', 1), ('J1', '2025-03-04', 2), ('J1', '2025-03-09', 5), ('J1', '2025-03-12', 6),
    ('J2', '2025-03-02', 2), ('J2', '2025-03-06', 2), ('J2', '2025-03-10', 3), ('J2', '2025-03-13', 1),
    ('J3', '2025-03-03', 1), ('J3', '2025-03-11', 1),
    ('J4', '2025-03-05', 3), ('J4', '2025-03-12', 2)
),
split AS (
  SELECT i.sku, i.full_price, i.markdown_price, i.stock_start,
    SUM(CASE WHEN d.day < i.markdown_on THEN d.units ELSE 0 END) AS units_before,
    SUM(CASE WHEN d.day >= i.markdown_on THEN d.units ELSE 0 END) AS units_after
  FROM items AS i
  JOIN daily_units AS d ON d.sku = i.sku
  WHERE i.markdown_on IS NOT NULL
  GROUP BY i.sku, i.full_price, i.markdown_price, i.stock_start
)
SELECT sku, units_before, units_after,
  ROUND(units_before / 7.0, 2) AS daily_rate_before,
  ROUND(units_after / 7.0, 2) AS daily_rate_after,
  units_after * (full_price - markdown_price) AS discount_given,
  ROUND(100.0 * (units_before + units_after) / stock_start, 1) AS sell_through_pct,
  CASE
    WHEN units_after >= 2 * units_before THEN 'worked'
    WHEN units_after > units_before THEN 'some lift'
    ELSE 'no lift'
  END AS verdict
FROM split
ORDER BY sku;
```

## Expected result

| sku | units_before | units_after | daily_rate_before | daily_rate_after | discount_given | sell_through_pct | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| J1 | 3 | 11 | 0.43 | 1.57 | 165 | 35 | worked |
| J2 | 4 | 4 | 0.57 | 0.57 | 80 | 26.7 | no lift |
| J3 | 1 | 1 | 0.14 | 0.14 | 10 | 4 | no lift |

## Explanation

A markdown trades margin for speed, so its review needs both sides: how much faster did items sell, and what did that speed cost? J1's daily rate almost quadrupled for 165 of discount, a clear win. J2 sold no more units than before, yet gave away 80 in discounts. J3 sold the same single unit before and after, and 10 off did nothing; the problem is the product, not the price.

Sell-through puts the lift in context: even J1 has sold only 35% of its season stock. J4 was never marked down and is excluded, rather than being judged on a markdown it never had.

Comparing **rates** makes unequal periods comparable; here both periods are seven days, but the same query works for a mid-week markdown if the day counts are computed instead.

**Common mistake:** judging by revenue after the markdown, which rewards discounting the most expensive items regardless of lift.

## Wrong answers

Feedback: extra-rows

```sql
WITH items(sku, full_price, markdown_price, markdown_on, stock_start) AS ( VALUES ('J1', 50, 35, '2025-03-08', 40), ('J2', 80, 60, '2025-03-08', 30), ('J3', 30, 20, '2025-03-08', 50), ('J4', 60, NULL, NULL, 20) ), daily_units(sku, day, units) AS ( VALUES ('J1', '2025-03-01', 1), ('J1', '2025-03-04', 2), ('J1', '2025-03-09', 5), ('J1', '2025-03-12', 6), ('J2', '2025-03-02', 2), ('J2', '2025-03-06', 2), ('J2', '2025-03-10', 3), ('J2', '2025-03-13', 1), ('J3', '2025-03-03', 1), ('J3', '2025-03-11', 1), ('J4', '2025-03-05', 3), ('J4', '2025-03-12', 2) ), split AS (SELECT i.sku, i.full_price, i.markdown_price, i.stock_start, SUM(CASE WHEN d.day < COALESCE(i.markdown_on, '2025-03-08') THEN d.units ELSE 0 END) AS units_before, SUM(CASE WHEN d.day >= COALESCE(i.markdown_on, '2025-03-08') THEN d.units ELSE 0 END) AS units_after FROM items AS i JOIN daily_units AS d ON d.sku = i.sku GROUP BY i.sku, i.full_price, i.markdown_price, i.stock_start) SELECT sku, units_before, units_after, ROUND(units_before / 7.0, 2) AS daily_rate_before, ROUND(units_after / 7.0, 2) AS daily_rate_after, units_after * (full_price - COALESCE(markdown_price, full_price)) AS discount_given, ROUND(100.0 * (units_before + units_after) / stock_start, 1) AS sell_through_pct, CASE WHEN units_after >= 2 * units_before THEN 'worked' WHEN units_after > units_before THEN 'some lift' ELSE 'no lift' END AS verdict FROM split ORDER BY sku;
```
