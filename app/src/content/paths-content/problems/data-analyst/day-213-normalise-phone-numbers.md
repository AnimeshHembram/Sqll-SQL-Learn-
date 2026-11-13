---
id: da-day-213
title: Normalise Indian mobile numbers
order: 213
difficulty: advanced
topic: Text functions
summary: Strip formatting and country prefixes from phone numbers, then keep only valid 10-digit mobiles.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Clean strings with nested REPLACE
  - Validate a pattern with GLOB
prerequisites:
  - Day 212
  - Day 142
---

## Task

The CRM's phone numbers (starter query) were typed by hand. Normalise each one:

1. remove spaces, hyphens, brackets and `+`;
2. drop a leading country code `91` when 12 digits remain, or a leading trunk `0` when 11 digits remain;
3. the number is a **valid mobile** if exactly 10 digits remain and the first is 6, 7, 8 or 9.

Return `id`, `phone` (the original), `normalised` (`'+91'` followed by the 10 digits, `NULL` unless valid) and `status`: `'missing'` when there is no phone, `'valid'` or `'invalid'`. Sort by `id`.

## Starter query

```sql
WITH contacts(id, phone) AS (
  VALUES
    (1, '+91 98450 12345'), (2, '098450-12346'), (3, '9845012347'), (4, '(022) 2345 6789'),
    (5, '91-98450-1234'), (6, '+91 7022 334455'), (7, NULL), (8, '91 5845012349')
)
SELECT id, phone
FROM contacts
ORDER BY id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Nest `REPLACE` calls to remove each formatting character: `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '')`.
3. Drop the prefix with a `CASE` on `LENGTH(digits)` and `SUBSTR(digits, 1, 2) = '91'` or `SUBSTR(digits, 1, 1) = '0'`. Check validity with `GLOB '[6-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'`, which also rejects any letter left over.

## Solution

```sql
WITH contacts(id, phone) AS (
  VALUES
    (1, '+91 98450 12345'), (2, '098450-12346'), (3, '9845012347'), (4, '(022) 2345 6789'),
    (5, '91-98450-1234'), (6, '+91 7022 334455'), (7, NULL), (8, '91 5845012349')
),
digits AS (
  SELECT id, phone,
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') AS d
  FROM contacts
),
national AS (
  SELECT id, phone,
    CASE WHEN LENGTH(d) = 12 AND SUBSTR(d, 1, 2) = '91' THEN SUBSTR(d, 3)
         WHEN LENGTH(d) = 11 AND SUBSTR(d, 1, 1) = '0' THEN SUBSTR(d, 2)
         ELSE d END AS n
  FROM digits
)
SELECT id, phone,
  CASE WHEN n GLOB '[6-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]' THEN '+91' || n END AS normalised,
  CASE WHEN phone IS NULL THEN 'missing'
       WHEN n GLOB '[6-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]' THEN 'valid'
       ELSE 'invalid' END AS status
FROM national
ORDER BY id;
```

## Expected result

| id | phone | normalised | status |
| --- | --- | --- | --- |
| 1 | +91 98450 12345 | +919845012345 | valid |
| 2 | 098450-12346 | +919845012346 | valid |
| 3 | 9845012347 | +919845012347 | valid |
| 4 | (022) 2345 6789 | NULL | invalid |
| 5 | 91-98450-1234 | NULL | invalid |
| 6 | +91 7022 334455 | +917022334455 | valid |
| 7 | NULL | NULL | missing |
| 8 | 91 5845012349 | NULL | invalid |

## Explanation

Normalising means turning many spellings of the same thing into one canonical form, then checking that form. After removing formatting, the same mobile can appear with a country code (`+91 98450 12345`, 12 digits), with a trunk `0` (`098450-12346`, 11 digits) or bare (10 digits); stripping only those known prefixes leaves 10 digits in each case.

`GLOB '[6-9][0-9]…'` then checks the rule exactly: ten characters, the first 6 to 9, all digits. The Mumbai landline `(022) 2345 6789` also becomes 10 digits after dropping its `0`, but it starts with 2, so it is rejected; `91-98450-1234` is one digit short; and `91 5845012349` starts with 5 once the `91` is removed. Four of the seven numbers given are valid mobiles.

**Common mistake:** accepting any 10-digit result. Length alone lets the landline through as a "mobile", and campaigns sent to it would quietly fail.

## Wrong answers

Feedback: incorrect-output

```sql
WITH contacts(id, phone) AS ( VALUES (1, '+91 98450 12345'), (2, '098450-12346'), (3, '9845012347'), (4, '(022) 2345 6789'), (5, '91-98450-1234'), (6, '+91 7022 334455'), (7, NULL), (8, '91 5845012349') ), digits AS (SELECT id, phone, REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') AS d FROM contacts), national AS (SELECT id, phone, CASE WHEN LENGTH(d) = 12 AND SUBSTR(d, 1, 2) = '91' THEN SUBSTR(d, 3) ELSE d END AS n FROM digits) SELECT id, phone, CASE WHEN LENGTH(n) = 10 THEN '+91' || n END AS normalised, CASE WHEN phone IS NULL THEN 'missing' WHEN LENGTH(n) = 10 THEN 'valid' ELSE 'invalid' END AS status FROM national ORDER BY id;
```
