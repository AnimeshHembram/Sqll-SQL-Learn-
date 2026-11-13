---
id: da-day-308
title: Delivery promises kept by zone
order: 308
difficulty: intermediate
topic: E-commerce
summary: Map pincodes to zones by prefix, measure on-time delivery against each zone's promise, and catch unmapped pincodes.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Map codes by prefix
  - Measure promises kept per segment
prerequisites:
  - Day 147
  - Day 231
---

## Task

Each shipment's delivery zone comes from the **first three digits** of its pincode (starter query); each zone promises delivery within a number of days of shipping. A shipment is **on time** if delivered within the promise; undelivered shipments are not on time. Pincodes whose prefix is not in the zone table go in zone `'unmapped'`.

For each zone, return `zone`, `shipments`, `delivered`, `on_time_pct` (rounded to 1 decimal place, `NULL` for unmapped) and `avg_days` (average days to deliver among delivered shipments, rounded to 1 decimal place). Sort by `zone`.

## Starter query

```sql
WITH zones(pincode_prefix, zone, promise_days) AS (
  VALUES ('560', 'metro', 2), ('110', 'metro', 2), ('302', 'tier 2', 4), ('682', 'tier 2', 4), ('796', 'remote', 7)
),
shipments(shipment, pincode, shipped_on, delivered_on) AS (
  VALUES
    (1, '560034', '2025-03-01', '2025-03-03'), (2, '560102', '2025-03-01', '2025-03-04'), (3, '110017', '2025-03-02', '2025-03-03'),
    (4, '302001', '2025-03-02', '2025-03-05'), (5, '302018', '2025-03-03', '2025-03-09'), (6, '682016', '2025-03-03', '2025-03-07'),
    (7, '796001', '2025-03-04', '2025-03-10'), (8, '796005', '2025-03-04', NULL), (9, '400001', '2025-03-05', '2025-03-07')
)
SELECT shipment, pincode, shipped_on, delivered_on
FROM shipments
ORDER BY shipment;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `LEFT JOIN zones AS z ON z.pincode_prefix = SUBSTR(s.pincode, 1, 3)`; `COALESCE(z.zone, 'unmapped')` labels the rest.
3. On time: `delivered_on IS NOT NULL AND julianday(delivered_on) - julianday(shipped_on) <= promise_days`. For the unmapped zone the promise is unknown, so the rate is `NULL`.

## Solution

```sql
WITH zones(pincode_prefix, zone, promise_days) AS (
  VALUES ('560', 'metro', 2), ('110', 'metro', 2), ('302', 'tier 2', 4), ('682', 'tier 2', 4), ('796', 'remote', 7)
),
shipments(shipment, pincode, shipped_on, delivered_on) AS (
  VALUES
    (1, '560034', '2025-03-01', '2025-03-03'), (2, '560102', '2025-03-01', '2025-03-04'), (3, '110017', '2025-03-02', '2025-03-03'),
    (4, '302001', '2025-03-02', '2025-03-05'), (5, '302018', '2025-03-03', '2025-03-09'), (6, '682016', '2025-03-03', '2025-03-07'),
    (7, '796001', '2025-03-04', '2025-03-10'), (8, '796005', '2025-03-04', NULL), (9, '400001', '2025-03-05', '2025-03-07')
),
mapped AS (
  SELECT COALESCE(z.zone, 'unmapped') AS zone, z.promise_days, s.delivered_on,
    julianday(s.delivered_on) - julianday(s.shipped_on) AS days
  FROM shipments AS s
  LEFT JOIN zones AS z ON z.pincode_prefix = SUBSTR(s.pincode, 1, 3)
)
SELECT zone, COUNT(*) AS shipments, COUNT(delivered_on) AS delivered,
  CASE WHEN zone = 'unmapped' THEN NULL ELSE ROUND(100.0 * SUM(delivered_on IS NOT NULL AND days <= promise_days) / COUNT(*), 1) END AS on_time_pct,
  ROUND(AVG(days), 1) AS avg_days
FROM mapped
GROUP BY zone
ORDER BY zone;
```

## Expected result

| zone | shipments | delivered | on_time_pct | avg_days |
| --- | --- | --- | --- | --- |
| metro | 3 | 3 | 66.7 | 2 |
| remote | 2 | 1 | 50 | 6 |
| tier 2 | 3 | 3 | 66.7 | 4.3 |
| unmapped | 1 | 1 | NULL | 2 |

## Explanation

Delivery zones are set by the first digits of the pincode, so the join is on `SUBSTR(pincode, 1, 3)`. The `LEFT JOIN` keeps shipments whose prefix is not in the zone table; the Mumbai pincode `400001` is one, which means the zone table needs an update before the shop promises anything there.

Each zone has its own promise, so on-time is judged against it: a metro delivery in 3 days is late, a remote one in 6 days is on time. One remote shipment is still undelivered and counts as not on time, but it does not enter the average days, which only describes delivered shipments. The unmapped zone gets no on-time rate, because there is no promise to compare with.

**Common mistake:** joining zones with an inner join. The unmapped shipment disappears, and nobody notices the gap in the zone table.

## Wrong answers

Feedback: missing-rows

```sql
WITH zones(pincode_prefix, zone, promise_days) AS ( VALUES ('560', 'metro', 2), ('110', 'metro', 2), ('302', 'tier 2', 4), ('682', 'tier 2', 4), ('796', 'remote', 7) ), shipments(shipment, pincode, shipped_on, delivered_on) AS ( VALUES (1, '560034', '2025-03-01', '2025-03-03'), (2, '560102', '2025-03-01', '2025-03-04'), (3, '110017', '2025-03-02', '2025-03-03'), (4, '302001', '2025-03-02', '2025-03-05'), (5, '302018', '2025-03-03', '2025-03-09'), (6, '682016', '2025-03-03', '2025-03-07'), (7, '796001', '2025-03-04', '2025-03-10'), (8, '796005', '2025-03-04', NULL), (9, '400001', '2025-03-05', '2025-03-07') ), mapped AS (SELECT z.zone, z.promise_days, s.delivered_on, julianday(s.delivered_on) - julianday(s.shipped_on) AS days FROM shipments AS s JOIN zones AS z ON z.pincode_prefix = SUBSTR(s.pincode, 1, 3)) SELECT zone, COUNT(*) AS shipments, COUNT(delivered_on) AS delivered, ROUND(100.0 * SUM(delivered_on IS NOT NULL AND days <= promise_days) / COUNT(*), 1) AS on_time_pct, ROUND(AVG(days), 1) AS avg_days FROM mapped GROUP BY zone ORDER BY zone;
```
