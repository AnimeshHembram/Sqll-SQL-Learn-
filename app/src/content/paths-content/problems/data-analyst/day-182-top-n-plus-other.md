---
id: da-day-182
title: Top three plus "Other"
order: 182
difficulty: intermediate
topic: Reporting
summary: Keep the top products per category and fold the rest into one Other row, with shares that add up.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Fold small categories into Other
  - Compute shares over grouped rows
prerequisites:
  - Day 50
  - Day 135
---

## Task

A dashboard has room for three products per category (data in the starter query). For each category, show the **top 3 products by revenue** (ties broken alphabetically by product) and one `'Other'` row adding up the rest; categories with three products or fewer get no Other row.

Return `category`, `product`, `revenue` and `share_pct` (share of the category's revenue, rounded to 1 decimal place). Order by category, then the top products by rank, with `'Other'` last.

## Starter query

```sql
WITH product_sales(category, product, revenue) AS (
  VALUES
    ('Books', 'Atlas', 500), ('Books', 'Beacon', 300), ('Books', 'Comet', 300), ('Books', 'Delta', 120), ('Books', 'Ember', 80),
    ('Games', 'Fable', 400), ('Games', 'Garnet', 250),
    ('Toys', 'Harbor', 90), ('Toys', 'Indigo', 60), ('Toys', 'Juniper', 30), ('Toys', 'Kestrel', 20)
)
SELECT category, product, revenue
FROM product_sales
ORDER BY category, revenue DESC;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Rank within each category: `ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC, product)`, then label `CASE WHEN rank <= 3 THEN product ELSE 'Other' END`.
3. Group by category and label, keeping `MIN(rank)` to sort by (the Other row gets rank 4). The category total for the share is `SUM(SUM(revenue)) OVER (PARTITION BY category)`.

## Solution

```sql
WITH product_sales(category, product, revenue) AS (
  VALUES
    ('Books', 'Atlas', 500), ('Books', 'Beacon', 300), ('Books', 'Comet', 300), ('Books', 'Delta', 120), ('Books', 'Ember', 80),
    ('Games', 'Fable', 400), ('Games', 'Garnet', 250),
    ('Toys', 'Harbor', 90), ('Toys', 'Indigo', 60), ('Toys', 'Juniper', 30), ('Toys', 'Kestrel', 20)
),
ranked AS (
  SELECT category, product, revenue,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC, product) AS rnk
  FROM product_sales
),
labelled AS (
  SELECT category, CASE WHEN rnk <= 3 THEN product ELSE 'Other' END AS product, revenue, MIN(rnk, 4) AS sort_rank
  FROM ranked
)
SELECT category, product, SUM(revenue) AS revenue,
  ROUND(100.0 * SUM(revenue) / SUM(SUM(revenue)) OVER (PARTITION BY category), 1) AS share_pct
FROM labelled
GROUP BY category, product, sort_rank
ORDER BY category, sort_rank;
```

## Expected result

| category | product | revenue | share_pct |
| --- | --- | --- | --- |
| Books | Atlas | 500 | 38.5 |
| Books | Beacon | 300 | 23.1 |
| Books | Comet | 300 | 23.1 |
| Books | Other | 200 | 15.4 |
| Games | Fable | 400 | 61.5 |
| Games | Garnet | 250 | 38.5 |
| Toys | Harbor | 90 | 45 |
| Toys | Indigo | 60 | 30 |
| Toys | Juniper | 30 | 15 |
| Toys | Other | 20 | 10 |

## Explanation

"Top N plus Other" keeps a chart readable without losing revenue: every category's shares still add up to 100%. Beacon and Comet tie at 300 in Books; the alphabetical tie-break keeps exactly three named products, so Delta and Ember become Other (200, 15.4%). Games has only two products and Toys exactly four, so only Books and Toys get an Other row.

`SUM(SUM(revenue)) OVER (...)` is a window over the grouped rows: the inner `SUM` is the row's revenue, the outer one adds the rows of the category.

**Common mistake:** `RANK()` instead of `ROW_NUMBER()`. With a tie at the cut-off, `RANK() <= 3` can let four products through, and the Other row no longer means "the rest".

## Wrong answers

Feedback: incorrect-output

```sql
WITH product_sales(category, product, revenue) AS ( VALUES ('Books', 'Atlas', 500), ('Books', 'Beacon', 300), ('Books', 'Comet', 300), ('Books', 'Delta', 120), ('Books', 'Ember', 80), ('Games', 'Fable', 400), ('Games', 'Garnet', 250), ('Toys', 'Harbor', 90), ('Toys', 'Indigo', 60), ('Toys', 'Juniper', 30), ('Toys', 'Kestrel', 20) ), ranked AS (SELECT category, product, revenue, ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC, product) AS rnk FROM product_sales WHERE 1 = 1) SELECT category, product, revenue, ROUND(100.0 * revenue / SUM(revenue) OVER (PARTITION BY category), 1) AS share_pct FROM ranked WHERE rnk <= 3 ORDER BY category, rnk;
```
