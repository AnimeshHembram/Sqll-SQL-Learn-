---
id: da-day-364
title: Case study: forecast April from the first quarter
order: 364
difficulty: advanced
topic: Case studies
summary: Fit a trend to the bookstore's monthly revenue and project April, with a naive forecast for comparison.
module: data-analyst
duration: 14
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Fit and extend a trend line
  - Compare with a naive forecast
prerequisites:
  - Day 153
  - Day 354
---

## Task

Using non-cancelled orders, compute the bookstore's monthly revenue for January to March 2025 and forecast **April** two ways:

- `naive`: April = March,
- `trend`: a least-squares straight line through the three months (months numbered 1 to 3), evaluated at month 4.

Return one row per month January to March (`month`, `revenue`, `fitted` = the trend line's value for that month) and a final row `'2025-04'` with `revenue` `NULL`, `fitted` = the trend forecast and `naive` = March's revenue (other rows have `naive` `NULL`). Round money to 2 decimal places. Sort by `month`.

## Starter query

```sql
SELECT o.order_date, o.status, oi.quantity * oi.unit_price AS amount
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
ORDER BY o.order_date;
```

## Hints

1. Monthly revenue: non-cancelled order lines grouped by `strftime('%Y-%m', order_date)`, numbered 1 to 3 with `ROW_NUMBER()` (or from the month digits).
2. Slope `b = Σ((x − x̄)(y − ȳ)) / Σ((x − x̄)²)` and intercept `a = ȳ − b·x̄`, computed in one-row CTEs. The fitted value is `a + b·x`.
3. Add April with `UNION ALL`: `a + b * 4` for the trend, and March's revenue for the naive forecast.

## Solution

```sql
WITH monthly AS (
  SELECT strftime('%Y-%m', o.order_date) AS month, CAST(strftime('%m', o.order_date) AS INTEGER) AS x, SUM(oi.quantity * oi.unit_price) AS y
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled' AND o.order_date BETWEEN '2025-01-01' AND '2025-03-31'
  GROUP BY 1, 2
),
means AS (
  SELECT AVG(x) AS mx, AVG(y) AS my FROM monthly
),
line AS (
  SELECT SUM((m.x - s.mx) * (m.y - s.my)) / SUM((m.x - s.mx) * (m.x - s.mx)) AS b, s.mx, s.my
  FROM monthly AS m, means AS s
  GROUP BY s.mx, s.my
)
SELECT month, revenue, fitted, naive FROM (
  SELECT m.month, ROUND(m.y, 2) AS revenue, ROUND(l.my - l.b * l.mx + l.b * m.x, 2) AS fitted, NULL AS naive
  FROM monthly AS m, line AS l
  UNION ALL
  SELECT '2025-04', NULL, ROUND(l.my - l.b * l.mx + l.b * 4, 2), (SELECT ROUND(y, 2) FROM monthly WHERE x = 3)
  FROM line AS l
)
ORDER BY month;
```

## Expected result

| month | revenue | fitted | naive |
| --- | --- | --- | --- |
| 2025-01 | 48.47 | 40.85 | NULL |
| 2025-02 | 29.25 | 44.49 | NULL |
| 2025-03 | 55.74 | 48.12 | NULL |
| 2025-04 | NULL | 51.76 | 55.74 |

## Explanation

Forecasting from three months is mostly about being honest with uncertainty. The trend line through January to March (48.47, 29.25, 55.74) rises by about 3.64 a month and projects 51.76 for April; the naive forecast, "next month equals this month", says 55.74. The fitted values show how loosely the line fits: February was 15 below it.

With so little history, the naive forecast is a useful benchmark: a model that cannot beat "same as last month" over time is not worth its complexity. The least-squares slope and intercept are computed once in CTEs and reused for the fitted values and the forecast.

**Common mistake:** including cancelled orders in the monthly revenue. February then includes the cancelled 12.99, the fitted line shifts up, and the April forecast is built on sales that did not happen.

## Wrong answers

Feedback: incorrect-output

```sql
WITH monthly AS (SELECT strftime('%Y-%m', o.order_date) AS month, CAST(strftime('%m', o.order_date) AS INTEGER) AS x, SUM(oi.quantity * oi.unit_price) AS y FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.order_date BETWEEN '2025-01-01' AND '2025-03-31' GROUP BY 1, 2), means AS (SELECT AVG(x) AS mx, AVG(y) AS my FROM monthly), line AS (SELECT SUM((m.x - s.mx) * (m.y - s.my)) / SUM((m.x - s.mx) * (m.x - s.mx)) AS b, s.mx, s.my FROM monthly AS m, means AS s GROUP BY s.mx, s.my) SELECT month, revenue, fitted, naive FROM (SELECT m.month, ROUND(m.y, 2) AS revenue, ROUND(l.my - l.b * l.mx + l.b * m.x, 2) AS fitted, NULL AS naive FROM monthly AS m, line AS l UNION ALL SELECT '2025-04', NULL, ROUND(l.my - l.b * l.mx + l.b * 4, 2), (SELECT ROUND(y, 2) FROM monthly WHERE x = 3) FROM line AS l) ORDER BY month;
```
