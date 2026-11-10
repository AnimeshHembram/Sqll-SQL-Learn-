---
id: revenue-metrics
title: Revenue and order metrics
module: data-analyst
order: 6
level: intermediate
duration: 40
summary: Define and calculate the core sales metrics, revenue, orders, units, average order value and growth, so that every number has one clear meaning.
objectives:
  - Write down a metric's definition before calculating it, including what is excluded
  - Calculate revenue, order counts and units without double counting after a join
  - Calculate average order value and revenue per buyer with the right denominator
  - Compare two periods and express the change as a percentage
---

Almost every analyst is asked "how much did we sell?" The question sounds simple, but it hides choices: do cancelled orders count? Is an order with three books one order or three? Is "average order" the average of orders or of order lines? Two analysts who make different choices will report different numbers for the same data, and both will look correct.

This chapter teaches the metrics behind most sales reports, and the habit that makes them trustworthy: **define the metric first, then write the query**.

## Why analysts use this

Revenue, orders, units and average order value appear on nearly every business dashboard. Leaders compare them week by week and make decisions on them, so they must mean the same thing every time. An analyst's job is not only to calculate them, but to state exactly what they include.

A metric definition answers four questions:

1. **What is counted or added up?** For example, `quantity * unit_price`.
2. **Which rows are included?** For example, orders that were not cancelled.
3. **At what level?** Per order, per customer, per month.
4. **Over which period?** For example, orders placed in March 2025.

In the bookstore, an order's lines are in `order_items`, and the price paid is `unit_price`, which may differ from today's list price in `books`. Revenue is therefore calculated from `order_items`, never from `books.price`.

## Syntax

These are patterns rather than new keywords. Everything here uses `SUM`, `COUNT`, `JOIN` and `CASE`, which you already know.

```sql syntax
-- Revenue: add up quantity times the price paid, for the orders that count
SELECT SUM(oi.quantity * oi.unit_price) AS revenue
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled';

-- Orders after a join to order_items: count each order once
COUNT(DISTINCT o.id)

-- A ratio of two totals: divide the totals, do not average the rows
SUM(value) / COUNT(DISTINCT o.id)

-- Two periods side by side
SUM(CASE WHEN period = 'A' THEN value ELSE 0 END)
```

- After joining `orders` to `order_items`, there is **one row per order line**, not per order. Use `COUNT(DISTINCT o.id)` to count orders.
- Exclude cancelled orders in `WHERE` (or in the `CASE`) whenever the definition says so.
- Round only the final number. Rounding inside a sum adds up small errors.

## Examples

### Gross and net revenue

**Gross** revenue counts every order; **net** revenue here excludes cancelled orders. Showing both makes the effect of cancellations visible:

```sql
SELECT
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS gross_revenue,
  ROUND(SUM(CASE WHEN o.status <> 'cancelled' THEN oi.quantity * oi.unit_price ELSE 0 END), 2) AS net_revenue
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id;
```

Expected output:

| gross_revenue | net_revenue |
| --- | --- |
| 146.45 | 133.46 |

The difference, 12.99, is the one cancelled order. A report should always say which of the two it shows.

### Orders, units and revenue together

After the join each row is an order line, so orders are counted with `DISTINCT`:

```sql
SELECT
  COUNT(DISTINCT o.id) AS orders,
  SUM(oi.quantity) AS units,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled';
```

| orders | units | revenue |
| --- | --- | --- |
| 5 | 10 | 133.46 |

Five non-cancelled orders contained 10 books. `COUNT(*)` would have returned 8, the number of order lines, and called them orders.

### Average order value

Average order value (AOV) is revenue divided by the number of orders:

```sql
SELECT ROUND(SUM(oi.quantity * oi.unit_price) / COUNT(DISTINCT o.id), 2) AS aov
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled';
```

| aov |
| --- |
| 26.69 |

The same number can be reached in two steps, which is easier to check: first one row per order, then the average of those rows.

```sql
WITH order_values AS (
  SELECT o.id, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id
)
SELECT COUNT(*) AS orders, ROUND(AVG(order_value), 2) AS aov
FROM order_values;
```

| orders | aov |
| --- | --- |
| 5 | 26.69 |

### Metrics per month

Grouping by month turns each metric into a trend. Every column keeps its definition:

```sql
SELECT strftime('%Y-%m', o.order_date) AS month,
  COUNT(DISTINCT o.id) AS orders,
  SUM(oi.quantity) AS units,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue,
  ROUND(SUM(oi.quantity * oi.unit_price) / COUNT(DISTINCT o.id), 2) AS aov
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled'
GROUP BY month
ORDER BY month;
```

| month | orders | units | revenue | aov |
| --- | --- | --- | --- | --- |
| 2025-01 | 2 | 4 | 48.47 | 24.23 |
| 2025-02 | 1 | 2 | 29.25 | 29.25 |
| 2025-03 | 2 | 4 | 55.74 | 27.87 |

Notice that monthly AOV is calculated from that month's revenue and orders. Averaging the three monthly AOVs would not give the overall AOV, because the months have different numbers of orders.

### Growth between two periods

Growth compares a period with an earlier one: (new − old) ÷ old. Conditional sums put both periods in one row:

```sql
WITH monthly AS (
  SELECT
    SUM(CASE WHEN o.order_date LIKE '2025-02%' THEN oi.quantity * oi.unit_price ELSE 0 END) AS feb,
    SUM(CASE WHEN o.order_date LIKE '2025-03%' THEN oi.quantity * oi.unit_price ELSE 0 END) AS mar
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
)
SELECT ROUND(feb, 2) AS feb_revenue, ROUND(mar, 2) AS mar_revenue,
  ROUND(100.0 * (mar - feb) / feb, 1) AS growth_pct
FROM monthly;
```

| feb_revenue | mar_revenue | growth_pct |
| --- | --- | --- |
| 29.25 | 55.74 | 90.6 |

March revenue was 90.6% higher than February's. Growth is always measured against the **earlier** period.

## How the query runs

For the monthly metrics query:

1. `FROM` and `JOIN` build one row per order line, each carrying its order's date and status.
2. `WHERE` removes the line of the cancelled order.
3. `GROUP BY month` collects the lines of each month.
4. For each month, `COUNT(DISTINCT o.id)` counts different orders, `SUM(oi.quantity)` adds books, and the revenue sum adds `quantity * unit_price`.
5. `ORDER BY month` sorts the months.

## Common mistakes

**Counting order lines as orders.** After the join, `COUNT(*)` counts lines:

```sql
SELECT COUNT(*) AS not_really_orders, COUNT(DISTINCT o.id) AS orders
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id;
```

| not_really_orders | orders |
| --- | --- |
| 9 | 6 |

**Averaging lines instead of orders.** `AVG(quantity * unit_price)` is the average order **line**, a different metric:

```sql
SELECT ROUND(AVG(oi.quantity * oi.unit_price), 2) AS avg_line_value
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled';
```

| avg_line_value |
| --- |
| 16.68 |

**Using the list price.** `books.price` is today's price. If a price changes, past revenue calculated from it changes too. Use `order_items.unit_price`, the price actually paid.

**Forgetting the exclusions.** A revenue number that includes cancelled orders is not wrong in itself, but it is wrong if the reader expects net revenue. Write the exclusion into the metric's name or footnote.

**Rounding too early.** `SUM(ROUND(value, 2))` rounds every line before adding. Round once, at the end.

## Key takeaways

- Define each metric before calculating it: what is added, which rows count, at what level, over which period.
- Revenue comes from `order_items.quantity * unit_price`, with the agreed exclusions.
- After joining orders to their lines, count orders with `COUNT(DISTINCT o.id)`.
- Ratios such as AOV divide totals: `SUM(revenue) / COUNT(DISTINCT orders)`.
- Growth is `(new − old) / old`, written with `100.0` to avoid integer division.
