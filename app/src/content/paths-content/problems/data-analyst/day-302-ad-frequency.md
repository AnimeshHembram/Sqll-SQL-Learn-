---
id: da-day-302
title: How many ad impressions are too many?
order: 302
difficulty: intermediate
topic: Marketing analytics
summary: Group users by how often they saw an ad and compare conversion rates per frequency band.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Band users by exposure
  - Measure efficiency per conversion
prerequisites:
  - Day 245
  - Day 155
---

## Task

A display campaign showed ads to users on several days (starter query). Band users by how many impressions they saw: `'1'`, `'2-3'`, `'4-5'` and `'6+'`. For each band, return `frequency`, `users`, `converted` and `conversion_pct` (rounded to 1 decimal place), plus `impressions` (total impressions in the band) and `impressions_per_conversion` (rounded to 1 decimal place, `NULL` with no conversions). Sort from the lowest band to the highest.

## Starter query

```sql
WITH impressions(user_id, shown_on) AS (
  VALUES
    (1, '2025-03-01'), (2, '2025-03-01'), (2, '2025-03-02'), (3, '2025-03-01'), (3, '2025-03-02'), (3, '2025-03-03'),
    (4, '2025-03-01'), (4, '2025-03-02'), (4, '2025-03-03'), (4, '2025-03-04'), (4, '2025-03-05'), (4, '2025-03-06'),
    (5, '2025-03-01'), (6, '2025-03-02'), (6, '2025-03-03'), (7, '2025-03-01'), (7, '2025-03-02'), (7, '2025-03-03'), (7, '2025-03-04'),
    (8, '2025-03-01'), (8, '2025-03-02'), (8, '2025-03-03'), (8, '2025-03-04'), (8, '2025-03-05'), (8, '2025-03-06'), (8, '2025-03-07'), (8, '2025-03-08'),
    (9, '2025-03-05'), (10, '2025-03-05'), (10, '2025-03-06'), (10, '2025-03-07')
),
conversions(user_id) AS (
  VALUES (2), (3), (6), (7), (10)
)
SELECT user_id, COUNT(*) AS impressions
FROM impressions
GROUP BY user_id
ORDER BY user_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Count impressions per user, mark conversions with a `LEFT JOIN` to `conversions` (`c.user_id IS NOT NULL`), and band the counts with `CASE` and a band order.
3. Per band: `COUNT(*)`, `SUM(converted)`, `SUM(impressions)` and `SUM(impressions) / NULLIF(SUM(converted), 0)`.

## Solution

```sql
WITH impressions(user_id, shown_on) AS (
  VALUES
    (1, '2025-03-01'), (2, '2025-03-01'), (2, '2025-03-02'), (3, '2025-03-01'), (3, '2025-03-02'), (3, '2025-03-03'),
    (4, '2025-03-01'), (4, '2025-03-02'), (4, '2025-03-03'), (4, '2025-03-04'), (4, '2025-03-05'), (4, '2025-03-06'),
    (5, '2025-03-01'), (6, '2025-03-02'), (6, '2025-03-03'), (7, '2025-03-01'), (7, '2025-03-02'), (7, '2025-03-03'), (7, '2025-03-04'),
    (8, '2025-03-01'), (8, '2025-03-02'), (8, '2025-03-03'), (8, '2025-03-04'), (8, '2025-03-05'), (8, '2025-03-06'), (8, '2025-03-07'), (8, '2025-03-08'),
    (9, '2025-03-05'), (10, '2025-03-05'), (10, '2025-03-06'), (10, '2025-03-07')
),
conversions(user_id) AS (
  VALUES (2), (3), (6), (7), (10)
),
per_user AS (
  SELECT i.user_id, COUNT(*) AS impressions, MAX(c.user_id IS NOT NULL) AS converted
  FROM impressions AS i
  LEFT JOIN conversions AS c ON c.user_id = i.user_id
  GROUP BY i.user_id
),
banded AS (
  SELECT impressions, converted,
    CASE WHEN impressions >= 6 THEN 4 WHEN impressions >= 4 THEN 3 WHEN impressions >= 2 THEN 2 ELSE 1 END AS band
  FROM per_user
)
SELECT CASE band WHEN 1 THEN '1' WHEN 2 THEN '2-3' WHEN 3 THEN '4-5' ELSE '6+' END AS frequency,
  COUNT(*) AS users, SUM(converted) AS converted, ROUND(100.0 * SUM(converted) / COUNT(*), 1) AS conversion_pct,
  SUM(impressions) AS impressions, ROUND(1.0 * SUM(impressions) / NULLIF(SUM(converted), 0), 1) AS impressions_per_conversion
FROM banded
GROUP BY band
ORDER BY band;
```

## Expected result

| frequency | users | converted | conversion_pct | impressions | impressions_per_conversion |
| --- | --- | --- | --- | --- | --- |
| 1 | 3 | 0 | 0 | 3 | NULL |
| 2-3 | 4 | 4 | 100 | 10 | 2.5 |
| 4-5 | 1 | 1 | 100 | 4 | 4 |
| 6+ | 2 | 0 | 0 | 14 | NULL |

## Explanation

Frequency analysis asks whether seeing an ad more often helps. Here two or three impressions converted every user, while users who saw it six or more times never converted: 14 impressions were spent on two users who were never going to buy. That is the classic argument for a **frequency cap**, around 3 to 5 impressions per user for this campaign.

Conversion is measured per user (`users` in the band), not per impression, because a conversion is a user decision. Impressions per conversion then shows efficiency: 2.5 impressions per sale in the 2-3 band, but infinitely many in the 6+ band, shown as `NULL` because there were no conversions to divide by.

**Common mistake:** dividing conversions by impressions. Bands with many impressions per user look worse simply because their denominators are bigger, mixing two effects into one number.

## Wrong answers

Feedback: incorrect-output

```sql
WITH impressions(user_id, shown_on) AS ( VALUES (1, '2025-03-01'), (2, '2025-03-01'), (2, '2025-03-02'), (3, '2025-03-01'), (3, '2025-03-02'), (3, '2025-03-03'), (4, '2025-03-01'), (4, '2025-03-02'), (4, '2025-03-03'), (4, '2025-03-04'), (4, '2025-03-05'), (4, '2025-03-06'), (5, '2025-03-01'), (6, '2025-03-02'), (6, '2025-03-03'), (7, '2025-03-01'), (7, '2025-03-02'), (7, '2025-03-03'), (7, '2025-03-04'), (8, '2025-03-01'), (8, '2025-03-02'), (8, '2025-03-03'), (8, '2025-03-04'), (8, '2025-03-05'), (8, '2025-03-06'), (8, '2025-03-07'), (8, '2025-03-08'), (9, '2025-03-05'), (10, '2025-03-05'), (10, '2025-03-06'), (10, '2025-03-07') ), conversions(user_id) AS ( VALUES (2), (3), (6), (7), (10) ), per_user AS (SELECT i.user_id, COUNT(*) AS impressions, MAX(c.user_id IS NOT NULL) AS converted FROM impressions AS i LEFT JOIN conversions AS c ON c.user_id = i.user_id GROUP BY i.user_id), banded AS (SELECT impressions, converted, CASE WHEN impressions >= 6 THEN 4 WHEN impressions >= 4 THEN 3 WHEN impressions >= 2 THEN 2 ELSE 1 END AS band FROM per_user) SELECT CASE band WHEN 1 THEN '1' WHEN 2 THEN '2-3' WHEN 3 THEN '4-5' ELSE '6+' END AS frequency, COUNT(*) AS users, SUM(converted) AS converted, ROUND(100.0 * SUM(converted) / SUM(impressions), 1) AS conversion_pct, SUM(impressions) AS impressions, ROUND(1.0 * SUM(impressions) / NULLIF(SUM(converted), 0), 1) AS impressions_per_conversion FROM banded GROUP BY band ORDER BY band;
```
