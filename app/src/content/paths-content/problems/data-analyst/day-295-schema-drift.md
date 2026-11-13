---
id: da-day-295
title: Detect schema drift against a data contract
order: 295
difficulty: intermediate
topic: Data engineering
summary: Compare the columns a source delivers with the contract and list missing, unexpected and retyped columns.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compare two sets in both directions
  - Report differences by kind
prerequisites:
  - Day 168
  - Day 32
---

## Task

A data contract lists the columns and types each table must have (starter query); `actual_columns` is what today's extract delivered. Report every difference: `table_name`, `column_name`, `issue` (`'missing'`, `'unexpected'` or `'type changed'`) and `detail` (for a type change, `'INTEGER -> TEXT'` style; otherwise `NULL`).

Sort by `table_name`, then `column_name`.

## Starter query

```sql
WITH expected_columns(table_name, column_name, data_type) AS (
  VALUES
    ('orders', 'id', 'INTEGER'), ('orders', 'customer_id', 'INTEGER'), ('orders', 'order_date', 'TEXT'), ('orders', 'status', 'TEXT'),
    ('customers', 'id', 'INTEGER'), ('customers', 'name', 'TEXT'), ('customers', 'email', 'TEXT')
),
actual_columns(table_name, column_name, data_type) AS (
  VALUES
    ('orders', 'id', 'INTEGER'), ('orders', 'customer_id', 'TEXT'), ('orders', 'order_date', 'TEXT'), ('orders', 'channel', 'TEXT'),
    ('customers', 'id', 'INTEGER'), ('customers', 'name', 'TEXT'), ('customers', 'email', 'TEXT'), ('customers', 'phone', 'TEXT')
)
SELECT table_name, column_name, data_type
FROM actual_columns
ORDER BY table_name, column_name;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Missing: expected columns with no actual match on table and column (`LEFT JOIN ... WHERE a.column_name IS NULL`). Unexpected: the same the other way round.
3. Type changed: inner join on table and column where the types differ, with `e.data_type || ' -> ' || a.data_type`. Stack the three with `UNION ALL`.

## Solution

```sql
WITH expected_columns(table_name, column_name, data_type) AS (
  VALUES
    ('orders', 'id', 'INTEGER'), ('orders', 'customer_id', 'INTEGER'), ('orders', 'order_date', 'TEXT'), ('orders', 'status', 'TEXT'),
    ('customers', 'id', 'INTEGER'), ('customers', 'name', 'TEXT'), ('customers', 'email', 'TEXT')
),
actual_columns(table_name, column_name, data_type) AS (
  VALUES
    ('orders', 'id', 'INTEGER'), ('orders', 'customer_id', 'TEXT'), ('orders', 'order_date', 'TEXT'), ('orders', 'channel', 'TEXT'),
    ('customers', 'id', 'INTEGER'), ('customers', 'name', 'TEXT'), ('customers', 'email', 'TEXT'), ('customers', 'phone', 'TEXT')
),
diffs AS (
  SELECT e.table_name, e.column_name, 'missing' AS issue, NULL AS detail
  FROM expected_columns AS e
  LEFT JOIN actual_columns AS a ON a.table_name = e.table_name AND a.column_name = e.column_name
  WHERE a.column_name IS NULL
  UNION ALL
  SELECT a.table_name, a.column_name, 'unexpected', NULL
  FROM actual_columns AS a
  LEFT JOIN expected_columns AS e ON e.table_name = a.table_name AND e.column_name = a.column_name
  WHERE e.column_name IS NULL
  UNION ALL
  SELECT e.table_name, e.column_name, 'type changed', e.data_type || ' -> ' || a.data_type
  FROM expected_columns AS e
  JOIN actual_columns AS a ON a.table_name = e.table_name AND a.column_name = e.column_name
  WHERE a.data_type <> e.data_type
)
SELECT table_name, column_name, issue, detail
FROM diffs
ORDER BY table_name, column_name;
```

## Expected result

| table_name | column_name | issue | detail |
| --- | --- | --- | --- |
| customers | phone | unexpected | NULL |
| orders | channel | unexpected | NULL |
| orders | customer_id | type changed | INTEGER -> TEXT |
| orders | status | missing | NULL |

## Explanation

A data contract says what a source must deliver; checking it means comparing two sets of columns in both directions. A `LEFT JOIN` from expected to actual finds columns that are **missing** (`orders.status`); the same join the other way finds columns that are **unexpected** (`orders.channel`, `customers.phone`); and an inner join with different types finds **type changes** (`customer_id` arriving as text).

Each kind of drift breaks things differently: a missing column fails queries outright, a type change silently breaks joins and sorting (text `'10'` sorts before `'9'`), and an unexpected column is usually harmless but signals an undocumented change. Reporting all three lets the data team respond to each appropriately.

**Common mistake:** checking only one direction. New columns like `channel` and `phone` are never reported, so the contract quietly falls out of date.

## Wrong answers

Feedback: missing-rows

```sql
WITH expected_columns(table_name, column_name, data_type) AS ( VALUES ('orders', 'id', 'INTEGER'), ('orders', 'customer_id', 'INTEGER'), ('orders', 'order_date', 'TEXT'), ('orders', 'status', 'TEXT'), ('customers', 'id', 'INTEGER'), ('customers', 'name', 'TEXT'), ('customers', 'email', 'TEXT') ), actual_columns(table_name, column_name, data_type) AS ( VALUES ('orders', 'id', 'INTEGER'), ('orders', 'customer_id', 'TEXT'), ('orders', 'order_date', 'TEXT'), ('orders', 'channel', 'TEXT'), ('customers', 'id', 'INTEGER'), ('customers', 'name', 'TEXT'), ('customers', 'email', 'TEXT'), ('customers', 'phone', 'TEXT') ), diffs AS (SELECT e.table_name, e.column_name, 'missing' AS issue, NULL AS detail FROM expected_columns AS e LEFT JOIN actual_columns AS a ON a.table_name = e.table_name AND a.column_name = e.column_name WHERE a.column_name IS NULL UNION ALL SELECT e.table_name, e.column_name, 'type changed', e.data_type || ' -> ' || a.data_type FROM expected_columns AS e JOIN actual_columns AS a ON a.table_name = e.table_name AND a.column_name = e.column_name WHERE a.data_type <> e.data_type) SELECT table_name, column_name, issue, detail FROM diffs ORDER BY table_name, column_name;
```
