---
id: da-day-276
title: Budget against actual, favourable or not
order: 276
difficulty: intermediate
topic: Financial analysis
summary: Report variances where more revenue is good and more expense is bad, with a net profit line.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Interpret variances by account type
  - Add a derived total row
prerequisites:
  - Day 88
  - Day 134
---

## Task

Finance reviews the quarter against budget (starter query). For each account, the **variance** is `actual − budget`. Whether it is good depends on the kind of account: more revenue than budgeted is **favourable**, but more expense than budgeted is **unfavourable**.

Return `account`, `kind`, `budget`, `actual`, `variance`, `variance_pct` (variance ÷ budget × 100, rounded to 1 decimal place) and `assessment` (`'favourable'`, `'unfavourable'` or `'on budget'`). Then add a final row `account` = `'Net profit'` with `kind` `NULL`, budget and actual profit (revenue minus expenses), their variance, its percentage, and its assessment. Sort revenue accounts first, then expenses, each alphabetically, with `'Net profit'` last.

## Starter query

```sql
WITH budget(account, kind, budget, actual) AS (
  VALUES
    ('Book sales', 'revenue', 500000, 540000), ('Gift cards', 'revenue', 80000, 62000), ('Cafe', 'revenue', 120000, 120000),
    ('Salaries', 'expense', 220000, 231000), ('Rent', 'expense', 90000, 90000), ('Marketing', 'expense', 60000, 48000),
    ('Utilities', 'expense', 15000, 17500)
)
SELECT account, kind, budget, actual
FROM budget
ORDER BY kind, account;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Turn the variance into a profit effect: for revenue it is `actual - budget`, for expenses `budget - actual`. Positive is favourable either way.
3. Net profit: `SUM(CASE WHEN kind = 'revenue' THEN budget ELSE -budget END)` and the same for actual; add it with `UNION ALL` and a sort key (0 revenue, 1 expense, 2 net).

## Solution

```sql
WITH budget(account, kind, budget, actual) AS (
  VALUES
    ('Book sales', 'revenue', 500000, 540000), ('Gift cards', 'revenue', 80000, 62000), ('Cafe', 'revenue', 120000, 120000),
    ('Salaries', 'expense', 220000, 231000), ('Rent', 'expense', 90000, 90000), ('Marketing', 'expense', 60000, 48000),
    ('Utilities', 'expense', 15000, 17500)
),
lines AS (
  SELECT CASE kind WHEN 'revenue' THEN 0 ELSE 1 END AS sort_key, account, kind, budget, actual,
    CASE kind WHEN 'revenue' THEN actual - budget ELSE budget - actual END AS effect
  FROM budget
  UNION ALL
  SELECT 2, 'Net profit', NULL,
    SUM(CASE WHEN kind = 'revenue' THEN budget ELSE -budget END),
    SUM(CASE WHEN kind = 'revenue' THEN actual ELSE -actual END),
    SUM(CASE WHEN kind = 'revenue' THEN actual - budget ELSE budget - actual END)
  FROM budget
)
SELECT account, kind, budget, actual, actual - budget AS variance,
  ROUND(100.0 * (actual - budget) / budget, 1) AS variance_pct,
  CASE WHEN effect > 0 THEN 'favourable' WHEN effect < 0 THEN 'unfavourable' ELSE 'on budget' END AS assessment
FROM lines
ORDER BY sort_key, account;
```

## Expected result

| account | kind | budget | actual | variance | variance_pct | assessment |
| --- | --- | --- | --- | --- | --- | --- |
| Book sales | revenue | 500000 | 540000 | 40000 | 8 | favourable |
| Cafe | revenue | 120000 | 120000 | 0 | 0 | on budget |
| Gift cards | revenue | 80000 | 62000 | -18000 | -22.5 | unfavourable |
| Marketing | expense | 60000 | 48000 | -12000 | -20 | favourable |
| Rent | expense | 90000 | 90000 | 0 | 0 | on budget |
| Salaries | expense | 220000 | 231000 | 11000 | 5 | unfavourable |
| Utilities | expense | 15000 | 17500 | 2500 | 16.7 | unfavourable |
| Net profit | NULL | 315000 | 335500 | 20500 | 6.5 | favourable |

## Explanation

A variance is just `actual − budget`, but its meaning depends on the account. Book sales 40,000 above budget is good news; salaries 11,000 above budget is bad news, even though both variances are positive. Converting each variance into its effect on profit (as is for revenue, reversed for expenses) gives one consistent rule: positive is favourable.

Marketing spent 12,000 less than planned, which is favourable for profit (whether it was wise is another discussion). The net profit line pulls it together: revenue was 22,000 above budget, expenses 1,500 above, so profit beat budget by 20,500 (6.5%).

**Common mistake:** calling every positive variance favourable. Overspending on salaries and utilities then shows as good news, and the underspent marketing budget as bad.

## Wrong answers

Feedback: incorrect-output

```sql
WITH budget(account, kind, budget, actual) AS ( VALUES ('Book sales', 'revenue', 500000, 540000), ('Gift cards', 'revenue', 80000, 62000), ('Cafe', 'revenue', 120000, 120000), ('Salaries', 'expense', 220000, 231000), ('Rent', 'expense', 90000, 90000), ('Marketing', 'expense', 60000, 48000), ('Utilities', 'expense', 15000, 17500) ), lines AS (SELECT CASE kind WHEN 'revenue' THEN 0 ELSE 1 END AS sort_key, account, kind, budget, actual FROM budget UNION ALL SELECT 2, 'Net profit', NULL, SUM(CASE WHEN kind = 'revenue' THEN budget ELSE -budget END), SUM(CASE WHEN kind = 'revenue' THEN actual ELSE -actual END) FROM budget) SELECT account, kind, budget, actual, actual - budget AS variance, ROUND(100.0 * (actual - budget) / budget, 1) AS variance_pct, CASE WHEN actual > budget THEN 'favourable' WHEN actual < budget THEN 'unfavourable' ELSE 'on budget' END AS assessment FROM lines ORDER BY sort_key, account;
```
