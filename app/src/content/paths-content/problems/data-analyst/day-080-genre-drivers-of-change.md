---
id: da-day-080
title: Which genres drove the March rise?
order: 80
difficulty: advanced
topic: Segmentation
summary: Break a total change into contributions per category.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - books
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Decompose a change by category
prerequisites:
  - Day 59
  - Day 44
---

## Task

Revenue rose from February to March. For each genre, return `genre`, `feb_revenue`, `mar_revenue` and `change` (March minus February), all non-cancelled and rounded to 2 decimal places, `0` where a month had no sales. Sort by `change`, largest first.

## Starter query

```sql
SELECT b.genre, strftime('%Y-%m', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS revenue
FROM order_items AS oi
JOIN orders AS o ON o.id = oi.order_id
JOIN books AS b ON b.id = oi.book_id
WHERE o.status <> 'cancelled'
GROUP BY b.genre, month;
```

## Hints

1. Put the two months side by side as columns with conditional aggregation, as in the Day 59 pivot.
2. `SUM(CASE WHEN o.order_date LIKE '2025-02%' THEN oi.quantity * oi.unit_price ELSE 0 END) AS feb_revenue`, and the same for March.
3. `change` is the March expression minus the February one; `GROUP BY b.genre ORDER BY change DESC`.

## Solution

```sql
SELECT b.genre,
  ROUND(SUM(CASE WHEN o.order_date LIKE '2025-02%' THEN oi.quantity * oi.unit_price ELSE 0 END), 2) AS feb_revenue,
  ROUND(SUM(CASE WHEN o.order_date LIKE '2025-03%' THEN oi.quantity * oi.unit_price ELSE 0 END), 2) AS mar_revenue,
  ROUND(SUM(CASE WHEN o.order_date LIKE '2025-03%' THEN oi.quantity * oi.unit_price ELSE 0 END)
      - SUM(CASE WHEN o.order_date LIKE '2025-02%' THEN oi.quantity * oi.unit_price ELSE 0 END), 2) AS change
FROM order_items AS oi
JOIN orders AS o ON o.id = oi.order_id
JOIN books AS b ON b.id = oi.book_id
WHERE o.status <> 'cancelled'
GROUP BY b.genre
ORDER BY change DESC;
```

## Expected result

| genre | feb_revenue | mar_revenue | change |
| --- | --- | --- | --- |
| Fantasy | 11.25 | 31 | 19.75 |
| Mystery | 0 | 14.75 | 14.75 |
| Science | 0 | 9.99 | 9.99 |
| Science fiction | 18 | 0 | -18 |

## Explanation

The changes add up to the total rise of 26.49. Fantasy contributed most (+19.75), while science fiction fell by 18.00. Explaining a change by its parts is a core analyst task.
