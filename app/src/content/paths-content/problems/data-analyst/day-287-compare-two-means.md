---
id: da-day-287
title: Is the new checkout's order value really higher?
order: 287
difficulty: advanced
topic: Statistics
summary: Compare two group means with their standard errors and a Welch t-statistic.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute standard errors
  - Test a difference of means
prerequisites:
  - Day 191
  - Day 227
---

## Task

Average order value in the old and new checkout (starter query) differs, but are the groups big enough to trust it? For each group compute `n`, `mean`, the sample standard deviation `sd` (divide by `n − 1`) and the standard error `se = sd / √n`. Then the **Welch t-statistic** is `(mean_new − mean_old) / √(se_new² + se_old²)`; values above about 2 suggest a real difference.

Return one row per group (`grp`, `n`, `mean`, `sd`, `se`; `t_stat` `NULL`) and a final row `grp` = `'difference'` with `mean` = mean_new − mean_old and `t_stat`, others `NULL`. Round everything to 2 decimal places. Order: `old_checkout`, `new_checkout`, `difference`.

## Starter query

```sql
WITH order_values(grp, order_value) AS (
  VALUES
    ('old_checkout', 520), ('old_checkout', 610), ('old_checkout', 480), ('old_checkout', 700), ('old_checkout', 550),
    ('old_checkout', 590), ('old_checkout', 630), ('old_checkout', 510),
    ('new_checkout', 640), ('new_checkout', 720), ('new_checkout', 580), ('new_checkout', 690), ('new_checkout', 760),
    ('new_checkout', 610), ('new_checkout', 700), ('new_checkout', 650), ('new_checkout', 680), ('new_checkout', 740)
)
SELECT grp, order_value
FROM order_values
ORDER BY grp, order_value;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Per group: `COUNT(*)`, `AVG(order_value)`, then in a second CTE the variance `SUM((x - mean) * (x - mean)) / (n - 1)` by joining rows to their group's mean.
3. Pick each group's values with scalar subqueries (or conditional `MAX`) to compute the difference and `t = diff / SQRT(se_new * se_new + se_old * se_old)`; stack the three rows with `UNION ALL` and a sort key.

## Solution

```sql
WITH order_values(grp, order_value) AS (
  VALUES
    ('old_checkout', 520), ('old_checkout', 610), ('old_checkout', 480), ('old_checkout', 700), ('old_checkout', 550),
    ('old_checkout', 590), ('old_checkout', 630), ('old_checkout', 510),
    ('new_checkout', 640), ('new_checkout', 720), ('new_checkout', 580), ('new_checkout', 690), ('new_checkout', 760),
    ('new_checkout', 610), ('new_checkout', 700), ('new_checkout', 650), ('new_checkout', 680), ('new_checkout', 740)
),
means AS (
  SELECT grp, COUNT(*) AS n, AVG(order_value) AS mean FROM order_values GROUP BY grp
),
stats AS (
  SELECT m.grp, m.n, m.mean, SQRT(SUM((o.order_value - m.mean) * (o.order_value - m.mean)) / (m.n - 1)) AS sd
  FROM order_values AS o
  JOIN means AS m ON m.grp = o.grp
  GROUP BY m.grp, m.n, m.mean
),
with_se AS (
  SELECT grp, n, mean, sd, sd / SQRT(n) AS se FROM stats
),
report AS (
  SELECT CASE grp WHEN 'old_checkout' THEN 1 ELSE 2 END AS sort_key, grp, n, mean, sd, se, NULL AS t_stat FROM with_se
  UNION ALL
  SELECT 3, 'difference', NULL,
    (SELECT mean FROM with_se WHERE grp = 'new_checkout') - (SELECT mean FROM with_se WHERE grp = 'old_checkout'), NULL, NULL,
    ((SELECT mean FROM with_se WHERE grp = 'new_checkout') - (SELECT mean FROM with_se WHERE grp = 'old_checkout'))
      / SQRT((SELECT se * se FROM with_se WHERE grp = 'new_checkout') + (SELECT se * se FROM with_se WHERE grp = 'old_checkout'))
)
SELECT grp, n, ROUND(mean, 2) AS mean, ROUND(sd, 2) AS sd, ROUND(se, 2) AS se, ROUND(t_stat, 2) AS t_stat
FROM report
ORDER BY sort_key;
```

## Expected result

| grp | n | mean | sd | se | t_stat |
| --- | --- | --- | --- | --- | --- |
| old_checkout | 8 | 573.75 | 72.69 | 25.7 | NULL |
| new_checkout | 10 | 677 | 57.16 | 18.08 | NULL |
| difference | NULL | 103.25 | NULL | NULL | 3.29 |

## Explanation

The new checkout's orders average 103.25 more, but means move around from sample to sample. The **standard error** (`sd / √n`) measures how much a mean would typically vary: 25.70 for the old group, 18.08 for the new. The Welch t-statistic divides the difference by the combined standard error, `√(se_old² + se_new²)`, which allows the groups to have different sizes and spreads.

Here t = 3.29: the difference is more than three times its standard error, so it is very unlikely to be chance (above about 2 is the usual rule of thumb). Each group's standard deviation divides by `n − 1`, because the groups are samples of all possible orders.

**Common mistake:** using the standard deviation in place of the standard error. The spread of individual orders is much larger than the uncertainty of a mean, so the t-statistic shrinks to about 1.1 and a real difference looks like noise.

## Wrong answers

Feedback: incorrect-output

```sql
WITH order_values(grp, order_value) AS ( VALUES ('old_checkout', 520), ('old_checkout', 610), ('old_checkout', 480), ('old_checkout', 700), ('old_checkout', 550), ('old_checkout', 590), ('old_checkout', 630), ('old_checkout', 510), ('new_checkout', 640), ('new_checkout', 720), ('new_checkout', 580), ('new_checkout', 690), ('new_checkout', 760), ('new_checkout', 610), ('new_checkout', 700), ('new_checkout', 650), ('new_checkout', 680), ('new_checkout', 740) ), means AS (SELECT grp, COUNT(*) AS n, AVG(order_value) AS mean FROM order_values GROUP BY grp), stats AS (SELECT m.grp, m.n, m.mean, SQRT(SUM((o.order_value - m.mean) * (o.order_value - m.mean)) / (m.n - 1)) AS sd FROM order_values AS o JOIN means AS m ON m.grp = o.grp GROUP BY m.grp, m.n, m.mean), with_se AS (SELECT grp, n, mean, sd, sd AS se FROM stats), report AS (SELECT CASE grp WHEN 'old_checkout' THEN 1 ELSE 2 END AS sort_key, grp, n, mean, sd, se, NULL AS t_stat FROM with_se UNION ALL SELECT 3, 'difference', NULL, (SELECT mean FROM with_se WHERE grp = 'new_checkout') - (SELECT mean FROM with_se WHERE grp = 'old_checkout'), NULL, NULL, ((SELECT mean FROM with_se WHERE grp = 'new_checkout') - (SELECT mean FROM with_se WHERE grp = 'old_checkout')) / SQRT((SELECT se * se FROM with_se WHERE grp = 'new_checkout') + (SELECT se * se FROM with_se WHERE grp = 'old_checkout'))) SELECT grp, n, ROUND(mean, 2) AS mean, ROUND(sd, 2) AS sd, ROUND(se, 2) AS se, ROUND(t_stat, 2) AS t_stat FROM report ORDER BY sort_key;
```
