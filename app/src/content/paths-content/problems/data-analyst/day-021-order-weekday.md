---
id: da-day-021
title: Which weekday was each order placed?
order: 21
difficulty: intermediate
topic: Dates
summary: Turn strftime's weekday number into a readable day name with CASE.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Extract the weekday from a date
  - Map codes to labels with CASE
prerequisites:
  - Day 20
  - Data Analyst chapter: Working with dates
---

## Task

To plan staffing, return each order's `id`, `order_date` and `weekday` as a name (`'Monday'`, `'Tuesday'`, ...). Row order does not matter.

## Starter query

```sql
SELECT id, order_date, strftime('%w', order_date) AS weekday
FROM orders;
```

## Hints

1. `strftime('%w', ...)` gives `'0'` for Sunday up to `'6'` for Saturday, as text.
2. Map each number to a name with `CASE strftime('%w', order_date) WHEN '0' THEN 'Sunday' ... END`.
3. List all seven: `'0'` Sunday, `'1'` Monday, `'2'` Tuesday, `'3'` Wednesday, `'4'` Thursday, `'5'` Friday, `'6'` Saturday.

## Solution

```sql
SELECT id, order_date,
  CASE strftime('%w', order_date)
    WHEN '0' THEN 'Sunday' WHEN '1' THEN 'Monday' WHEN '2' THEN 'Tuesday'
    WHEN '3' THEN 'Wednesday' WHEN '4' THEN 'Thursday' WHEN '5' THEN 'Friday'
    ELSE 'Saturday'
  END AS weekday
FROM orders;
```

## Expected result

| id | order_date | weekday |
| --- | --- | --- |
| 1 | 2025-01-10 | Friday |
| 2 | 2025-01-18 | Saturday |
| 3 | 2025-02-05 | Wednesday |
| 4 | 2025-02-14 | Friday |
| 5 | 2025-03-01 | Saturday |
| 6 | 2025-03-09 | Sunday |

## Explanation

`CASE value WHEN ... THEN ...` compares one value with each option. The weekday number is text, so the options are quoted. Three of the six orders were placed at the weekend.
