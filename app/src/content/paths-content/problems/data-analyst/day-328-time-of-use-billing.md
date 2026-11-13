---
id: da-day-328
title: Case study: time-of-use electricity billing
order: 328
difficulty: advanced
topic: Case studies
summary: Classify meter readings into peak and off-peak hours, bill them at different rates, and compare with a flat tariff.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Band readings by time of day
  - Compare two pricing schemes
prerequisites:
  - Day 185
  - Day 305
---

## Task

A utility bills smart-meter readings (starter query) at a **peak** rate from 17:00 to 22:59 and an **off-peak** rate at all other hours (rates in `tariff`). For each meter, return `meter`, `peak_kwh`, `offpeak_kwh`, `tou_bill` (time-of-use bill), `flat_bill` (all kWh at a flat ₹7.00) and `saving` (flat − time-of-use; positive means the customer saves with time-of-use). Round kWh to 1 decimal place and money to 2. Sort by `saving` from highest.

## Starter query

```sql
WITH readings(meter, read_at, kwh) AS (
  VALUES
    ('M1', '2025-03-10 06:00', 1.2), ('M1', '2025-03-10 09:00', 0.8), ('M1', '2025-03-10 18:30', 2.5), ('M1', '2025-03-10 21:00', 1.9),
    ('M1', '2025-03-10 23:30', 0.6), ('M2', '2025-03-10 02:00', 3.0), ('M2', '2025-03-10 03:00', 2.8), ('M2', '2025-03-10 19:00', 0.4),
    ('M3', '2025-03-10 17:00', 1.5), ('M3', '2025-03-10 22:00', 1.1)
),
tariff(band, rate) AS (
  VALUES ('peak', 9.5), ('off-peak', 5.0)
)
SELECT meter, read_at, kwh
FROM readings
ORDER BY meter, read_at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Band each reading by its hour: `CASE WHEN CAST(strftime('%H', read_at) AS INTEGER) BETWEEN 17 AND 22 THEN 'peak' ELSE 'off-peak' END`, then join `tariff` on the band.
3. Per meter: `SUM(CASE WHEN band = 'peak' THEN kwh ELSE 0 END)`, the bill `SUM(kwh * rate)` and the flat bill `SUM(kwh) * 7`.

## Solution

```sql
WITH readings(meter, read_at, kwh) AS (
  VALUES
    ('M1', '2025-03-10 06:00', 1.2), ('M1', '2025-03-10 09:00', 0.8), ('M1', '2025-03-10 18:30', 2.5), ('M1', '2025-03-10 21:00', 1.9),
    ('M1', '2025-03-10 23:30', 0.6), ('M2', '2025-03-10 02:00', 3.0), ('M2', '2025-03-10 03:00', 2.8), ('M2', '2025-03-10 19:00', 0.4),
    ('M3', '2025-03-10 17:00', 1.5), ('M3', '2025-03-10 22:00', 1.1)
),
tariff(band, rate) AS (
  VALUES ('peak', 9.5), ('off-peak', 5.0)
),
banded AS (
  SELECT r.meter, r.kwh, t.band, t.rate
  FROM readings AS r
  JOIN tariff AS t ON t.band = CASE WHEN CAST(strftime('%H', r.read_at) AS INTEGER) BETWEEN 17 AND 22 THEN 'peak' ELSE 'off-peak' END
)
SELECT meter,
  ROUND(SUM(CASE WHEN band = 'peak' THEN kwh ELSE 0 END), 1) AS peak_kwh,
  ROUND(SUM(CASE WHEN band = 'off-peak' THEN kwh ELSE 0 END), 1) AS offpeak_kwh,
  ROUND(SUM(kwh * rate), 2) AS tou_bill,
  ROUND(SUM(kwh) * 7.0, 2) AS flat_bill,
  ROUND(SUM(kwh) * 7.0 - SUM(kwh * rate), 2) AS saving
FROM banded
GROUP BY meter
ORDER BY saving DESC;
```

## Expected result

| meter | peak_kwh | offpeak_kwh | tou_bill | flat_bill | saving |
| --- | --- | --- | --- | --- | --- |
| M2 | 0.4 | 5.8 | 32.8 | 43.4 | 10.6 |
| M1 | 4.4 | 2.6 | 54.8 | 49 | -5.8 |
| M3 | 2.6 | 0 | 24.7 | 18.2 | -6.5 |

## Explanation

Time-of-use tariffs charge more at peak times (here 17:00 to 22:59) to move demand to cheaper hours. Classifying each reading by its hour and joining the tariff on that band prices every reading correctly; the flat tariff is simply all kWh at 7 rupees.

M2 uses most of its electricity at night, so it saves 10.60 under time-of-use; M1 and M3 use their power in the evening peak and would pay more (5.80 and 6.50). That is exactly the behaviour the tariff is designed to reward, and the comparison tells each customer which plan suits them.

**Common mistake:** putting 23:00 in the peak band (`BETWEEN 17 AND 23`). M1's 23:30 reading is then billed at the peak rate, and its time-of-use bill is overstated.

## Wrong answers

Feedback: incorrect-output

```sql
WITH readings(meter, read_at, kwh) AS ( VALUES ('M1', '2025-03-10 06:00', 1.2), ('M1', '2025-03-10 09:00', 0.8), ('M1', '2025-03-10 18:30', 2.5), ('M1', '2025-03-10 21:00', 1.9), ('M1', '2025-03-10 23:30', 0.6), ('M2', '2025-03-10 02:00', 3.0), ('M2', '2025-03-10 03:00', 2.8), ('M2', '2025-03-10 19:00', 0.4), ('M3', '2025-03-10 17:00', 1.5), ('M3', '2025-03-10 22:00', 1.1) ), tariff(band, rate) AS ( VALUES ('peak', 9.5), ('off-peak', 5.0) ), banded AS (SELECT r.meter, r.kwh, t.band, t.rate FROM readings AS r JOIN tariff AS t ON t.band = CASE WHEN CAST(strftime('%H', r.read_at) AS INTEGER) BETWEEN 17 AND 23 THEN 'peak' ELSE 'off-peak' END) SELECT meter, ROUND(SUM(CASE WHEN band = 'peak' THEN kwh ELSE 0 END), 1) AS peak_kwh, ROUND(SUM(CASE WHEN band = 'off-peak' THEN kwh ELSE 0 END), 1) AS offpeak_kwh, ROUND(SUM(kwh * rate), 2) AS tou_bill, ROUND(SUM(kwh) * 7.0, 2) AS flat_bill, ROUND(SUM(kwh) * 7.0 - SUM(kwh * rate), 2) AS saving FROM banded GROUP BY meter ORDER BY saving DESC;
```
