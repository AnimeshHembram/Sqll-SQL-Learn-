---
id: da-day-247
title: Where each product sits in its category's price range
order: 247
difficulty: intermediate
topic: Pricing
summary: Compare every price with its category median and label it budget, mid or premium.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute a median per group
  - Position values against a benchmark
prerequisites:
  - Day 84
  - Day 234
---

## Task

For each product (starter query), compare its price with the **median price of its category** (for an even number of products, the average of the middle two). Return:

- `median_price` (the category median) and `vs_median_pct` (`(price / median − 1) × 100`, rounded to 1 decimal place),
- `position`: `'budget'` when more than 10% below the median, `'premium'` when more than 10% above, otherwise `'mid'`.

Return `product`, `category`, `price`, `median_price`, `vs_median_pct` and `position`. Sort by `category`, then `price`, then `product`.

## Starter query

```sql
WITH products(product, category, price) AS (
  VALUES
    ('A', 'Kettles', 1200), ('B', 'Kettles', 1500), ('C', 'Kettles', 2400), ('D', 'Kettles', 1500),
    ('E', 'Toasters', 1800), ('F', 'Toasters', 2600), ('G', 'Toasters', 3900),
    ('H', 'Mixers', 4200)
)
SELECT product, category, price
FROM products
ORDER BY category, price;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Number the prices within each category (`ROW_NUMBER() OVER (PARTITION BY category ORDER BY price, product)`) and count them (`COUNT(*) OVER (PARTITION BY category)`).
3. The median is the average of the rows whose number is in `((n + 1) / 2, (n + 2) / 2)` with integer division: one row when `n` is odd, the middle two when even. Compute it per category, then join back.

## Solution

```sql
WITH products(product, category, price) AS (
  VALUES
    ('A', 'Kettles', 1200), ('B', 'Kettles', 1500), ('C', 'Kettles', 2400), ('D', 'Kettles', 1500),
    ('E', 'Toasters', 1800), ('F', 'Toasters', 2600), ('G', 'Toasters', 3900),
    ('H', 'Mixers', 4200)
),
ranked AS (
  SELECT category, price,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY price, product) AS rn,
    COUNT(*) OVER (PARTITION BY category) AS n
  FROM products
),
medians AS (
  SELECT category, AVG(price) AS median_price
  FROM ranked
  WHERE rn IN ((n + 1) / 2, (n + 2) / 2)
  GROUP BY category
)
SELECT p.product, p.category, p.price, m.median_price,
  ROUND(100.0 * (p.price / m.median_price - 1), 1) AS vs_median_pct,
  CASE WHEN p.price < 0.9 * m.median_price THEN 'budget' WHEN p.price > 1.1 * m.median_price THEN 'premium' ELSE 'mid' END AS position
FROM products AS p
JOIN medians AS m ON m.category = p.category
ORDER BY p.category, p.price, p.product;
```

## Expected result

| product | category | price | median_price | vs_median_pct | position |
| --- | --- | --- | --- | --- | --- |
| A | Kettles | 1200 | 1500 | -20 | budget |
| B | Kettles | 1500 | 1500 | 0 | mid |
| D | Kettles | 1500 | 1500 | 0 | mid |
| C | Kettles | 2400 | 1500 | 60 | premium |
| H | Mixers | 4200 | 4200 | 0 | mid |
| E | Toasters | 1800 | 2600 | -30.8 | budget |
| F | Toasters | 2600 | 2600 | 0 | mid |
| G | Toasters | 3900 | 2600 | 50 | premium |

## Explanation

A median is a better benchmark than an average for prices, because one premium product does not drag it upwards. SQLite has no `MEDIAN`, but the window functions build one: number each category's prices, and average the rows at positions `(n + 1) / 2` and `(n + 2) / 2` with integer division. With four kettles that picks positions 2 and 3 (both 1,500); with three toasters, position 2 (2,600) twice.

Against those medians, kettle C is 60% above its category and toaster E 30.8% below, so the range has a clear budget, mid and premium option in both categories. The mixer is alone in its category and is its own median. The average instead (1,650 for kettles) would make B and D look like budget products.

**Common mistake:** using `AVG(price)` as the benchmark. The expensive products pull it up, and ordinary mid-priced products get labelled as budget.

## Wrong answers

Feedback: incorrect-output

```sql
WITH products(product, category, price) AS ( VALUES ('A', 'Kettles', 1200), ('B', 'Kettles', 1500), ('C', 'Kettles', 2400), ('D', 'Kettles', 1500), ('E', 'Toasters', 1800), ('F', 'Toasters', 2600), ('G', 'Toasters', 3900), ('H', 'Mixers', 4200) ), medians AS (SELECT category, AVG(price) AS median_price FROM products GROUP BY category) SELECT p.product, p.category, p.price, m.median_price, ROUND(100.0 * (p.price / m.median_price - 1), 1) AS vs_median_pct, CASE WHEN p.price < 0.9 * m.median_price THEN 'budget' WHEN p.price > 1.1 * m.median_price THEN 'premium' ELSE 'mid' END AS position FROM products AS p JOIN medians AS m ON m.category = p.category ORDER BY p.category, p.price, p.product;
```
