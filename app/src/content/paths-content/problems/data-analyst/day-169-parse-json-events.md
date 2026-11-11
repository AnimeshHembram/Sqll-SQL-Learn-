---
id: da-day-169
title: Parse and validate JSON events
order: 169
difficulty: advanced
topic: Data engineering
summary: Extract fields from JSON text, check their types and route bad records to an invalid bucket.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Extract fields from JSON text
  - Validate JSON types before using values
prerequisites:
  - Day 142
  - Day 129
---

## Task

An events table (in the starter query) stores each event as JSON text. An event is **valid** when the text is valid JSON with a text `type` and a **numeric** `amount` (a number in quotes does not count). Everything else, including empty or missing payloads, is invalid.

Return one row per event type for valid events, plus a row `'(invalid)'`: `event_type`, `events` and `total_amount` (`NULL` for the invalid row). Sort the types alphabetically, with `'(invalid)'` last.

## Starter query

```sql
WITH raw_events(id, payload) AS (
  VALUES
    (1, '{"type":"purchase","amount":250,"currency":"INR"}'),
    (2, '{"type":"purchase","amount":"100"}'),
    (3, '{"type":"refund","amount":-50.5}'),
    (4, '{type:"purchase"}'),
    (5, '{"type":"purchase","amount":120.25,"meta":{"coupon":"X"}}'),
    (6, ''),
    (7, '{"type":"refund"}'),
    (8, NULL)
)
SELECT id, payload, json_valid(payload) AS is_json
FROM raw_events;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. `json_valid(text)` is 1 for valid JSON.
2. `json_type(payload, '$.amount')` returns `'integer'` or `'real'` for numbers and `'text'` for quoted values. Check `json_valid` first: `json_type` raises an error on invalid JSON, and a `CASE` stops at the first condition that matches.
3. In a CTE, give each event its `event_type` (`json_extract(payload, '$.type')` or `'(invalid)'`) and its `amount` (`NULL` when invalid), each with a `CASE` that tests `json_valid` first. Then group; `SUM(amount)` is `NULL` for the invalid group.

## Solution

```sql
WITH raw_events(id, payload) AS (
  VALUES
    (1, '{"type":"purchase","amount":250,"currency":"INR"}'),
    (2, '{"type":"purchase","amount":"100"}'),
    (3, '{"type":"refund","amount":-50.5}'),
    (4, '{type:"purchase"}'),
    (5, '{"type":"purchase","amount":120.25,"meta":{"coupon":"X"}}'),
    (6, ''),
    (7, '{"type":"refund"}'),
    (8, NULL)
),
classified AS (
  SELECT id,
    CASE
      WHEN COALESCE(json_valid(payload), 0) = 0 THEN '(invalid)'
      WHEN json_type(payload, '$.type') = 'text' AND json_type(payload, '$.amount') IN ('integer', 'real')
        THEN json_extract(payload, '$.type')
      ELSE '(invalid)'
    END AS event_type,
    CASE
      WHEN COALESCE(json_valid(payload), 0) = 0 THEN NULL
      WHEN json_type(payload, '$.type') = 'text' AND json_type(payload, '$.amount') IN ('integer', 'real')
        THEN json_extract(payload, '$.amount')
    END AS amount
  FROM raw_events
)
SELECT event_type, COUNT(*) AS events, SUM(amount) AS total_amount
FROM classified
GROUP BY event_type
ORDER BY event_type = '(invalid)', event_type;
```

## Expected result

| event_type | events | total_amount |
| --- | --- | --- |
| purchase | 2 | 370.25 |
| refund | 1 | -50.5 |
| (invalid) | 5 | NULL |

## Explanation

JSON columns are common in event pipelines, and SQLite's JSON functions read them directly. Validation should check types, not just presence: event 2's amount is the text `"100"`, which `SUM` would happily add, hiding an upstream bug that sends strings.

Order matters inside the `CASE`. Event 4 is not valid JSON (unquoted key), and calling `json_type` or `json_extract` on it would stop the whole query with an error, so `json_valid` is tested first, and the amount is extracted inside the same guarded `CASE` rather than in the final `SUM`, which sees every row of its group. `json_valid(NULL)` is `NULL`, which `COALESCE` turns into "invalid", and the empty string is invalid JSON. Event 5's extra nested field is fine: unknown fields do not make an event invalid.

**Common mistake:** extracting `amount` without checking its type, which counts event 2 as a purchase of 100.

## Wrong answers

Feedback: incorrect-output

```sql
WITH raw_events(id, payload) AS ( VALUES (1, '{"type":"purchase","amount":250,"currency":"INR"}'), (2, '{"type":"purchase","amount":"100"}'), (3, '{"type":"refund","amount":-50.5}'), (4, '{type:"purchase"}'), (5, '{"type":"purchase","amount":120.25,"meta":{"coupon":"X"}}'), (6, ''), (7, '{"type":"refund"}'), (8, NULL) ), classified AS (SELECT id, CASE WHEN COALESCE(json_valid(payload), 0) = 0 THEN '(invalid)' WHEN json_extract(payload, '$.type') IS NOT NULL AND json_extract(payload, '$.amount') IS NOT NULL THEN json_extract(payload, '$.type') ELSE '(invalid)' END AS event_type, CASE WHEN COALESCE(json_valid(payload), 0) = 0 THEN NULL WHEN json_extract(payload, '$.type') IS NOT NULL THEN json_extract(payload, '$.amount') END AS amount FROM raw_events) SELECT event_type, COUNT(*) AS events, SUM(amount) AS total_amount FROM classified GROUP BY event_type ORDER BY event_type = '(invalid)', event_type;
```
