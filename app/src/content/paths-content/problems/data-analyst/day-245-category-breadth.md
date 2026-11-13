---
id: da-day-245
title: Do customers who buy across categories spend more?
order: 245
difficulty: intermediate
topic: Customer analytics
summary: Count distinct categories per customer, band them and compare spend per band.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Count distinct values per entity
  - Compare bands of customers
prerequisites:
  - Day 75
  - Day 54
---

## Task

For each customer (starter query), count the **distinct categories** they bought and their total spend. Band customers by breadth: `'1 category'`, `'2 categories'` or `'3+ categories'`.

Return `breadth`, `customers`, `avg_spend` (rounded to 2 decimal places) and `share_of_revenue_pct` (the band's share of all spend, rounded to 1 decimal place). Sort from the narrowest band to the broadest.

## Starter query

```sql
WITH purchases(customer, category, amount) AS (
  VALUES
    ('c1', 'Books', 500), ('c1', 'Books', 300),
    ('c2', 'Books', 400), ('c2', 'Music', 350),
    ('c3', 'Books', 200), ('c3', 'Music', 300), ('c3', 'Gifts', 450), ('c3', 'Stationery', 100),
    ('c4', 'Stationery', 120),
    ('c5', 'Gifts', 600), ('c5', 'Books', 250), ('c5', 'Music', 150),
    ('c6', 'Music', 200), ('c6', 'Music', 220)
)
SELECT customer, category, amount
FROM purchases
ORDER BY customer, category;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Per customer: `COUNT(DISTINCT category)` and `SUM(amount)`. Two purchases in the same category still count as one category.
3. Band with `CASE WHEN categories >= 3 THEN '3+ categories' WHEN categories = 2 THEN '2 categories' ELSE '1 category' END`, group by band, and get the share with `SUM(SUM(spend)) OVER ()`.

## Solution

```sql
WITH purchases(customer, category, amount) AS (
  VALUES
    ('c1', 'Books', 500), ('c1', 'Books', 300),
    ('c2', 'Books', 400), ('c2', 'Music', 350),
    ('c3', 'Books', 200), ('c3', 'Music', 300), ('c3', 'Gifts', 450), ('c3', 'Stationery', 100),
    ('c4', 'Stationery', 120),
    ('c5', 'Gifts', 600), ('c5', 'Books', 250), ('c5', 'Music', 150),
    ('c6', 'Music', 200), ('c6', 'Music', 220)
),
per_customer AS (
  SELECT customer, COUNT(DISTINCT category) AS categories, SUM(amount) AS spend FROM purchases GROUP BY customer
),
banded AS (
  SELECT spend, MIN(categories, 3) AS band_order,
    CASE WHEN categories >= 3 THEN '3+ categories' WHEN categories = 2 THEN '2 categories' ELSE '1 category' END AS breadth
  FROM per_customer
)
SELECT breadth, COUNT(*) AS customers, ROUND(AVG(spend), 2) AS avg_spend,
  ROUND(100.0 * SUM(spend) / SUM(SUM(spend)) OVER (), 1) AS share_of_revenue_pct
FROM banded
GROUP BY breadth, band_order
ORDER BY band_order;
```

## Expected result

| breadth | customers | avg_spend | share_of_revenue_pct |
| --- | --- | --- | --- |
| 1 category | 3 | 446.67 | 32.4 |
| 2 categories | 1 | 750 | 18.1 |
| 3+ categories | 2 | 1025 | 49.5 |

## Explanation

Breadth is the number of **distinct** categories: c1 bought books twice, which is one category, and c6 bought music twice. Counting rows instead would put c1 in the two-category band.

The bands show a clear pattern: customers buying across three or more categories spend 1,025 on average, more than twice the single-category customers' 446.67, and the two of them bring in almost half the revenue. That does not prove that buying more categories **causes** higher spend (big spenders may simply explore more), but it is the evidence behind most cross-sell programmes. Keeping a numeric band order next to the label lets the report sort from narrow to broad.

**Common mistake:** `COUNT(category)` instead of `COUNT(DISTINCT category)`. Repeat purchases in one category look like variety, and customers land in the wrong bands.

## Wrong answers

Feedback: incorrect-output

```sql
WITH purchases(customer, category, amount) AS ( VALUES ('c1', 'Books', 500), ('c1', 'Books', 300), ('c2', 'Books', 400), ('c2', 'Music', 350), ('c3', 'Books', 200), ('c3', 'Music', 300), ('c3', 'Gifts', 450), ('c3', 'Stationery', 100), ('c4', 'Stationery', 120), ('c5', 'Gifts', 600), ('c5', 'Books', 250), ('c5', 'Music', 150), ('c6', 'Music', 200), ('c6', 'Music', 220) ), per_customer AS (SELECT customer, COUNT(category) AS categories, SUM(amount) AS spend FROM purchases GROUP BY customer), banded AS (SELECT spend, MIN(categories, 3) AS band_order, CASE WHEN categories >= 3 THEN '3+ categories' WHEN categories = 2 THEN '2 categories' ELSE '1 category' END AS breadth FROM per_customer) SELECT breadth, COUNT(*) AS customers, ROUND(AVG(spend), 2) AS avg_spend, ROUND(100.0 * SUM(spend) / SUM(SUM(spend)) OVER (), 1) AS share_of_revenue_pct FROM banded GROUP BY breadth, band_order ORDER BY band_order;
```
