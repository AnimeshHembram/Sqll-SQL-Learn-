---
id: da-day-134
title: Budget burn and month-end projection
order: 134
difficulty: intermediate
topic: Financial analysis
summary: Project month-end spend from the daily run rate and flag departments heading over budget.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Project a period total from a run rate
  - Keep groups with no activity using the join condition
prerequisites:
  - Day 88
  - Day 117
---

## Task

It is **2025-03-20**, day 20 of a 31-day month. Spending so far and monthly budgets are in the starter query; an entry dated after today is a booking for later and must be ignored. For **every department with a budget**, return `dept`, `spent_to_date`, `projected` (spending to date ÷ 20 × 31, rounded to 2 decimal places), `monthly_budget` and `status`:

- `'over budget'` when spending to date already exceeds the budget,
- `'heading over'` when the projection exceeds the budget,
- `'ok'` otherwise (a projection exactly equal to the budget is ok).

Sort by `dept`.

## Starter query

```sql
WITH spend(dept, spent_on, amount) AS (
  VALUES
    ('Marketing', '2025-03-02', 2000), ('Marketing', '2025-03-10', 1500), ('Marketing', '2025-03-18', 800),
    ('Engineering', '2025-03-05', 3000), ('Engineering', '2025-03-15', 2000), ('Engineering', '2025-03-25', 6000),
    ('Sales', '2025-03-03', 1800), ('Sales', '2025-03-19', 1400),
    ('Support', '2025-03-20', 1000)
),
budgets(dept, monthly_budget) AS (
  VALUES ('Engineering', 10000), ('Legal', 2000), ('Marketing', 6200), ('Sales', 3000), ('Support', 1550)
)
SELECT dept, spent_on, amount
FROM spend
ORDER BY dept, spent_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Start from `budgets` and `LEFT JOIN` the spending with the date condition in the join: `ON s.dept = b.dept AND s.spent_on <= '2025-03-20'`, so departments without spending stay.
3. `COALESCE(SUM(s.amount), 0)` is the spending to date; multiply by `31 / 20.0` for the projection. Check the `CASE` conditions in the order given.

## Solution

```sql
WITH spend(dept, spent_on, amount) AS (
  VALUES
    ('Marketing', '2025-03-02', 2000), ('Marketing', '2025-03-10', 1500), ('Marketing', '2025-03-18', 800),
    ('Engineering', '2025-03-05', 3000), ('Engineering', '2025-03-15', 2000), ('Engineering', '2025-03-25', 6000),
    ('Sales', '2025-03-03', 1800), ('Sales', '2025-03-19', 1400),
    ('Support', '2025-03-20', 1000)
),
budgets(dept, monthly_budget) AS (
  VALUES ('Engineering', 10000), ('Legal', 2000), ('Marketing', 6200), ('Sales', 3000), ('Support', 1550)
),
to_date AS (
  SELECT b.dept, b.monthly_budget, COALESCE(SUM(s.amount), 0) AS spent_to_date
  FROM budgets AS b
  LEFT JOIN spend AS s ON s.dept = b.dept AND s.spent_on <= '2025-03-20'
  GROUP BY b.dept, b.monthly_budget
)
SELECT dept, spent_to_date,
  ROUND(spent_to_date * 31 / 20.0, 2) AS projected,
  monthly_budget,
  CASE
    WHEN spent_to_date > monthly_budget THEN 'over budget'
    WHEN spent_to_date * 31 / 20.0 > monthly_budget THEN 'heading over'
    ELSE 'ok'
  END AS status
FROM to_date
ORDER BY dept;
```

## Expected result

| dept | spent_to_date | projected | monthly_budget | status |
| --- | --- | --- | --- | --- |
| Engineering | 5000 | 7750 | 10000 | ok |
| Legal | 0 | 0 | 2000 | ok |
| Marketing | 4300 | 6665 | 6200 | heading over |
| Sales | 3200 | 4960 | 3000 | over budget |
| Support | 1000 | 1550 | 1550 | ok |

## Explanation

A run-rate projection assumes the rest of the month looks like the days so far. It is crude but useful early in a month: Marketing has spent 4,300 of 6,200, which sounds fine until the pace (215 a day) is projected to 6,665.

Engineering's 6,000 entry is dated 25 March, after today, so it is excluded and Engineering looks fine. Support's 1,000 on the 20th counts and projects to exactly its 1,550 budget, which the rule calls ok. Legal has spent nothing and still appears with 0.

**Common mistakes:** filtering the date in `WHERE`, which drops Legal; and dividing by 20 as a whole number in other databases (here `20.0` keeps the decimals).

## Wrong answers

Feedback: missing-rows

```sql
WITH spend(dept, spent_on, amount) AS ( VALUES ('Marketing', '2025-03-02', 2000), ('Marketing', '2025-03-10', 1500), ('Marketing', '2025-03-18', 800), ('Engineering', '2025-03-05', 3000), ('Engineering', '2025-03-15', 2000), ('Engineering', '2025-03-25', 6000), ('Sales', '2025-03-03', 1800), ('Sales', '2025-03-19', 1400), ('Support', '2025-03-20', 1000) ), budgets(dept, monthly_budget) AS ( VALUES ('Engineering', 10000), ('Legal', 2000), ('Marketing', 6200), ('Sales', 3000), ('Support', 1550) ), to_date AS (SELECT b.dept, b.monthly_budget, SUM(s.amount) AS spent_to_date FROM budgets AS b JOIN spend AS s ON s.dept = b.dept WHERE s.spent_on <= '2025-03-20' GROUP BY b.dept, b.monthly_budget) SELECT dept, spent_to_date, ROUND(spent_to_date * 31 / 20.0, 2) AS projected, monthly_budget, CASE WHEN spent_to_date > monthly_budget THEN 'over budget' WHEN spent_to_date * 31 / 20.0 > monthly_budget THEN 'heading over' ELSE 'ok' END AS status FROM to_date ORDER BY dept;
```
