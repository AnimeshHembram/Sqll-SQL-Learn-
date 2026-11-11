---
id: da-day-102
title: How long each shipment spent in each status
order: 102
difficulty: advanced
topic: Window functions
summary: Look ahead to the next event in the same shipment with LEAD.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compare each row with the next one using LEAD
  - Calculate durations between timestamps
prerequisites:
  - Day 41
  - Day 65
---

## Task

Each shipment logs a row when its status changes (in the starter query). For every event, return `shipment_id`, `status`, `next_status` and `hours_in_status`: the hours until the shipment's next event, rounded to 1 decimal place. A shipment's latest event has `NULL` in both. Sort by `shipment_id`, then the event time.

## Starter query

```sql
WITH shipment_events(shipment_id, status, at) AS (
  VALUES
    ('S1', 'created', '2025-03-01 09:00'), ('S1', 'packed', '2025-03-01 15:00'),
    ('S1', 'shipped', '2025-03-02 10:00'), ('S1', 'delivered', '2025-03-04 12:00'),
    ('S2', 'created', '2025-03-02 08:00'), ('S2', 'packed', '2025-03-03 08:00'),
    ('S2', 'shipped', '2025-03-03 20:00'),
    ('S3', 'created', '2025-03-03 11:00'), ('S3', 'cancelled', '2025-03-03 12:30')
)
SELECT shipment_id, status, at
FROM shipment_events
ORDER BY shipment_id, at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `LEAD(column) OVER (PARTITION BY shipment_id ORDER BY at)` returns the value from the next event of the same shipment, or `NULL` after the last one.
3. For the hours, subtract the times in seconds: `(unixepoch(LEAD(at) OVER (...)) - unixepoch(at)) / 3600.0`, then `ROUND(..., 1)`.

## Solution

```sql
WITH shipment_events(shipment_id, status, at) AS (
  VALUES
    ('S1', 'created', '2025-03-01 09:00'), ('S1', 'packed', '2025-03-01 15:00'),
    ('S1', 'shipped', '2025-03-02 10:00'), ('S1', 'delivered', '2025-03-04 12:00'),
    ('S2', 'created', '2025-03-02 08:00'), ('S2', 'packed', '2025-03-03 08:00'),
    ('S2', 'shipped', '2025-03-03 20:00'),
    ('S3', 'created', '2025-03-03 11:00'), ('S3', 'cancelled', '2025-03-03 12:30')
)
SELECT shipment_id, status,
  LEAD(status) OVER (PARTITION BY shipment_id ORDER BY at) AS next_status,
  ROUND((unixepoch(LEAD(at) OVER (PARTITION BY shipment_id ORDER BY at)) - unixepoch(at)) / 3600.0, 1) AS hours_in_status
FROM shipment_events
ORDER BY shipment_id, at;
```

## Expected result

| shipment_id | status | next_status | hours_in_status |
| --- | --- | --- | --- |
| S1 | created | packed | 6 |
| S1 | packed | shipped | 19 |
| S1 | shipped | delivered | 50 |
| S1 | delivered | NULL | NULL |
| S2 | created | packed | 24 |
| S2 | packed | shipped | 12 |
| S2 | shipped | NULL | NULL |
| S3 | created | cancelled | 1.5 |
| S3 | cancelled | NULL | NULL |

## Explanation

`LEAD` looks forward and `LAG` looks back within the window. Partitioning by shipment keeps one shipment's last event from borrowing the next shipment's first event.

S1 waited 19 hours between packing and shipping and 50 hours in transit; S2 is still in transit, so its last row has no duration yet. `unixepoch` converts a date and time to whole seconds, which keeps the arithmetic exact.

**Common mistake:** leaving out `PARTITION BY`. S1's `delivered` row would then report 20 hours until S2 was created, a duration that means nothing.

## Wrong answers

Feedback: incorrect-output

```sql
WITH shipment_events(shipment_id, status, at) AS ( VALUES ('S1', 'created', '2025-03-01 09:00'), ('S1', 'packed', '2025-03-01 15:00'), ('S1', 'shipped', '2025-03-02 10:00'), ('S1', 'delivered', '2025-03-04 12:00'), ('S2', 'created', '2025-03-02 08:00'), ('S2', 'packed', '2025-03-03 08:00'), ('S2', 'shipped', '2025-03-03 20:00'), ('S3', 'created', '2025-03-03 11:00'), ('S3', 'cancelled', '2025-03-03 12:30') ) SELECT shipment_id, status, LEAD(status) OVER (ORDER BY shipment_id, at) AS next_status, ROUND((unixepoch(LEAD(at) OVER (ORDER BY shipment_id, at)) - unixepoch(at)) / 3600.0, 1) AS hours_in_status FROM shipment_events ORDER BY shipment_id, at;
```
