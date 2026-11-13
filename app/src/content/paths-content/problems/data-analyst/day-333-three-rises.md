---
id: da-day-333
title: Products whose sales rose three months in a row
order: 333
difficulty: advanced
topic: Interview practice
summary: Find runs of consecutive monthly increases of at least three, treating a missing month as a break.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Detect consecutive increases
  - Group a run of flagged rows
prerequisites:
  - Day 190
  - Day 261
---

## Task

Find products whose unit sales **rose in three consecutive months** at some point (starter query): month 2 above month 1, month 3 above month 2 and month 4 above month 3. Months must be consecutive calendar months; a missing month breaks the run, and an equal month is not a rise.

Return `product`, `run_start` (the month the first rise was measured in) and `run_end` (the month of the last rise in the run), one row per run of three or more rises. Sort by `product`, then `run_start`.

## Starter query

```sql
WITH monthly(product, month, units) AS (
  VALUES
    ('Atlas', '2025-01', 100), ('Atlas', '2025-02', 110), ('Atlas', '2025-03', 125), ('Atlas', '2025-04', 140), ('Atlas', '2025-05', 135),
    ('Beacon', '2025-01', 80), ('Beacon', '2025-02', 75), ('Beacon', '2025-03', 90), ('Beacon', '2025-04', 95), ('Beacon', '2025-05', 99),
    ('Comet', '2025-01', 60), ('Comet', '2025-02', 60), ('Comet', '2025-03', 65), ('Comet', '2025-04', 70), ('Comet', '2025-05', 68),
    ('Delta', '2025-02', 10), ('Delta', '2025-03', 20), ('Delta', '2025-05', 40)
)
SELECT product, month, units
FROM monthly
ORDER BY product, month;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Mark each month that is a rise: the previous row (`LAG`) is the immediately preceding calendar month (`date(month || '-01', '-1 month')`) and had fewer units.
3. Rises in a row form islands: give each rise a key with `ROW_NUMBER()` subtracted from a month index such as `year * 12 + month`, then group and keep runs of 3 or more.

## Solution

```sql
WITH monthly(product, month, units) AS (
  VALUES
    ('Atlas', '2025-01', 100), ('Atlas', '2025-02', 110), ('Atlas', '2025-03', 125), ('Atlas', '2025-04', 140), ('Atlas', '2025-05', 135),
    ('Beacon', '2025-01', 80), ('Beacon', '2025-02', 75), ('Beacon', '2025-03', 90), ('Beacon', '2025-04', 95), ('Beacon', '2025-05', 99),
    ('Comet', '2025-01', 60), ('Comet', '2025-02', 60), ('Comet', '2025-03', 65), ('Comet', '2025-04', 70), ('Comet', '2025-05', 68),
    ('Delta', '2025-02', 10), ('Delta', '2025-03', 20), ('Delta', '2025-05', 40)
),
flagged AS (
  SELECT product, month, units,
    LAG(month) OVER (PARTITION BY product ORDER BY month) AS prev_month,
    LAG(units) OVER (PARTITION BY product ORDER BY month) AS prev_units
  FROM monthly
),
rises AS (
  SELECT product, month,
    CAST(SUBSTR(month, 1, 4) AS INTEGER) * 12 + CAST(SUBSTR(month, 6, 2) AS INTEGER)
      - ROW_NUMBER() OVER (PARTITION BY product ORDER BY month) AS run_key
  FROM flagged
  WHERE prev_month = strftime('%Y-%m', date(month || '-01', '-1 month')) AND units > prev_units
)
SELECT product, MIN(month) AS run_start, MAX(month) AS run_end
FROM rises
GROUP BY product, run_key
HAVING COUNT(*) >= 3
ORDER BY product, run_start;
```

## Expected result

| product | run_start | run_end |
| --- | --- | --- |
| Atlas | 2025-02 | 2025-04 |
| Beacon | 2025-03 | 2025-05 |

## Explanation

Consecutive increases need two checks per row: the previous row must be the immediately previous **calendar** month, and the units must be higher. `LAG` gives both. Delta's sales go 10, 20, then a missing April, then 40: the missing month breaks the run, so Delta never has three rises in a row.

Once rises are flagged, they form islands: numbering the months as `year × 12 + month` and subtracting a row number gives a constant key through each run of consecutive rises. Atlas rose in February, March and April (then fell in May); Beacon dipped in February and then rose three times. Comet's flat February is not a rise.

**Common mistake:** treating equal months as rises and ignoring gaps. Comet's flat month and Delta's missing April no longer break the runs, so products with no real three-month climb are reported.

## Wrong answers

Feedback: extra-rows

```sql
WITH monthly(product, month, units) AS ( VALUES ('Atlas', '2025-01', 100), ('Atlas', '2025-02', 110), ('Atlas', '2025-03', 125), ('Atlas', '2025-04', 140), ('Atlas', '2025-05', 135), ('Beacon', '2025-01', 80), ('Beacon', '2025-02', 75), ('Beacon', '2025-03', 90), ('Beacon', '2025-04', 95), ('Beacon', '2025-05', 99), ('Comet', '2025-01', 60), ('Comet', '2025-02', 60), ('Comet', '2025-03', 65), ('Comet', '2025-04', 70), ('Comet', '2025-05', 68), ('Delta', '2025-02', 10), ('Delta', '2025-03', 20), ('Delta', '2025-05', 40) ), flagged AS (SELECT product, month, units, LAG(units) OVER (PARTITION BY product ORDER BY month) AS prev_units FROM monthly), rises AS (SELECT product, month, ROW_NUMBER() OVER (PARTITION BY product ORDER BY month) - ROW_NUMBER() OVER (PARTITION BY product, units >= prev_units ORDER BY month) AS run_key FROM flagged WHERE units >= prev_units) SELECT product, MIN(month) AS run_start, MAX(month) AS run_end FROM rises GROUP BY product, run_key HAVING COUNT(*) >= 3 ORDER BY product, run_start;
```
