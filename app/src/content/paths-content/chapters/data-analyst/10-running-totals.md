---
id: running-totals
title: Running totals and moving averages
module: data-analyst
order: 10
level: advanced
duration: 40
summary: Accumulate values over time and smooth noisy numbers with window frames.
objectives:
  - Calculate a running total with SUM() OVER (ORDER BY ...), overall and per group
  - Explain the default window frame and why tied values make ROWS and RANGE differ
  - Calculate a moving average with ROWS BETWEEN ... PRECEDING AND CURRENT ROW
  - Express a running total as a cumulative percentage of the whole
---

"How much have we sold so far this quarter?" "Is the trend going up, or was yesterday just a good day?" The first question needs a **running total**: each row's value added to everything before it. The second needs a **moving average**: the average of the last few values, which smooths out single good or bad days. Both are window functions with an `ORDER BY`, and the moving average adds a **frame** that limits how far back the window reaches.

## Why analysts use this

Running totals show progress towards a target (revenue to date, sign-ups so far) and are the basis of cumulative charts. Moving averages make trends readable when daily numbers jump around. Cumulative percentages answer "how many items make up most of the total?", the idea behind Pareto analysis.

## Syntax

```sql syntax
-- Running total in time order
SUM(value) OVER (ORDER BY date_column)

-- Running total that restarts for each group
SUM(value) OVER (PARTITION BY group_column ORDER BY date_column)

-- Moving average over this row and the 2 before it
AVG(value) OVER (ORDER BY date_column ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)

-- Running total as a share of the grand total
100.0 * SUM(value) OVER (ORDER BY date_column) / SUM(value) OVER ()
```

- With an `ORDER BY` and no frame, an aggregate window adds up from the first row **to the current row, including every row tied with it**. This default is called `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`.
- `ROWS BETWEEN ... AND ...` counts physical rows instead, so tied rows are added one at a time.
- Frame bounds: `UNBOUNDED PRECEDING`, `n PRECEDING`, `CURRENT ROW`, `n FOLLOWING`, `UNBOUNDED FOLLOWING`.

## Examples

### Revenue to date

First calculate one row per order, then add a running total in time order:

```sql
WITH order_values AS (
  SELECT o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.order_date
)
SELECT order_date, ROUND(order_value, 2) AS order_value,
  ROUND(SUM(order_value) OVER (ORDER BY order_date), 2) AS revenue_to_date
FROM order_values
ORDER BY order_date;
```

Expected output:

| order_date | order_value | revenue_to_date |
| --- | --- | --- |
| 2025-01-10 | 32.97 | 32.97 |
| 2025-01-18 | 15.5 | 48.47 |
| 2025-02-05 | 29.25 | 77.72 |
| 2025-03-01 | 45.75 | 123.47 |
| 2025-03-09 | 9.99 | 133.46 |

The last row equals total net revenue. Rounding is applied to the displayed values only; the running sum itself adds the unrounded values.

### A running total for each customer

`PARTITION BY` restarts the total for each customer, so the result shows each customer's spend building up:

```sql
WITH order_values AS (
  SELECT o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
)
SELECT customer_id, order_date, ROUND(order_value, 2) AS order_value,
  ROUND(SUM(order_value) OVER (PARTITION BY customer_id ORDER BY order_date), 2) AS customer_spend_to_date
FROM order_values
ORDER BY customer_id, order_date;
```

| customer_id | order_date | order_value | customer_spend_to_date |
| --- | --- | --- | --- |
| 1 | 2025-01-10 | 32.97 | 32.97 |
| 1 | 2025-02-05 | 29.25 | 62.22 |
| 2 | 2025-01-18 | 15.5 | 15.5 |
| 2 | 2025-03-09 | 9.99 | 25.49 |
| 4 | 2025-03-01 | 45.75 | 45.75 |

### Ties: the default frame and ROWS

When several rows share the same `ORDER BY` value, the default frame includes all of them at once. This small table of daily sales (written in the query) has two rows on 2 May:

```sql
WITH sales(day, amount) AS (
  VALUES ('2025-05-01', 10), ('2025-05-02', 5), ('2025-05-02', 7), ('2025-05-03', 4)
)
SELECT day, amount,
  SUM(amount) OVER (ORDER BY day) AS default_frame,
  SUM(amount) OVER (ORDER BY day ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS rows_frame
FROM sales
ORDER BY day, amount;
```

| day | amount | default_frame | rows_frame |
| --- | --- | --- | --- |
| 2025-05-01 | 10 | 10 | 10 |
| 2025-05-02 | 5 | 22 | 15 |
| 2025-05-02 | 7 | 22 | 22 |
| 2025-05-03 | 4 | 26 | 26 |

With the default frame, both 2 May rows show 22, the total up to the **end** of that day. With `ROWS`, they show 15 and then 22, adding one row at a time. Neither is wrong; choose the one that matches the question. If you want one value per day, it is usually clearest to group by day first, so there are no ties.

### A moving average

A three-order moving average uses this order and up to two before it:

```sql
WITH order_values AS (
  SELECT o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.order_date
)
SELECT order_date, ROUND(order_value, 2) AS order_value,
  ROUND(AVG(order_value) OVER (ORDER BY order_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_avg_3,
  COUNT(*) OVER (ORDER BY order_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS orders_in_average
FROM order_values
ORDER BY order_date;
```

| order_date | order_value | moving_avg_3 | orders_in_average |
| --- | --- | --- | --- |
| 2025-01-10 | 32.97 | 32.97 | 1 |
| 2025-01-18 | 15.5 | 24.23 | 2 |
| 2025-02-05 | 29.25 | 25.91 | 3 |
| 2025-03-01 | 45.75 | 30.17 | 3 |
| 2025-03-09 | 9.99 | 28.33 | 3 |

The `orders_in_average` column shows that the first two averages use fewer than three orders. Some reports leave those rows blank so that every shown average covers the same number of values.

### Cumulative percentage

Dividing the running total by the grand total, `SUM(...) OVER ()`, shows how quickly the total builds up. Here by genre, from the largest revenue down:

```sql
WITH genre_revenue AS (
  SELECT b.genre, SUM(oi.quantity * oi.unit_price) AS revenue
  FROM order_items AS oi
  JOIN orders AS o ON o.id = oi.order_id
  JOIN books AS b ON b.id = oi.book_id
  WHERE o.status <> 'cancelled'
  GROUP BY b.genre
)
SELECT genre, ROUND(revenue, 2) AS revenue,
  ROUND(100.0 * SUM(revenue) OVER (ORDER BY revenue DESC) / SUM(revenue) OVER (), 1) AS cumulative_pct
FROM genre_revenue
ORDER BY revenue DESC;
```

| genre | revenue | cumulative_pct |
| --- | --- | --- |
| Fantasy | 57.75 | 43.3 |
| Science | 29.97 | 65.7 |
| Mystery | 27.74 | 86.5 |
| Science fiction | 18 | 100 |

The top two genres make up 65.7% of revenue.

## How the query runs

For the moving average:

1. `order_values` produces one row per non-cancelled order.
2. For each row, the frame `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` selects that row and the two rows just before it in date order.
3. `AVG` averages the frame and `COUNT(*)` counts how many rows it held.
4. The final `ORDER BY` sorts the output.

## Common mistakes

**Running totals over unaggregated rows.** A running total of order lines adds lines, and two lines of the same order share a date, so the default frame jumps by both at once. Build one row per period or per order first.

**Forgetting `ORDER BY` inside `OVER`.** `SUM(value) OVER ()` is the grand total on every row, not a running total.

**Expecting a moving average to fill missing days.** `ROWS BETWEEN 2 PRECEDING` means the two previous **rows**, not the two previous days. If a day has no row, the window reaches further back in time. Generate a row for every day first (a date spine) when the window must cover a fixed number of days.

**Writing the frame without an order.** A frame needs an `ORDER BY` to know which rows come before:

```sql
SELECT title, price,
  ROUND(SUM(price) OVER (ROWS BETWEEN 1 PRECEDING AND CURRENT ROW), 2) AS unordered_pairs
FROM books;
```

| title | price | unordered_pairs |
| --- | --- | --- |
| The Silent Orchard | 12.99 | 12.99 |
| Rivers of Glass | 15.5 | 28.49 |
| Counting Stars | 9.99 | 25.49 |
| The Last Signal | 18 | 27.99 |
| Paper Lanterns | 11.25 | 29.25 |
| A Quiet Ledger | 14.75 | 26 |

SQLite accepts this, but the pairs depend on the order rows happen to be read, so the result means nothing. Always add `ORDER BY` inside `OVER`.

## Key takeaways

- `SUM(x) OVER (ORDER BY t)` is a running total; add `PARTITION BY` to restart it per group.
- By default, tied rows are included together; `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` adds them one at a time.
- `AVG(x) OVER (ORDER BY t ROWS BETWEEN n PRECEDING AND CURRENT ROW)` is a moving average over n + 1 rows.
- `SUM(x) OVER ()` is the grand total; divide by it for cumulative percentages.
- Aggregate to one row per period or per item before accumulating.
