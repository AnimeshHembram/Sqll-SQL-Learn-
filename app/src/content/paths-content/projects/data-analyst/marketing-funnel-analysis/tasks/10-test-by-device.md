---
id: mfa-10-test-by-device
title: Is the lift real, and for whom?
order: 10
difficulty: advanced
topic: Experiments
summary: Split the checkout test by device and use a two-proportion z-score to judge whether each difference is more than chance.
module: experiment
duration: 35
dataset: vidya-loop
tables:
  - sessions
  - events
orderMatters: true
checkColumnNames: true
objectives:
  - Pivot experiment groups into columns
  - Test a difference in conversion with a z-score
prerequisites:
  - Conditional aggregation
  - sqrt()
  - Common table expressions
---

## Task

A difference between two small groups can be luck. Split the test's checkout sessions (as in Task 9) by `device` and return:

- `sessions_a` and `sessions_b`, and `conversion_a_pct` and `conversion_b_pct` (one decimal),
- `lift_points`: B minus A, in percentage points, one decimal,
- `z_score`, rounded to two decimals: the two-proportion z-test,

  z = (p_B − p_A) / √( p · (1 − p) · (1/n_A + 1/n_B) )

  where p_A and p_B are the conversion rates as fractions, n_A and n_B the session counts, and p the conversion of both groups combined.

Sort by `device`. As a rule of thumb, |z| above about 2 means the difference is unlikely to be chance (roughly 95% confidence).

## Starter query

```sql
WITH checkouts AS (
  SELECT s.session_id, s.device, s.variant, MAX(e.step = 'purchase') AS purchased
  FROM sessions AS s
  JOIN events AS e ON e.session_id = s.session_id
  GROUP BY s.session_id
  HAVING MAX(e.step IN ('checkout', 'purchase')) = 1
)
SELECT device, variant, COUNT(*) AS sessions, SUM(purchased) AS purchases
FROM checkouts
WHERE variant IS NOT NULL
GROUP BY device, variant;
```

## Hints

1. Pivot the starter query: per device, `SUM(variant = 'A')` is n_A and `SUM(purchased * (variant = 'A'))` is the purchases in A. Do the same for B in one grouped CTE.
2. Work with fractions inside the formula (`1.0 * p_a / n_a`) and convert to percentages only for the output columns.
3. The pooled rate is `1.0 * (p_a + p_b) / (n_a + n_b)`. `sqrt()` is available in SQLite here.

## Solution

```sql
WITH checkouts AS (
  SELECT s.session_id, s.device, s.variant, MAX(e.step = 'purchase') AS purchased
  FROM sessions AS s
  JOIN events AS e ON e.session_id = s.session_id
  GROUP BY s.session_id
  HAVING MAX(e.step IN ('checkout', 'purchase')) = 1
),
groups AS (
  SELECT device,
         SUM(variant = 'A') AS n_a,
         SUM(purchased * (variant = 'A')) AS buy_a,
         SUM(variant = 'B') AS n_b,
         SUM(purchased * (variant = 'B')) AS buy_b
  FROM checkouts
  WHERE variant IS NOT NULL
  GROUP BY device
),
rates AS (
  SELECT device, n_a, n_b,
         1.0 * buy_a / n_a AS p_a,
         1.0 * buy_b / n_b AS p_b,
         1.0 * (buy_a + buy_b) / (n_a + n_b) AS p
  FROM groups
)
SELECT device,
       n_a AS sessions_a,
       n_b AS sessions_b,
       ROUND(100 * p_a, 1) AS conversion_a_pct,
       ROUND(100 * p_b, 1) AS conversion_b_pct,
       ROUND(100 * (p_b - p_a), 1) AS lift_points,
       ROUND((p_b - p_a) / sqrt(p * (1 - p) * (1.0 / n_a + 1.0 / n_b)), 2) AS z_score
FROM rates
ORDER BY device;
```

## Expected result

| device | sessions_a | sessions_b | conversion_a_pct | conversion_b_pct | lift_points | z_score |
| --- | --- | --- | --- | --- | --- | --- |
| desktop | 25 | 25 | 64 | 68 | 4 | 0.3 |
| mobile | 46 | 56 | 34.8 | 62.5 | 27.7 | 2.79 |

## Explanation

Conditional sums pivot the variants into columns, and a second CTE turns counts into fractions so the formula stays readable. The z-score compares the observed difference with the difference you would expect from chance alone, given the group sizes.

**What it tells the business:** the redesign works **on mobile**: conversion rises from **34.8% to 62.5% (+27.7 points, z = 2.79)**, very unlikely to be chance. **On desktop the difference is small (64.0% against 68.0%, z = 0.3)** and could easily be luck: the old page already worked there. The new page fixes the mobile problem found in Task 4, and there is no sign it hurts desktop. Recommendation: roll out variant B, mobile first.

**Common mistake:** computing the rates with whole numbers. `buy_a / n_a` in SQLite is integer division and returns 0, which turns every rate and z-score into nonsense. Multiply by `1.0` first.

## Wrong answers

Feedback: incorrect-output

```sql
WITH checkouts AS (
  SELECT s.session_id, s.device, s.variant, MAX(e.step = 'purchase') AS purchased
  FROM sessions AS s
  JOIN events AS e ON e.session_id = s.session_id
  GROUP BY s.session_id
  HAVING MAX(e.step IN ('checkout', 'purchase')) = 1
),
groups AS (
  SELECT device, SUM(variant = 'A') AS n_a, SUM(purchased * (variant = 'A')) AS buy_a, SUM(variant = 'B') AS n_b, SUM(purchased * (variant = 'B')) AS buy_b
  FROM checkouts WHERE variant IS NOT NULL GROUP BY device
),
rates AS (
  SELECT device, n_a, n_b, buy_a / n_a AS p_a, buy_b / n_b AS p_b, (buy_a + buy_b) / (n_a + n_b) AS p FROM groups
)
SELECT device, n_a AS sessions_a, n_b AS sessions_b, ROUND(100 * p_a, 1) AS conversion_a_pct, ROUND(100 * p_b, 1) AS conversion_b_pct,
       ROUND(100 * (p_b - p_a), 1) AS lift_points,
       ROUND((p_b - p_a) / sqrt(p * (1 - p) * (1.0 / n_a + 1.0 / n_b)), 2) AS z_score
FROM rates ORDER BY device;
```

Feedback: incorrect-output

```sql
WITH checkouts AS (
  SELECT s.session_id, s.device, s.variant, MAX(e.step = 'purchase') AS purchased
  FROM sessions AS s
  JOIN events AS e ON e.session_id = s.session_id
  GROUP BY s.session_id
  HAVING MAX(e.step IN ('checkout', 'purchase')) = 1
),
groups AS (
  SELECT device, SUM(variant = 'A') AS n_a, SUM(purchased * (variant = 'A')) AS buy_a, SUM(variant = 'B') AS n_b, SUM(purchased * (variant = 'B')) AS buy_b
  FROM checkouts WHERE variant IS NOT NULL GROUP BY device
),
rates AS (
  SELECT device, n_a, n_b, 1.0 * buy_a / n_a AS p_a, 1.0 * buy_b / n_b AS p_b, 1.0 * (buy_a + buy_b) / (n_a + n_b) AS p FROM groups
)
SELECT device, n_a AS sessions_a, n_b AS sessions_b, ROUND(100 * p_a, 1) AS conversion_a_pct, ROUND(100 * p_b, 1) AS conversion_b_pct,
       ROUND(100 * (p_b - p_a), 1) AS lift_points,
       ROUND((p_b - p_a) / sqrt(p * (1 - p) * (1.0 / n_a + 1.0 / n_b)) / 100, 2) AS z_score
FROM rates ORDER BY device;
```
