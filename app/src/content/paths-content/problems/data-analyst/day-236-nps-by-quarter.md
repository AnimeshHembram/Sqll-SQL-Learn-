---
id: da-day-236
title: Case study: net promoter score by quarter
order: 236
difficulty: advanced
topic: Case studies
summary: Classify survey scores, compute NPS per quarter and show how it moved from the quarter before.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute NPS
  - Track a metric quarter over quarter
prerequisites:
  - Day 216
  - Day 44
---

## Task

Customer survey scores (0 to 10) are in the starter query. Classify each response: **promoter** (9 or 10), **passive** (7 or 8) or **detractor** (0 to 6). For each calendar quarter, report:

- `quarter` (like `'2024-Q4'`) and `responses`,
- `promoters_pct` and `detractors_pct` (shares of the quarter's responses),
- `nps`: `promoters_pct − detractors_pct`,
- `nps_change`: the change in NPS from the previous quarter (`NULL` for the first).

Round all percentages and NPS values to 1 decimal place (compute the change from unrounded values). Sort by `quarter`.

## Starter query

```sql
WITH responses(responded_on, score) AS (
  VALUES
    ('2024-10-03', 9), ('2024-10-15', 10), ('2024-11-02', 6), ('2024-11-20', 8), ('2024-12-01', 3), ('2024-12-12', 9),
    ('2025-01-05', 10), ('2025-01-19', 9), ('2025-02-03', 7), ('2025-02-14', 10), ('2025-03-01', 5), ('2025-03-22', 9), ('2025-03-30', 8),
    ('2025-04-02', 4), ('2025-04-10', 6), ('2025-05-05', 9), ('2025-06-01', 10)
)
SELECT responded_on, score
FROM responses
ORDER BY responded_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Quarter label: `strftime('%Y', d) || '-Q' || ((CAST(strftime('%m', d) AS INTEGER) + 2) / 3)`.
3. Per quarter: `100.0 * SUM(score >= 9) / COUNT(*)` and `100.0 * SUM(score <= 6) / COUNT(*)`. Compute NPS in a CTE, then `nps - LAG(nps) OVER (ORDER BY quarter)` and round at the end.

## Solution

```sql
WITH responses(responded_on, score) AS (
  VALUES
    ('2024-10-03', 9), ('2024-10-15', 10), ('2024-11-02', 6), ('2024-11-20', 8), ('2024-12-01', 3), ('2024-12-12', 9),
    ('2025-01-05', 10), ('2025-01-19', 9), ('2025-02-03', 7), ('2025-02-14', 10), ('2025-03-01', 5), ('2025-03-22', 9), ('2025-03-30', 8),
    ('2025-04-02', 4), ('2025-04-10', 6), ('2025-05-05', 9), ('2025-06-01', 10)
),
labelled AS (
  SELECT score, strftime('%Y', responded_on) || '-Q' || ((CAST(strftime('%m', responded_on) AS INTEGER) + 2) / 3) AS quarter
  FROM responses
),
quarters AS (
  SELECT quarter, COUNT(*) AS responses,
    100.0 * SUM(score >= 9) / COUNT(*) AS promoters_pct,
    100.0 * SUM(score <= 6) / COUNT(*) AS detractors_pct
  FROM labelled
  GROUP BY quarter
),
scored AS (
  SELECT quarter, responses, promoters_pct, detractors_pct, promoters_pct - detractors_pct AS nps FROM quarters
)
SELECT quarter, responses, ROUND(promoters_pct, 1) AS promoters_pct, ROUND(detractors_pct, 1) AS detractors_pct, ROUND(nps, 1) AS nps,
  ROUND(nps - LAG(nps) OVER (ORDER BY quarter), 1) AS nps_change
FROM scored
ORDER BY quarter;
```

## Expected result

| quarter | responses | promoters_pct | detractors_pct | nps | nps_change |
| --- | --- | --- | --- | --- | --- |
| 2024-Q4 | 6 | 50 | 33.3 | 16.7 | NULL |
| 2025-Q1 | 7 | 57.1 | 14.3 | 42.9 | 26.2 |
| 2025-Q2 | 4 | 50 | 50 | 0 | -42.9 |

## Explanation

NPS is the share of promoters minus the share of detractors, so it runs from −100 to +100; passives (7 and 8) count in the total but in neither group. In Q4 2024, half the responses were promoters and a third detractors: NPS 16.7. Q1 2025 improved to 42.9, and Q2 dropped to 0, as half of the Q2 responses were detractors.

The change is computed from unrounded values with `LAG`, so it matches the difference of the exact scores (Q1 up 26.2, Q2 down 42.9). With only 4 to 7 responses per quarter, one answer moves the score by 14 to 25 points, so these swings say more about sample size than about customers; the report should show `responses` next to the score, as it does.

**Common mistake:** counting 7 as a detractor (`score <= 7`). The standard bands are 0 to 6, 7 to 8 and 9 to 10, and shifting one band makes every NPS lower.

## Wrong answers

Feedback: incorrect-output

```sql
WITH responses(responded_on, score) AS ( VALUES ('2024-10-03', 9), ('2024-10-15', 10), ('2024-11-02', 6), ('2024-11-20', 8), ('2024-12-01', 3), ('2024-12-12', 9), ('2025-01-05', 10), ('2025-01-19', 9), ('2025-02-03', 7), ('2025-02-14', 10), ('2025-03-01', 5), ('2025-03-22', 9), ('2025-03-30', 8), ('2025-04-02', 4), ('2025-04-10', 6), ('2025-05-05', 9), ('2025-06-01', 10) ), labelled AS (SELECT score, strftime('%Y', responded_on) || '-Q' || ((CAST(strftime('%m', responded_on) AS INTEGER) + 2) / 3) AS quarter FROM responses), q AS (SELECT quarter, COUNT(*) AS responses, 100.0 * SUM(score >= 9) / COUNT(*) AS p, 100.0 * SUM(score <= 7) / COUNT(*) AS d FROM labelled GROUP BY quarter) SELECT quarter, responses, ROUND(p, 1) AS promoters_pct, ROUND(d, 1) AS detractors_pct, ROUND(p - d, 1) AS nps, ROUND((p - d) - LAG(p - d) OVER (ORDER BY quarter), 1) AS nps_change FROM q ORDER BY quarter;
```
