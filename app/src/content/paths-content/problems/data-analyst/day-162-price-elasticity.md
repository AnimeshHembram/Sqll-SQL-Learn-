---
id: da-day-162
title: How sensitive is demand to price?
order: 162
difficulty: advanced
topic: Product analytics
summary: Compute arc (midpoint) price elasticity and classify products, handling missing data and unchanged prices.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute arc price elasticity
  - Separate undefined results from zero
prerequisites:
  - Day 72
  - Day 115
---

## Task

A pricing test (in the starter query) changed some prices for a month. For each product, compute the **arc elasticity** with the midpoint method:

`elasticity = ((units_after − units_before) / ((units_before + units_after) / 2)) / ((price_after − price_before) / ((price_before + price_after) / 2))`

Return `product`, `elasticity` (rounded to 2 decimal places), `response` and `revenue_change` (`price_after × units_after − price_before × units_before`, rounded to 2 decimal places). `response` is `'elastic'` when `|elasticity| > 1`, `'inelastic'` when below 1, `'no price change'` when the price did not change, and `'insufficient data'` when `units_after` is missing; in those last two cases `elasticity` is `NULL` (and so is `revenue_change` when data is missing). Sort by `product`.

## Starter query

```sql
WITH price_test(product, price_before, price_after, units_before, units_after) AS (
  VALUES
    ('P1', 10.0, 12.0, 100, 70),
    ('P2', 20.0, 22.0, 50, 48),
    ('P3', 5.0, 4.0, 200, 260),
    ('P4', 8.0, 8.0, 30, 35),
    ('P5', 15.0, 18.0, 40, NULL)
)
SELECT product, price_before, price_after, units_before, units_after
FROM price_test
ORDER BY product;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Compute the two percentage changes in a CTE: `(units_after - units_before) / ((units_before + units_after) / 2.0)` and the same for price. Division by `2.0` keeps the fractions.
3. Only divide when the price changed: `CASE WHEN price_after <> price_before THEN pct_units / pct_price END`. `NULL` units make the whole expression `NULL`, which a `CASE` checked first can label.

## Solution

```sql
WITH price_test(product, price_before, price_after, units_before, units_after) AS (
  VALUES
    ('P1', 10.0, 12.0, 100, 70),
    ('P2', 20.0, 22.0, 50, 48),
    ('P3', 5.0, 4.0, 200, 260),
    ('P4', 8.0, 8.0, 30, 35),
    ('P5', 15.0, 18.0, 40, NULL)
),
changes AS (
  SELECT product, price_before, price_after, units_before, units_after,
    (units_after - units_before) / ((units_before + units_after) / 2.0) AS pct_units,
    (price_after - price_before) / ((price_before + price_after) / 2.0) AS pct_price
  FROM price_test
)
SELECT product,
  ROUND(CASE WHEN price_after <> price_before THEN pct_units / pct_price END, 2) AS elasticity,
  CASE
    WHEN units_after IS NULL THEN 'insufficient data'
    WHEN price_after = price_before THEN 'no price change'
    WHEN ABS(pct_units / pct_price) > 1 THEN 'elastic'
    ELSE 'inelastic'
  END AS response,
  ROUND(price_after * units_after - price_before * units_before, 2) AS revenue_change
FROM changes
ORDER BY product;
```

## Expected result

| product | elasticity | response | revenue_change |
| --- | --- | --- | --- |
| P1 | -1.94 | elastic | -160 |
| P2 | -0.43 | inelastic | 56 |
| P3 | -1.17 | elastic | 40 |
| P4 | NULL | no price change | 40 |
| P5 | NULL | insufficient data | NULL |

## Explanation

Elasticity says how strongly demand reacts to price: −1.94 means units fall almost twice as fast (in percentage terms) as the price rises. The midpoint method gives the same answer whether the price goes up or down, which a plain percentage change does not.

The revenue column shows why it matters. P1 is elastic, so its 20% price rise **lost** revenue. P2 is inelastic, and its rise added revenue despite fewer units. P3's price cut was elastic too, so lower prices brought more revenue.

P4's price did not move, so elasticity is undefined, not zero. P5 has no "after" sales yet, so it is reported as missing data rather than guessed.

**Common mistake:** measuring changes against the old values only, which gives −1.5 instead of −1.94 for P1 and different answers for increases and decreases.

## Wrong answers

Feedback: incorrect-output

```sql
WITH price_test(product, price_before, price_after, units_before, units_after) AS ( VALUES ('P1', 10.0, 12.0, 100, 70), ('P2', 20.0, 22.0, 50, 48), ('P3', 5.0, 4.0, 200, 260), ('P4', 8.0, 8.0, 30, 35), ('P5', 15.0, 18.0, 40, NULL) ), changes AS (SELECT product, price_before, price_after, units_before, units_after, (units_after - units_before) * 1.0 / units_before AS pct_units, (price_after - price_before) / price_before AS pct_price FROM price_test) SELECT product, ROUND(CASE WHEN price_after <> price_before THEN pct_units / pct_price END, 2) AS elasticity, CASE WHEN units_after IS NULL THEN 'insufficient data' WHEN price_after = price_before THEN 'no price change' WHEN ABS(pct_units / pct_price) > 1 THEN 'elastic' ELSE 'inelastic' END AS response, ROUND(price_after * units_after - price_before * units_before, 2) AS revenue_change FROM changes ORDER BY product;
```
