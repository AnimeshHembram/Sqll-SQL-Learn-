---
id: da-day-242
title: Each customer's spending mix by category
order: 242
difficulty: intermediate
topic: Customer analytics
summary: Show what share of each customer's spend goes to each category, and their main category.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute shares within a group
  - Pick a winner per group with ties broken
prerequisites:
  - Day 42
  - Day 98
---

## Task

For each customer and category they bought (starter query), return the category's **share of that customer's total spend**, and mark the customer's main category (the one with the largest share; on a tie, the alphabetically first category).

Return `customer`, `category`, `spend`, `share_pct` (rounded to 1 decimal place) and `is_main` (`'yes'` or `'no'`). Sort by `customer`, then `spend` from highest, then `category`.

## Starter query

```sql
WITH purchases(customer, category, amount) AS (
  VALUES
    ('Ravi', 'Books', 1200), ('Ravi', 'Stationery', 300), ('Ravi', 'Books', 800),
    ('Meera', 'Books', 400), ('Meera', 'Music', 900), ('Meera', 'Gifts', 700),
    ('Kiran', 'Stationery', 250),
    ('Asha', 'Books', 600), ('Asha', 'Music', 600)
)
SELECT customer, category, amount
FROM purchases
ORDER BY customer, category;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Group by customer and category first. The customer's total is a window over those groups: `SUM(SUM(amount)) OVER (PARTITION BY customer)`.
3. Rank categories within the customer with `ROW_NUMBER() OVER (PARTITION BY customer ORDER BY SUM(amount) DESC, category)`; rank 1 is the main category.

## Solution

```sql
WITH purchases(customer, category, amount) AS (
  VALUES
    ('Ravi', 'Books', 1200), ('Ravi', 'Stationery', 300), ('Ravi', 'Books', 800),
    ('Meera', 'Books', 400), ('Meera', 'Music', 900), ('Meera', 'Gifts', 700),
    ('Kiran', 'Stationery', 250),
    ('Asha', 'Books', 600), ('Asha', 'Music', 600)
),
mix AS (
  SELECT customer, category, SUM(amount) AS spend,
    100.0 * SUM(amount) / SUM(SUM(amount)) OVER (PARTITION BY customer) AS share,
    ROW_NUMBER() OVER (PARTITION BY customer ORDER BY SUM(amount) DESC, category) AS rnk
  FROM purchases
  GROUP BY customer, category
)
SELECT customer, category, spend, ROUND(share, 1) AS share_pct, CASE WHEN rnk = 1 THEN 'yes' ELSE 'no' END AS is_main
FROM mix
ORDER BY customer, spend DESC, category;
```

## Expected result

| customer | category | spend | share_pct | is_main |
| --- | --- | --- | --- | --- |
| Asha | Books | 600 | 50 | yes |
| Asha | Music | 600 | 50 | no |
| Kiran | Stationery | 250 | 100 | yes |
| Meera | Music | 900 | 45 | yes |
| Meera | Gifts | 700 | 35 | no |
| Meera | Books | 400 | 20 | no |
| Ravi | Books | 2000 | 87 | yes |
| Ravi | Stationery | 300 | 13 | no |

## Explanation

Share of wallet is a share within each customer, so the denominator is the customer's own total: `SUM(SUM(amount)) OVER (PARTITION BY customer)` adds up the grouped category rows of one customer. Ravi's two Books purchases are first combined (2,000), which is 87% of his 2,300.

The main category is the top-ranked one per customer, with a tie-break so that exactly one is chosen: Asha splits her spend 50/50, and the alphabetical rule makes Books her main category. Meera spreads her money widely (45% Music), which is the kind of customer a cross-category campaign suits; Kiran buys only stationery.

**Common mistake:** a window over the whole table (`OVER ()`). The shares become shares of all customers' spend, so each customer's shares no longer add up to 100%.

## Wrong answers

Feedback: incorrect-output

```sql
WITH purchases(customer, category, amount) AS ( VALUES ('Ravi', 'Books', 1200), ('Ravi', 'Stationery', 300), ('Ravi', 'Books', 800), ('Meera', 'Books', 400), ('Meera', 'Music', 900), ('Meera', 'Gifts', 700), ('Kiran', 'Stationery', 250), ('Asha', 'Books', 600), ('Asha', 'Music', 600) ), mix AS (SELECT customer, category, SUM(amount) AS spend, 100.0 * SUM(amount) / SUM(SUM(amount)) OVER () AS share, ROW_NUMBER() OVER (PARTITION BY customer ORDER BY SUM(amount) DESC, category) AS rnk FROM purchases GROUP BY customer, category) SELECT customer, category, spend, ROUND(share, 1) AS share_pct, CASE WHEN rnk = 1 THEN 'yes' ELSE 'no' END AS is_main FROM mix ORDER BY customer, spend DESC, category;
```
