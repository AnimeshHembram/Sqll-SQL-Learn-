---
id: da-day-215
title: Split full names into first, middle and last
order: 215
difficulty: advanced
topic: Text functions
summary: Find the first and last word of a name without a reverse function, and keep whatever lies between.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Find the last word of a string
  - Split text into parts
prerequisites:
  - Day 214
  - Day 52
---

## Task

HR's export has one `full_name` column (starter query), sometimes with extra spaces. Tidy each name (trim it and collapse runs of spaces to one), then split it:

- `first_name`: the first word,
- `last_name`: the last word (`NULL` for a one-word name),
- `middle_names`: everything between them (`NULL` when there is nothing).

Return `id`, `first_name`, `middle_names` and `last_name`, sorted by `id`.

## Starter query

```sql
WITH staff(id, full_name) AS (
  VALUES
    (1, 'Asha Rao'), (2, 'Ravi Kumar Sharma'), (3, 'Meera'), (4, '  Vikram   Singh '),
    (5, 'Anil K. Menon'), (6, 'Sita Devi Lakshmi Iyer')
)
SELECT id, full_name
FROM staff
ORDER BY id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Tidy first: `TRIM`, then `REPLACE(name, '  ', ' ')` a few times collapses runs of spaces.
2. First word: `SUBSTR(name, 1, INSTR(name || ' ', ' ') - 1)`. SQLite has no reverse search, but `RTRIM(name, REPLACE(name, ' ', ''))` strips the trailing characters that are not spaces, which removes exactly the last word.
3. So the last word is `SUBSTR(name, LENGTH(RTRIM(name, REPLACE(name, ' ', ''))) + 1)`. The middle is what lies between: `TRIM(SUBSTR(name, LENGTH(first) + 1, LENGTH(name) - LENGTH(first) - LENGTH(last)))`, made `NULL` with `NULLIF(..., '')`.

## Solution

```sql
WITH staff(id, full_name) AS (
  VALUES
    (1, 'Asha Rao'), (2, 'Ravi Kumar Sharma'), (3, 'Meera'), (4, '  Vikram   Singh '),
    (5, 'Anil K. Menon'), (6, 'Sita Devi Lakshmi Iyer')
),
tidy AS (
  SELECT id, REPLACE(REPLACE(REPLACE(TRIM(full_name), '  ', ' '), '  ', ' '), '  ', ' ') AS name FROM staff
),
parts AS (
  SELECT id, name,
    SUBSTR(name, 1, INSTR(name || ' ', ' ') - 1) AS first_name,
    CASE WHEN INSTR(name, ' ') > 0 THEN SUBSTR(name, LENGTH(RTRIM(name, REPLACE(name, ' ', ''))) + 1) END AS last_name
  FROM tidy
)
SELECT id, first_name,
  NULLIF(TRIM(SUBSTR(name, LENGTH(first_name) + 1, LENGTH(name) - LENGTH(first_name) - COALESCE(LENGTH(last_name), 0))), '') AS middle_names,
  last_name
FROM parts
ORDER BY id;
```

## Expected result

| id | first_name | middle_names | last_name |
| --- | --- | --- | --- |
| 1 | Asha | NULL | Rao |
| 2 | Ravi | Kumar | Sharma |
| 3 | Meera | NULL | NULL |
| 4 | Vikram | NULL | Singh |
| 5 | Anil | K. | Menon |
| 6 | Sita | Devi Lakshmi | Iyer |

## Explanation

SQLite can find the first space with `INSTR`, but not the last one. The trick is `RTRIM(name, set)`, which strips trailing characters that belong to `set`. With `set` = every non-space character of the name (`REPLACE(name, ' ', '')`), it strips exactly the last word and stops at the space before it. The length of what is left tells you where the last word starts.

Tidying comes first: `'  Vikram   Singh '` would otherwise have an empty first word and a "middle name" made of spaces. After trimming and collapsing spaces, it splits cleanly into Vikram and Singh. Single-word names like Meera get no last name, and long names keep all their middle parts (`Devi Lakshmi`). Whether `K.` is a middle name or part of the surname is something only HR can say; the query reports what the text shows.

**Common mistake:** splitting without tidying. The leading spaces make Vikram's first name empty and push his whole name into the other columns.

## Wrong answers

Feedback: incorrect-output

```sql
WITH staff(id, full_name) AS ( VALUES (1, 'Asha Rao'), (2, 'Ravi Kumar Sharma'), (3, 'Meera'), (4, '  Vikram   Singh '), (5, 'Anil K. Menon'), (6, 'Sita Devi Lakshmi Iyer') ), parts AS (SELECT id, full_name AS name, SUBSTR(full_name, 1, INSTR(full_name || ' ', ' ') - 1) AS first_name, CASE WHEN INSTR(full_name, ' ') > 0 THEN SUBSTR(full_name, LENGTH(RTRIM(full_name, REPLACE(full_name, ' ', ''))) + 1) END AS last_name FROM staff) SELECT id, first_name, NULLIF(TRIM(SUBSTR(name, LENGTH(first_name) + 1, LENGTH(name) - LENGTH(first_name) - COALESCE(LENGTH(last_name), 0))), '') AS middle_names, last_name FROM parts ORDER BY id;
```
