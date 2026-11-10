---
id: cohorts-retention
title: Cohorts and retention
module: data-analyst
order: 8
level: advanced
duration: 45
summary: Group customers by when they started, follow each group over time and measure how many come back.
objectives:
  - Define a cohort by a customer's start date (sign-up or first purchase) and calculate cohort sizes
  - Count the months between two dates so that it works across years
  - Count each cohort's active customers in later periods
  - Turn those counts into retention percentages that compare cohorts fairly
---

Revenue can grow while the business is getting worse: if many new customers arrive each month but almost none come back, the business must keep finding new people forever. **Retention** measures whether customers return. A **cohort** is a group of customers who started in the same period, for example everyone whose first purchase was in January. Following each cohort over time shows whether newer customers stay longer or shorter than older ones.

## Why analysts use this

Comparing "all customers this month" with "all customers last month" mixes new and old customers, so improvements and problems hide each other. Cohorts separate them: the January cohort is always the same people, so a change in its activity is a real change in behaviour.

Analysts use cohorts to answer questions such as:

- What share of new buyers buy again in their second month?
- Do customers who joined after a campaign behave differently?
- How long does it take a typical customer to come back?

Two choices define a cohort analysis:

1. **The start event**, which decides the cohort: sign-up date, or first purchase.
2. **The activity**, which decides who counts as retained in a period: for example, a non-cancelled order.

## Syntax

```sql syntax
-- Each customer's start period, from their first activity
SELECT customer_id, strftime('%Y-%m', MIN(order_date)) AS cohort
FROM orders
GROUP BY customer_id;

-- A month number that keeps counting across years: year × 12 + month
CAST(strftime('%Y', some_date) AS INTEGER) * 12 + CAST(strftime('%m', some_date) AS INTEGER)

-- Months since the start: the difference of two month numbers
month_number(activity_date) - month_number(start_date)

-- Quarter of a date: 1 to 4
(CAST(strftime('%m', some_date) AS INTEGER) + 2) / 3
```

- `strftime('%Y-%m', date)` turns a date into its month, for example `'2025-03'`.
- Month numbers must include the year. Subtracting month numbers alone would make January 2025 minus December 2024 equal −11 instead of 1.
- In `(month + 2) / 3`, both numbers are whole, so SQLite divides as whole numbers and drops the remainder. That is exactly what turns months 1–3 into quarter 1.

## Examples

### Cohort sizes by first-purchase month

Each buyer belongs to the cohort of their first non-cancelled order. Counting customers per cohort gives the cohort sizes:

```sql
WITH firsts AS (
  SELECT customer_id, strftime('%Y-%m', MIN(order_date)) AS cohort
  FROM orders
  WHERE status <> 'cancelled'
  GROUP BY customer_id
)
SELECT cohort, COUNT(*) AS customers
FROM firsts
GROUP BY cohort
ORDER BY cohort;
```

Expected output:

| cohort | customers |
| --- | --- |
| 2025-01 | 2 |
| 2025-03 | 1 |

February has no cohort: the only February order from a new customer was cancelled, so Sofia Rossi is not a buyer at all.

### Cohorts by sign-up year

A cohort can also be defined by sign-up. This shows how many customers each sign-up year produced and how many of them have bought:

```sql
SELECT strftime('%Y', c.joined) AS signup_year,
  COUNT(*) AS customers,
  SUM(CASE WHEN EXISTS (
        SELECT 1 FROM orders AS o WHERE o.customer_id = c.id AND o.status <> 'cancelled'
      ) THEN 1 ELSE 0 END) AS buyers
FROM customers AS c
GROUP BY signup_year
ORDER BY signup_year;
```

| signup_year | customers | buyers |
| --- | --- | --- |
| 2024 | 3 | 2 |
| 2025 | 2 | 1 |

The `EXISTS` test is worked out once per customer, so a customer with several orders still counts once.

### Months since the first purchase

To follow a cohort, label every later order with how many months after the cohort's start it happened:

```sql
WITH firsts AS (
  SELECT customer_id, MIN(order_date) AS first_date
  FROM orders
  WHERE status <> 'cancelled'
  GROUP BY customer_id
)
SELECT o.customer_id, o.order_date,
  strftime('%Y-%m', f.first_date) AS cohort,
  (CAST(strftime('%Y', o.order_date) AS INTEGER) * 12 + CAST(strftime('%m', o.order_date) AS INTEGER))
  - (CAST(strftime('%Y', f.first_date) AS INTEGER) * 12 + CAST(strftime('%m', f.first_date) AS INTEGER)) AS months_since
FROM orders AS o
JOIN firsts AS f ON f.customer_id = o.customer_id
WHERE o.status <> 'cancelled'
ORDER BY o.customer_id, o.order_date;
```

| customer_id | order_date | cohort | months_since |
| --- | --- | --- | --- |
| 1 | 2025-01-10 | 2025-01 | 0 |
| 1 | 2025-02-05 | 2025-01 | 1 |
| 2 | 2025-01-18 | 2025-01 | 0 |
| 2 | 2025-03-09 | 2025-01 | 2 |
| 4 | 2025-03-01 | 2025-03 | 0 |

Month 0 is the cohort's first month. Aisha Khan came back in month 1, Rahul Mehta in month 2.

### A retention table

Counting different customers per cohort and month gives the retention table. Dividing by the cohort size turns counts into percentages:

```sql
WITH firsts AS (
  SELECT customer_id, MIN(order_date) AS first_date
  FROM orders
  WHERE status <> 'cancelled'
  GROUP BY customer_id
),
activity AS (
  SELECT strftime('%Y-%m', f.first_date) AS cohort, o.customer_id,
    (CAST(strftime('%Y', o.order_date) AS INTEGER) * 12 + CAST(strftime('%m', o.order_date) AS INTEGER))
    - (CAST(strftime('%Y', f.first_date) AS INTEGER) * 12 + CAST(strftime('%m', f.first_date) AS INTEGER)) AS months_since
  FROM orders AS o
  JOIN firsts AS f ON f.customer_id = o.customer_id
  WHERE o.status <> 'cancelled'
),
sizes AS (
  SELECT cohort, COUNT(DISTINCT customer_id) AS cohort_size FROM activity GROUP BY cohort
)
SELECT a.cohort, a.months_since, COUNT(DISTINCT a.customer_id) AS active,
  ROUND(100.0 * COUNT(DISTINCT a.customer_id) / s.cohort_size, 1) AS retention_pct
FROM activity AS a
JOIN sizes AS s ON s.cohort = a.cohort
GROUP BY a.cohort, a.months_since, s.cohort_size
ORDER BY a.cohort, a.months_since;
```

| cohort | months_since | active | retention_pct |
| --- | --- | --- | --- |
| 2025-01 | 0 | 2 | 100 |
| 2025-01 | 1 | 1 | 50 |
| 2025-01 | 2 | 1 | 50 |
| 2025-03 | 0 | 1 | 100 |

Month 0 is always 100%: every member of a cohort was active in its first month, by definition. Percentages let a cohort of 2 be compared with a cohort of 200.

## How the query runs

For the retention table:

1. `firsts` finds each buyer's first non-cancelled order date: the start of their cohort.
2. `activity` gives every non-cancelled order its customer's cohort and its `months_since`.
3. `sizes` counts the customers in each cohort.
4. The final query counts different active customers for every cohort and month and divides by the cohort size.

## Common mistakes

**Subtracting month numbers without the year.** From December to January is one month, but month numbers alone say −11:

```sql
SELECT CAST(strftime('%m', '2025-01-15') AS INTEGER) - CAST(strftime('%m', '2024-12-20') AS INTEGER) AS months_wrong,
  (2025 * 12 + 1) - (2024 * 12 + 12) AS months_right;
```

| months_wrong | months_right |
| --- | --- |
| -11 | 1 |

**Counting orders instead of customers.** A customer with three orders in a month is one retained customer. Use `COUNT(DISTINCT customer_id)`.

**Letting cancelled orders define the cohort.** If a cancelled order counts as a first purchase, the customer joins a cohort they never really entered. Apply the same filter to the start event and to the activity.

**Comparing young and old cohorts on the same month.** A cohort that started last month cannot have month-3 retention yet. A missing value means "not yet", not "zero".

## Key takeaways

- A cohort groups customers by when they started; retention follows each cohort over time.
- Define the start event and the activity first, and apply the same filters to both.
- Count months as `year × 12 + month`, so that the difference works across years.
- Count different customers, and divide by the cohort size to compare cohorts fairly.
- Month 0 is always 100%; later months show who came back.
