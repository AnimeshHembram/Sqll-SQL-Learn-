---
id: da-day-293
title: Pick up changes since the last load
order: 293
difficulty: advanced
topic: Data engineering
summary: Select rows changed after a watermark, keep the latest version per key, and compute the next watermark safely.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Load incrementally from a watermark
  - Keep the latest version of each key
prerequisites:
  - Day 167
  - Day 168
---

## Task

An incremental load copies only rows changed since the last run. The last run's **watermark** is in `load_state` (starter query). Select the source rows with `updated_at` **after** the watermark, keep only the **latest version** of each `id`, and report what the next run's watermark should be.

Return one row per id to load (`id`, `name`, `updated_at`), sorted by `id`, and a final row with `id` `NULL`, `name` = `'next watermark'` and `updated_at` = the latest `updated_at` loaded in this run (or the old watermark if nothing was loaded).

## Starter query

```sql
WITH source_rows(id, name, updated_at) AS (
  VALUES
    (1, 'Atlas', '2025-03-10 08:00'), (2, 'Beacon', '2025-03-11 09:30'), (3, 'Comet', '2025-03-12 07:15'),
    (4, 'Delta', '2025-03-12 07:15'), (5, 'Ember', '2025-03-12 10:05'), (2, 'Beacon v2', '2025-03-12 11:00'),
    (6, 'Fable', '2025-03-12 06:00')
),
load_state(table_name, watermark) AS (
  VALUES ('products', '2025-03-12 07:15')
)
SELECT id, name, updated_at
FROM source_rows
ORDER BY updated_at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Filter with `updated_at > (SELECT watermark FROM load_state WHERE table_name = 'products')`. Note the strict `>`: rows exactly at the watermark were loaded last time.
3. Latest version per id: `ROW_NUMBER() OVER (PARTITION BY id ORDER BY updated_at DESC)` = 1. The next watermark is `COALESCE(MAX(updated_at), old watermark)` over the loaded rows.

## Solution

```sql
WITH source_rows(id, name, updated_at) AS (
  VALUES
    (1, 'Atlas', '2025-03-10 08:00'), (2, 'Beacon', '2025-03-11 09:30'), (3, 'Comet', '2025-03-12 07:15'),
    (4, 'Delta', '2025-03-12 07:15'), (5, 'Ember', '2025-03-12 10:05'), (2, 'Beacon v2', '2025-03-12 11:00'),
    (6, 'Fable', '2025-03-12 06:00')
),
load_state(table_name, watermark) AS (
  VALUES ('products', '2025-03-12 07:15')
),
changed AS (
  SELECT id, name, updated_at,
    ROW_NUMBER() OVER (PARTITION BY id ORDER BY updated_at DESC) AS rn
  FROM source_rows
  WHERE updated_at > (SELECT watermark FROM load_state WHERE table_name = 'products')
),
latest AS (
  SELECT id, name, updated_at FROM changed WHERE rn = 1
)
SELECT * FROM (
  SELECT id, name, updated_at FROM latest
  UNION ALL
  SELECT NULL, 'next watermark', COALESCE(MAX(updated_at), (SELECT watermark FROM load_state WHERE table_name = 'products')) FROM latest
)
ORDER BY id IS NULL, id;
```

## Expected result

| id | name | updated_at |
| --- | --- | --- |
| 2 | Beacon v2 | 2025-03-12 11:00 |
| 5 | Ember | 2025-03-12 10:05 |
| NULL | next watermark | 2025-03-12 11:00 |

## Explanation

An incremental load reads only rows changed after the last watermark. The strict `>` matters: Comet and Delta have `updated_at` exactly equal to the watermark, so they were loaded last time; reloading them would at best waste work and at worst duplicate rows. Fable's timestamp is even older, so it is not a change at all.

Beacon changed twice since it was first loaded; only its latest version, `Beacon v2`, should be applied, which `ROW_NUMBER()` per id keeps. The next watermark is the newest timestamp actually loaded (11:00), not the current time: a row committed late with an earlier timestamp would otherwise be skipped forever.

**Common mistake:** filtering with `>=`. Rows at the watermark are loaded twice, and an id with several versions appears more than once.

## Wrong answers

Feedback: extra-rows

```sql
WITH source_rows(id, name, updated_at) AS ( VALUES (1, 'Atlas', '2025-03-10 08:00'), (2, 'Beacon', '2025-03-11 09:30'), (3, 'Comet', '2025-03-12 07:15'), (4, 'Delta', '2025-03-12 07:15'), (5, 'Ember', '2025-03-12 10:05'), (2, 'Beacon v2', '2025-03-12 11:00'), (6, 'Fable', '2025-03-12 06:00') ), load_state(table_name, watermark) AS ( VALUES ('products', '2025-03-12 07:15') ), latest AS (SELECT id, name, updated_at FROM source_rows WHERE updated_at >= (SELECT watermark FROM load_state WHERE table_name = 'products')) SELECT * FROM (SELECT id, name, updated_at FROM latest UNION ALL SELECT NULL, 'next watermark', COALESCE(MAX(updated_at), (SELECT watermark FROM load_state)) FROM latest) ORDER BY id IS NULL, id;
```
