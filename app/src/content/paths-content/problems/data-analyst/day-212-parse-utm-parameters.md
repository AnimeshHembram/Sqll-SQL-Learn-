---
id: da-day-212
title: Read campaign tags from landing-page URLs
order: 212
difficulty: advanced
topic: Text functions
summary: Pull utm_source and utm_medium out of query strings in any order, and count visits by source and medium.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Parse key-value pairs from a string
  - Handle optional and reordered parameters
prerequisites:
  - Day 211
  - Day 129
---

## Task

Each visit's landing-page URL (in the starter query) may carry campaign tags in its query string, the part after `?`: `utm_source=…` and `utm_medium=…`, separated by `&`, **in any order**, possibly next to other parameters.

For each visit, extract `source` and `medium` (`NULL` when that tag is absent). Then count visits per combination, labelling a missing source `'(direct)'`. Return `source`, `medium` and `visits`, sorted by `visits` from most to fewest, then `source`, then `medium`.

## Starter query

```sql
WITH visits(id, url) AS (
  VALUES
    (1, 'https://shop.example/sale?utm_source=google&utm_medium=cpc&utm_campaign=diwali'),
    (2, 'https://shop.example/?utm_medium=email&utm_source=newsletter'),
    (3, 'https://shop.example/books'),
    (4, 'https://shop.example/?ref=friend&utm_source=instagram'),
    (5, 'https://shop.example/?utm_source=google&utm_medium=organic'),
    (6, 'https://shop.example/?utm_source=google&utm_medium=cpc&utm_campaign=clearance'),
    (7, 'https://shop.example/?utm_source=newsletter&utm_medium=email')
)
SELECT id, url
FROM visits
ORDER BY id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Wrap the query string in `&` on both sides: `'&' || SUBSTR(url, INSTR(url, '?') + 1) || '&'`. Now every parameter starts with `&name=` and ends just before the next `&`, wherever it sits.
3. The value starts 12 characters after `&utm_source=` begins (the length of that marker). Cut it at the next `&`: `SUBSTR(rest, 1, INSTR(rest, '&') - 1)`, where `rest` is the text from the start of the value. Do the same for `&utm_medium=`.

## Solution

```sql
WITH visits(id, url) AS (
  VALUES
    (1, 'https://shop.example/sale?utm_source=google&utm_medium=cpc&utm_campaign=diwali'),
    (2, 'https://shop.example/?utm_medium=email&utm_source=newsletter'),
    (3, 'https://shop.example/books'),
    (4, 'https://shop.example/?ref=friend&utm_source=instagram'),
    (5, 'https://shop.example/?utm_source=google&utm_medium=organic'),
    (6, 'https://shop.example/?utm_source=google&utm_medium=cpc&utm_campaign=clearance'),
    (7, 'https://shop.example/?utm_source=newsletter&utm_medium=email')
),
params AS (
  SELECT id, '&' || SUBSTR(url, INSTR(url, '?') + 1) || '&' AS q
  FROM visits
  WHERE INSTR(url, '?') > 0
),
parsed AS (
  SELECT v.id,
    CASE WHEN INSTR(p.q, '&utm_source=') > 0 THEN
      SUBSTR(p.q, INSTR(p.q, '&utm_source=') + 12, INSTR(SUBSTR(p.q, INSTR(p.q, '&utm_source=') + 12), '&') - 1) END AS source,
    CASE WHEN INSTR(p.q, '&utm_medium=') > 0 THEN
      SUBSTR(p.q, INSTR(p.q, '&utm_medium=') + 12, INSTR(SUBSTR(p.q, INSTR(p.q, '&utm_medium=') + 12), '&') - 1) END AS medium
  FROM visits AS v
  LEFT JOIN params AS p ON p.id = v.id
)
SELECT COALESCE(source, '(direct)') AS source, medium, COUNT(*) AS visits
FROM parsed
GROUP BY COALESCE(source, '(direct)'), medium
ORDER BY visits DESC, source, medium;
```

## Expected result

| source | medium | visits |
| --- | --- | --- |
| google | cpc | 2 |
| newsletter | email | 2 |
| (direct) | NULL | 1 |
| google | organic | 1 |
| instagram | NULL | 1 |

## Explanation

Query strings are key-value pairs whose order is not guaranteed: visit 2 has `utm_medium` before `utm_source`, and visit 4 has another parameter first. Wrapping the query string as `&…&` gives every parameter the same shape, `&name=value&`, so one rule finds any of them: start 12 characters after the marker (its length) and stop before the next `&`.

Both newsletter visits count together (2) although their tags are in a different order, and the two Google `cpc` visits from different campaigns combine because the report is by source and medium. Visit 3 has no query string at all, so `LEFT JOIN` keeps it and its source becomes `'(direct)'`; Instagram's visit has a source but no medium, which stays `NULL`.

**Common mistake:** taking everything after `utm_source=` without stopping at the next `&`. `google&utm_medium=cpc&utm_campaign=diwali` then becomes the "source", and every combination looks unique.

## Wrong answers

Feedback: incorrect-output

```sql
WITH visits(id, url) AS ( VALUES (1, 'https://shop.example/sale?utm_source=google&utm_medium=cpc&utm_campaign=diwali'), (2, 'https://shop.example/?utm_medium=email&utm_source=newsletter'), (3, 'https://shop.example/books'), (4, 'https://shop.example/?ref=friend&utm_source=instagram'), (5, 'https://shop.example/?utm_source=google&utm_medium=organic'), (6, 'https://shop.example/?utm_source=google&utm_medium=cpc&utm_campaign=clearance'), (7, 'https://shop.example/?utm_source=newsletter&utm_medium=email') ) SELECT COALESCE(CASE WHEN INSTR(url, 'utm_source=') > 0 THEN SUBSTR(url, INSTR(url, 'utm_source=') + 11) END, '(direct)') AS source, CASE WHEN INSTR(url, 'utm_medium=') > 0 THEN SUBSTR(url, INSTR(url, 'utm_medium=') + 11) END AS medium, COUNT(*) AS visits FROM visits GROUP BY 1, 2 ORDER BY visits DESC, source, medium;
```
