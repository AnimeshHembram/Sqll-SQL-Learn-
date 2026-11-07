---
id: dates-and-time
title: Working with dates
module: data-analyst
order: 3
level: intermediate
duration: 35
summary: Group activity by month, filter date ranges and measure the time between events, the basis of every trend report.
objectives:
  - Explain how dates are stored as ISO text in SQLite, and why the format matters
  - Filter a date range correctly
  - Group by month with strftime
  - Measure the number of days between two dates with julianday
---

"How many orders did we get each month?" "How long do new customers take to place their first order?" Questions about **trends** and **timing** are among the most common an analyst gets, and they all need date functions.

## Why analysts use this

Business reports are almost always organised by time: daily sales, weekly sign-ups, monthly revenue, quarter-on-quarter growth. Time between events matters too: how long between sign-up and first purchase, between order and delivery, between a customer's visits.

To answer these questions you need to:

- **filter** to a period ("orders in February"),
- **truncate** dates to a period ("this order belongs to 2025-02"),
- **measure** the gap between two dates.

## Syntax

SQLite has no separate date type. Dates are stored as **text in ISO format**, `YYYY-MM-DD`, which sorts and compares correctly as text. These functions read that format:

```sql syntax
strftime('%Y-%m', date_column)              -- year and month, for example '2025-02'
strftime('%Y', date_column)                 -- the year as text, for example '2025'
date(date_column, 'start of month')         -- the first day of that month
julianday(later_date) - julianday(earlier_date)   -- days between two dates
WHERE date_column BETWEEN '2025-02-01' AND '2025-02-28'
```

- `strftime(format, date)` formats a date: `%Y` year, `%m` month (01 to 12), `%d` day, `%w` weekday (0 is Sunday).
- `julianday(date)` turns a date into a day number, so subtracting two gives the days between them.
- Other databases use different names (`DATE_TRUNC`, `EXTRACT`, `DATEDIFF`), but the ideas are the same.

## Examples

### Orders in one month

Because ISO dates compare correctly as text, `BETWEEN` with the first and last day selects a month:

```sql
SELECT id, order_date, status
FROM orders
WHERE order_date BETWEEN '2025-02-01' AND '2025-02-28'
ORDER BY order_date;
```

Expected output:

| id | order_date | status |
| --- | --- | --- |
| 3 | 2025-02-05 | shipped |
| 4 | 2025-02-14 | cancelled |

### Group by month

`strftime('%Y-%m', order_date)` turns each date into its month, so grouping by it gives one row per month:

```sql
SELECT strftime('%Y-%m', order_date) AS month, COUNT(*) AS orders
FROM orders
GROUP BY month
ORDER BY month;
```

| month | orders |
| --- | --- |
| 2025-01 | 2 |
| 2025-02 | 2 |
| 2025-03 | 2 |

Include the year (`%Y-%m`, not just `%m`), or January 2025 and January 2026 would end up in the same group.

### Monthly revenue

The same grouping with a join gives the most common report of all: revenue per month. Cancelled orders are left out:

```sql
SELECT strftime('%Y-%m', o.order_date) AS month,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled'
GROUP BY month
ORDER BY month;
```

| month | revenue |
| --- | --- |
| 2025-01 | 48.47 |
| 2025-02 | 29.25 |
| 2025-03 | 55.74 |

### Days between two events

How long did each customer wait between signing up and their first order? `MIN(order_date)` finds the first order, and `julianday` measures the gap. `CAST(... AS INTEGER)` turns the result into a whole number of days:

```sql
SELECT c.name, c.joined, MIN(o.order_date) AS first_order,
  CAST(julianday(MIN(o.order_date)) - julianday(c.joined) AS INTEGER) AS days_to_first_order
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.name, c.joined
ORDER BY days_to_first_order;
```

| name | joined | first_order | days_to_first_order |
| --- | --- | --- | --- |
| Daniel Kim | 2025-02-11 | 2025-03-01 | 18 |
| Sofia Rossi | 2024-05-20 | 2025-02-14 | 270 |
| Rahul Mehta | 2024-03-02 | 2025-01-18 | 322 |
| Aisha Khan | 2024-01-15 | 2025-01-10 | 361 |

Daniel Kim ordered within three weeks of joining; the earliest customers took about a year.

### Age of an order on a given day

Reports often measure against a fixed reporting date, so the numbers do not change every time the query runs. How many days old was each shipped order on 31 March 2025?

```sql
SELECT id, order_date,
  CAST(julianday('2025-03-31') - julianday(order_date) AS INTEGER) AS days_open
FROM orders
WHERE status = 'shipped'
ORDER BY days_open DESC;
```

| id | order_date | days_open |
| --- | --- | --- |
| 3 | 2025-02-05 | 54 |
| 6 | 2025-03-09 | 22 |

## How the query runs

For monthly revenue:

1. The join gives one row per order line, each with its order's date and status.
2. `WHERE` removes the lines of cancelled orders.
3. `strftime('%Y-%m', o.order_date)` computes each line's month, and `GROUP BY month` groups the lines by it.
4. `SUM` adds up each month's line values, and `ORDER BY month` puts the months in calendar order. Because the month is ISO text, sorting it as text gives calendar order.

## Common mistakes

**Comparing a formatted month with a number.** `strftime` returns text, so `'01'` is never equal to the number `1`. This query runs, but finds nothing:

```sql
SELECT COUNT(*) AS january_orders
FROM orders
WHERE strftime('%m', order_date) = 1;
```

| january_orders |
| --- |
| 0 |

Compare with text instead: `strftime('%m', order_date) = '01'`, or better, use a full date range.

**Grouping by month without the year.** `strftime('%m', ...)` puts the same month of different years together. Use `'%Y-%m'`.

**Storing dates in another format.** `'14/02/2025'` does not sort or compare like a date, and SQLite's date functions return `NULL` for it:

```sql
SELECT julianday('14/02/2025') AS day_number;
```

| day_number |
| --- |
| NULL |

If you receive dates like this, convert them to `YYYY-MM-DD` first.

**Using "now" in a report.** `date('now')` changes every day, so the same query gives different answers tomorrow. For reports that must be reproducible, use a fixed reporting date.

## Key takeaways

- In SQLite, dates are ISO text, `YYYY-MM-DD`, which sorts and compares correctly.
- Filter a period with `BETWEEN 'first-day' AND 'last-day'`, or `>=` and `<`.
- Group by month with `strftime('%Y-%m', date)`, always including the year.
- Days between two dates: `julianday(later) - julianday(earlier)`.
- Use a fixed reporting date when results must not change from day to day.
