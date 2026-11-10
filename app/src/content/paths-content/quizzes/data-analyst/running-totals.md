---
id: running-totals
title: Running totals and moving averages
order: 10
difficulty: advanced
topic: Cumulative sums, frames and moving averages
summary: Check that you can accumulate values, control the window frame and smooth a series.
duration: 5
---

## What does `SUM(amount) OVER (ORDER BY day)` calculate?

Type: conceptual
Topic: Running totals
Difficulty: beginner

- [ ] The total of all days on every row
- [x] For each row, the total from the first day up to and including that row's day
- [ ] The amount of the previous day
- [ ] The average amount per day

### Explanation

An `ORDER BY` inside `OVER` makes an aggregate accumulate. Without it, `SUM(amount) OVER ()` would be the grand total on every row.

## Two rows share the date 2025-05-02, with amounts 5 and 7, after 10 on 2025-05-01. What does the default frame `SUM(amount) OVER (ORDER BY day)` show on both 2 May rows?

Type: predict-output
Topic: Frames and ties
Difficulty: advanced

- [ ] 15 and 22
- [x] 22 and 22
- [ ] 5 and 7
- [ ] 12 and 12

### Explanation

The default frame includes every row tied with the current one, so both 2 May rows show the total up to the end of that day: 10 + 5 + 7 = 22. With `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` they would show 15 and 22.

## Which frame gives a moving average of the current row and the two rows before it?

Type: choose-the-clause
Topic: Moving averages
Difficulty: intermediate

- [ ] `ROWS BETWEEN 3 PRECEDING AND CURRENT ROW`
- [x] `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`
- [ ] `ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING`
- [ ] `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`

### Explanation

Two preceding rows plus the current row make three rows. `3 PRECEDING` would cover four rows, and `2 FOLLOWING` would include rows after the current one.

## How do you write a running total as a percentage of the grand total?

Type: multiple-choice
Topic: Cumulative percentage
Difficulty: intermediate

- [ ] `100.0 * SUM(x) OVER () / SUM(x) OVER (ORDER BY t)`
- [x] `100.0 * SUM(x) OVER (ORDER BY t) / SUM(x) OVER ()`
- [ ] `100.0 * x / SUM(x) OVER (ORDER BY t)`
- [ ] `PERCENT(SUM(x)) OVER (ORDER BY t)`

### Explanation

The running total, `SUM(x) OVER (ORDER BY t)`, divided by the grand total, `SUM(x) OVER ()`, rises to 100% on the last row. The first option is upside down, and there is no `PERCENT` function.

## A daily sales table has no row for days with no sales. What does `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` cover on such a table?

Type: conceptual
Topic: Frames and missing days
Difficulty: advanced

- [ ] Always the last seven calendar days
- [x] The last seven rows, which can stretch over more than seven days
- [ ] Only the days that had sales in the current week
- [ ] Nothing, because the frame needs a date spine to run

### Explanation

`ROWS` counts rows, not days. When days are missing, the seven rows reach further back in time. Generate one row per day first when the window must cover a fixed number of days.
