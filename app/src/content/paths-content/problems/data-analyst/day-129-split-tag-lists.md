---
id: da-day-129
title: Split tag lists into rows
order: 129
difficulty: intermediate
topic: Recursive CTEs
summary: Turn a comma-separated text column into one row per value, then clean and count the values.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Split delimited text into rows with a recursive CTE
  - Normalise text before grouping
prerequisites:
  - Day 52
  - Day 68
---

## Task

The blog stores each article's tags as one comma-separated text (in the starter query), typed inconsistently: different capitals, extra spaces, an empty item, an empty list and a missing list. Count how many articles use each tag. Tags are compared **in lower case without surrounding spaces**, and empty tags are ignored. Return `tag` and `articles`. Sort by `articles` from most to fewest, then `tag`.

## Starter query

```sql
WITH RECURSIVE articles(id, title, tags) AS (
  VALUES
    (1, 'SQL joins explained', 'sql, joins,Tutorial'),
    (2, 'Window functions', 'SQL,windows, tutorial'),
    (3, 'Cleaning data', 'data quality,, sql'),
    (4, 'Release notes', ''),
    (5, 'Pivot tables', NULL)
)
SELECT id, title, tags
FROM articles;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. It already starts with `WITH RECURSIVE`.
2. Peel off one tag at a time. Start with `SELECT id, '', tags || ',' FROM articles WHERE tags IS NOT NULL` (the extra comma marks the end), and in each step take the text before the first comma: `substr(rest, 1, instr(rest, ',') - 1)`, keeping `substr(rest, instr(rest, ',') + 1)` for the next step, while `rest <> ''`.
3. Clean with `lower(trim(tag))`, drop empty values, and count distinct articles per tag.

## Solution

```sql
WITH RECURSIVE articles(id, title, tags) AS (
  VALUES
    (1, 'SQL joins explained', 'sql, joins,Tutorial'),
    (2, 'Window functions', 'SQL,windows, tutorial'),
    (3, 'Cleaning data', 'data quality,, sql'),
    (4, 'Release notes', ''),
    (5, 'Pivot tables', NULL)
),
split(id, tag, rest) AS (
  SELECT id, '', tags || ','
  FROM articles
  WHERE tags IS NOT NULL
  UNION ALL
  SELECT id, substr(rest, 1, instr(rest, ',') - 1), substr(rest, instr(rest, ',') + 1)
  FROM split
  WHERE rest <> ''
)
SELECT lower(trim(tag)) AS tag, COUNT(DISTINCT id) AS articles
FROM split
WHERE trim(tag) <> ''
GROUP BY lower(trim(tag))
ORDER BY articles DESC, tag;
```

## Expected result

| tag | articles |
| --- | --- |
| sql | 3 |
| tutorial | 2 |
| data quality | 1 |
| joins | 1 |
| windows | 1 |

## Explanation

Lists packed into one column are common in exports. The recursive CTE cuts the text at the first comma on each step until nothing is left. Adding a comma at the end means the last item is handled like the others.

After splitting, the values still need cleaning: `'SQL'`, `'sql'` and `' sql'` are one tag. The empty item in article 3 (`',,'`), article 4's empty list and article 5's `NULL` produce no tags. SQLite also has `json_each`, which can split a list in one step (accepted below).

**Common mistake:** grouping by the raw text, so `SQL`, `sql` and ` sql` are counted as three different tags.

## Other accepted answers

```sql
WITH RECURSIVE articles(id, title, tags) AS (
  VALUES
    (1, 'SQL joins explained', 'sql, joins,Tutorial'),
    (2, 'Window functions', 'SQL,windows, tutorial'),
    (3, 'Cleaning data', 'data quality,, sql'),
    (4, 'Release notes', ''),
    (5, 'Pivot tables', NULL)
)
SELECT lower(trim(j.value)) AS tag, COUNT(DISTINCT a.id) AS articles
FROM articles AS a, json_each('["' || replace(a.tags, ',', '","') || '"]') AS j
WHERE a.tags IS NOT NULL AND trim(j.value) <> ''
GROUP BY lower(trim(j.value))
ORDER BY articles DESC, tag;
```

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE articles(id, title, tags) AS ( VALUES (1, 'SQL joins explained', 'sql, joins,Tutorial'), (2, 'Window functions', 'SQL,windows, tutorial'), (3, 'Cleaning data', 'data quality,, sql'), (4, 'Release notes', ''), (5, 'Pivot tables', NULL) ), split(id, tag, rest) AS (SELECT id, '', tags || ',' FROM articles WHERE tags IS NOT NULL UNION ALL SELECT id, substr(rest, 1, instr(rest, ',') - 1), substr(rest, instr(rest, ',') + 1) FROM split WHERE rest <> '') SELECT trim(tag) AS tag, COUNT(DISTINCT id) AS articles FROM split WHERE trim(tag) <> '' GROUP BY trim(tag) ORDER BY articles DESC, tag;
```
