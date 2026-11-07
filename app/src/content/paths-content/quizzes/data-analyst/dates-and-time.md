---
id: dates-and-time
title: Working with dates
order: 3
difficulty: intermediate
topic: Dates in SQLite
summary: Check that you can filter, group and measure dates correctly.
duration: 4
---

## Why can SQLite compare dates stored as text, such as `'2025-02-14' < '2025-03-01'`?

Type: conceptual
Topic: ISO dates
Difficulty: beginner

- [ ] SQLite converts every text value to a date automatically
- [x] In `YYYY-MM-DD` form, text order is the same as date order
- [ ] Because both strings have the same length
- [ ] It cannot; the comparison always returns `NULL`

### Explanation

ISO dates put the year first, then the month, then the day, each with a fixed number of digits. Comparing them character by character therefore gives the same answer as comparing the dates.

## Which expression groups orders by month without mixing different years?

Type: multiple-choice
Topic: strftime
Difficulty: beginner

- [ ] `strftime('%m', order_date)`
- [x] `strftime('%Y-%m', order_date)`
- [ ] `strftime('%d', order_date)`
- [ ] `order_date / 30`

### Explanation

`'%Y-%m'` keeps the year with the month, so January 2025 and January 2026 are different groups. `'%m'` alone would put them together.

## What does this query return for the bookstore's orders, which include two from January 2025?

Type: predict-output
Topic: Text and numbers
Difficulty: intermediate

```sql
SELECT COUNT(*) FROM orders WHERE strftime('%m', order_date) = 1;
```

- [ ] 2
- [x] 0
- [ ] 6
- [ ] An error

### Explanation

`strftime` returns text, so the month is `'01'`, which is never equal to the number `1`. The query runs but counts nothing. Compare with `'01'` or use a date range.

## How do you get the number of days from `joined` to `order_date`?

Type: choose-the-clause
Topic: julianday
Difficulty: intermediate

- [ ] `order_date - joined`
- [x] `julianday(order_date) - julianday(joined)`
- [ ] `strftime('%d', order_date) - strftime('%d', joined)`
- [ ] `DAYS(order_date, joined)`

### Explanation

`julianday` turns each date into a continuous day number, so subtracting gives the days between them, across months and years. Subtracting the day-of-month parts ignores the months completely.

## Why use a fixed reporting date such as `'2025-03-31'` instead of `date('now')` in a report?

Type: conceptual
Topic: Reproducible reports
Difficulty: beginner

- [ ] `date('now')` does not work in SQLite
- [ ] Fixed dates make queries run faster
- [x] So the same query gives the same answer every time it is run
- [ ] Because `julianday` only accepts fixed dates

### Explanation

`date('now')` changes every day, so a report built on it changes too. A fixed reporting date makes results reproducible and comparable.
