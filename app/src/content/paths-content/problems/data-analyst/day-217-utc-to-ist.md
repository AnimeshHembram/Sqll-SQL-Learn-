---
id: da-day-217
title: Report orders by Indian local date
order: 217
difficulty: intermediate
topic: Dates
summary: Convert UTC timestamps to IST before grouping, so late-evening orders land on the right day.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Convert time zones with date modifiers
  - Group by a local date
prerequisites:
  - Day 21
  - Day 185
---

## Task

The website logs order times in **UTC** (starter query), but the business day is Indian Standard Time, **5 hours 30 minutes ahead**. Convert each timestamp to IST and report per IST date: `ist_date`, `orders`, `first_order` and `last_order` (the earliest and latest IST times that day, as `'HH:MM'`). Sort by `ist_date`.

## Starter query

```sql
WITH orders(id, placed_utc) AS (
  VALUES
    (1, '2025-03-09 17:10:00'), (2, '2025-03-09 18:29:00'), (3, '2025-03-09 18:30:00'), (4, '2025-03-09 23:45:00'),
    (5, '2025-03-10 04:00:00'), (6, '2025-03-10 12:15:00'), (7, '2025-03-10 19:05:00'), (8, '2025-03-11 02:20:00')
)
SELECT id, placed_utc
FROM orders
ORDER BY placed_utc;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Date and time functions accept several modifiers: `datetime(placed_utc, '+5 hours', '+30 minutes')` is the IST time.
3. Group by `date(ist)` and take `MIN(strftime('%H:%M', ist))` and `MAX(...)` for the first and last times.

## Solution

```sql
WITH orders(id, placed_utc) AS (
  VALUES
    (1, '2025-03-09 17:10:00'), (2, '2025-03-09 18:29:00'), (3, '2025-03-09 18:30:00'), (4, '2025-03-09 23:45:00'),
    (5, '2025-03-10 04:00:00'), (6, '2025-03-10 12:15:00'), (7, '2025-03-10 19:05:00'), (8, '2025-03-11 02:20:00')
),
local AS (
  SELECT id, datetime(placed_utc, '+5 hours', '+30 minutes') AS ist FROM orders
)
SELECT date(ist) AS ist_date, COUNT(*) AS orders, MIN(strftime('%H:%M', ist)) AS first_order, MAX(strftime('%H:%M', ist)) AS last_order
FROM local
GROUP BY date(ist)
ORDER BY ist_date;
```

## Expected result

| ist_date | orders | first_order | last_order |
| --- | --- | --- | --- |
| 2025-03-09 | 2 | 22:40 | 23:59 |
| 2025-03-10 | 4 | 00:00 | 17:45 |
| 2025-03-11 | 2 | 00:35 | 07:50 |

## Explanation

IST is UTC plus 5 hours 30 minutes, and both parts matter. Order 2 at 18:29 UTC is 23:59 IST on 9 March, while order 3, one minute later at 18:30 UTC, is exactly midnight IST on 10 March. Grouping by the UTC date would put both on the 9th; the business day in India has already changed for order 3.

Date functions take several modifiers in a row (`'+5 hours', '+30 minutes'`), and the result is ordinary text that `date()` and `strftime()` can use. In IST, 9 March has 2 orders, 10 March has 4 and 11 March has 2; by UTC date the split would be 4, 3 and 1, a quite different picture of daily demand.

**Common mistake:** adding only 5 hours. Orders between 18:30 and 19:00 UTC end up on the previous day, and every reported time is half an hour early.

## Wrong answers

Feedback: incorrect-output

```sql
WITH orders(id, placed_utc) AS ( VALUES (1, '2025-03-09 17:10:00'), (2, '2025-03-09 18:29:00'), (3, '2025-03-09 18:30:00'), (4, '2025-03-09 23:45:00'), (5, '2025-03-10 04:00:00'), (6, '2025-03-10 12:15:00'), (7, '2025-03-10 19:05:00'), (8, '2025-03-11 02:20:00') ), local AS (SELECT id, datetime(placed_utc, '+5 hours') AS ist FROM orders) SELECT date(ist) AS ist_date, COUNT(*) AS orders, MIN(strftime('%H:%M', ist)) AS first_order, MAX(strftime('%H:%M', ist)) AS last_order FROM local GROUP BY date(ist) ORDER BY ist_date;
```
