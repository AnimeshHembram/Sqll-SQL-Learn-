---
id: da-day-147
title: Case study: courier delivery performance
order: 147
difficulty: advanced
topic: Case studies
summary: Judge on-time delivery as of a date, average only the late ones, and find each courier's worst region.
module: data-analyst
duration: 18
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Judge open items as of a date
  - Combine conditional aggregates and ranked groups
prerequisites:
  - Day 114
  - Day 102
---

## Task

Operations compares couriers **as of 2025-03-31** (data in the starter query):

- A delivered shipment is **on time** if delivered on or before `promised_on`; otherwise it is late by the days between the two dates.
- An undelivered shipment whose promise date has passed is **late** by the days from `promised_on` to 2025-03-31. An undelivered shipment not yet due is left out.

For each courier, return `courier`, `shipments` (judged ones), `on_time_pct` (rounded to 1 decimal place), `avg_delay_days` (average delay of **late** shipments, rounded to 1 decimal place, `NULL` if none) and `worst_region` (the region with the most late shipments; ties go to the alphabetically first region; `NULL` if none are late). Sort by `courier`.

## Starter query

```sql
WITH shipments(id, courier, region, shipped_on, promised_on, delivered_on) AS (
  VALUES
    (1, 'FastShip', 'North', '2025-03-01', '2025-03-04', '2025-03-03'),
    (2, 'FastShip', 'North', '2025-03-02', '2025-03-05', '2025-03-07'),
    (3, 'FastShip', 'South', '2025-03-03', '2025-03-06', '2025-03-06'),
    (4, 'FastShip', 'South', '2025-03-20', '2025-03-25', NULL),
    (5, 'FastShip', 'North', '2025-03-28', '2025-04-02', NULL),
    (6, 'ParcelGo', 'North', '2025-03-01', '2025-03-03', '2025-03-03'),
    (7, 'ParcelGo', 'South', '2025-03-05', '2025-03-08', '2025-03-12'),
    (8, 'ParcelGo', 'South', '2025-03-10', '2025-03-12', '2025-03-13'),
    (9, 'ParcelGo', 'North', '2025-03-15', '2025-03-18', '2025-03-17'),
    (10, 'QuickBox', 'East', '2025-03-10', '2025-03-13', '2025-03-12')
)
SELECT id, courier, region, promised_on, delivered_on
FROM shipments
ORDER BY courier, id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. In a CTE, compute each judged shipment's delay: `julianday(COALESCE(delivered_on, '2025-03-31')) - julianday(promised_on)`, and leave out undelivered shipments with `promised_on >= '2025-03-31'`. Late means delay > 0.
3. For the worst region, count late shipments per courier and region and keep the first by `ROW_NUMBER() OVER (PARTITION BY courier ORDER BY late_count DESC, region)`. `LEFT JOIN` it to the per-courier summary.

## Solution

```sql
WITH shipments(id, courier, region, shipped_on, promised_on, delivered_on) AS (
  VALUES
    (1, 'FastShip', 'North', '2025-03-01', '2025-03-04', '2025-03-03'),
    (2, 'FastShip', 'North', '2025-03-02', '2025-03-05', '2025-03-07'),
    (3, 'FastShip', 'South', '2025-03-03', '2025-03-06', '2025-03-06'),
    (4, 'FastShip', 'South', '2025-03-20', '2025-03-25', NULL),
    (5, 'FastShip', 'North', '2025-03-28', '2025-04-02', NULL),
    (6, 'ParcelGo', 'North', '2025-03-01', '2025-03-03', '2025-03-03'),
    (7, 'ParcelGo', 'South', '2025-03-05', '2025-03-08', '2025-03-12'),
    (8, 'ParcelGo', 'South', '2025-03-10', '2025-03-12', '2025-03-13'),
    (9, 'ParcelGo', 'North', '2025-03-15', '2025-03-18', '2025-03-17'),
    (10, 'QuickBox', 'East', '2025-03-10', '2025-03-13', '2025-03-12')
),
judged AS (
  SELECT courier, region,
    CAST(julianday(COALESCE(delivered_on, '2025-03-31')) - julianday(promised_on) AS INTEGER) AS delay
  FROM shipments
  WHERE delivered_on IS NOT NULL OR promised_on < '2025-03-31'
),
late_regions AS (
  SELECT courier, region,
    ROW_NUMBER() OVER (PARTITION BY courier ORDER BY COUNT(*) DESC, region) AS n
  FROM judged
  WHERE delay > 0
  GROUP BY courier, region
),
summary AS (
  SELECT courier,
    COUNT(*) AS shipments,
    ROUND(100.0 * SUM(CASE WHEN delay <= 0 THEN 1 ELSE 0 END) / COUNT(*), 1) AS on_time_pct,
    ROUND(AVG(CASE WHEN delay > 0 THEN delay END), 1) AS avg_delay_days
  FROM judged
  GROUP BY courier
)
SELECT s.courier, s.shipments, s.on_time_pct, s.avg_delay_days, r.region AS worst_region
FROM summary AS s
LEFT JOIN late_regions AS r ON r.courier = s.courier AND r.n = 1
ORDER BY s.courier;
```

## Expected result

| courier | shipments | on_time_pct | avg_delay_days | worst_region |
| --- | --- | --- | --- | --- |
| FastShip | 4 | 50 | 4 | North |
| ParcelGo | 4 | 50 | 2.5 | South |
| QuickBox | 1 | 100 | NULL | NULL |

## Explanation

Three ideas are combined here. **Judging as of a date** treats an overdue undelivered parcel as late now (shipment 4 is 6 days late and counting), while one not yet due (shipment 5) cannot be judged. **Conditional averages** (`AVG(CASE WHEN delay > 0 THEN delay END)`) average only the late shipments, because `AVG` skips the `NULL`s. **Ranking aggregated groups** picks the worst region, with a tie-break so the answer is stable.

FastShip and ParcelGo are both on time half the time, but FastShip's late parcels are later (4.0 days against 2.5). FastShip's late shipments are split evenly between North and South, so the tie-break names North. QuickBox has no late shipments, so its delay and worst region are `NULL`.

**Common mistake:** averaging the delay over all shipments, including on-time ones with negative or zero delays, which makes lateness look smaller than it is.

## Wrong answers

Feedback: incorrect-output

```sql
WITH shipments(id, courier, region, shipped_on, promised_on, delivered_on) AS ( VALUES (1, 'FastShip', 'North', '2025-03-01', '2025-03-04', '2025-03-03'), (2, 'FastShip', 'North', '2025-03-02', '2025-03-05', '2025-03-07'), (3, 'FastShip', 'South', '2025-03-03', '2025-03-06', '2025-03-06'), (4, 'FastShip', 'South', '2025-03-20', '2025-03-25', NULL), (5, 'FastShip', 'North', '2025-03-28', '2025-04-02', NULL), (6, 'ParcelGo', 'North', '2025-03-01', '2025-03-03', '2025-03-03'), (7, 'ParcelGo', 'South', '2025-03-05', '2025-03-08', '2025-03-12'), (8, 'ParcelGo', 'South', '2025-03-10', '2025-03-12', '2025-03-13'), (9, 'ParcelGo', 'North', '2025-03-15', '2025-03-18', '2025-03-17'), (10, 'QuickBox', 'East', '2025-03-10', '2025-03-13', '2025-03-12') ), judged AS (SELECT courier, region, CAST(julianday(COALESCE(delivered_on, '2025-03-31')) - julianday(promised_on) AS INTEGER) AS delay FROM shipments WHERE delivered_on IS NOT NULL OR promised_on < '2025-03-31'), late_regions AS (SELECT courier, region, ROW_NUMBER() OVER (PARTITION BY courier ORDER BY COUNT(*) DESC, region) AS n FROM judged WHERE delay > 0 GROUP BY courier, region), summary AS (SELECT courier, COUNT(*) AS shipments, ROUND(100.0 * SUM(CASE WHEN delay <= 0 THEN 1 ELSE 0 END) / COUNT(*), 1) AS on_time_pct, ROUND(AVG(delay), 1) AS avg_delay_days FROM judged GROUP BY courier) SELECT s.courier, s.shipments, s.on_time_pct, s.avg_delay_days, r.region AS worst_region FROM summary AS s LEFT JOIN late_regions AS r ON r.courier = s.courier AND r.n = 1 ORDER BY s.courier;
```
