---
id: da-day-214
title: Mask personal data before sharing an extract
order: 214
difficulty: intermediate
topic: Text functions
summary: Hide most of each email and phone number while keeping enough to recognise a record.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Mask strings with SUBSTR
  - Count positions from the end of a string
prerequisites:
  - Day 211
  - Day 52
---

## Task

An agency needs a contact extract (starter query) but must not see full personal details. Mask them:

- `masked_email`: the first character of the part before `@`, then `***`, then the `@` and the domain, so `asha.rao@gmail.com` becomes `a***@gmail.com`;
- `masked_phone`: `XXXXXX` followed by the **last four characters** of the phone as stored, so `9845012345` becomes `XXXXXX2345`.

A missing value stays `NULL`. Return `id`, `masked_email` and `masked_phone`, sorted by `id`.

## Starter query

```sql
WITH people(id, email, phone) AS (
  VALUES
    (1, 'asha.rao@gmail.com', '9845012345'), (2, 'r@company.in', '+919845012346'),
    (3, 'meera.pillai@yahoo.co.in', NULL), (4, NULL, '7022334455'), (5, 'vikram@shop.example', '022-2345-6789')
)
SELECT id, email, phone
FROM people
ORDER BY id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `SUBSTR(email, 1, 1)` is the first character and `SUBSTR(email, INSTR(email, '@'))` is everything from the `@` on.
3. A negative start counts from the end: `SUBSTR(phone, -4)` is the last four characters whatever the length. Concatenation with `NULL` gives `NULL`, so missing values stay missing on their own.

## Solution

```sql
WITH people(id, email, phone) AS (
  VALUES
    (1, 'asha.rao@gmail.com', '9845012345'), (2, 'r@company.in', '+919845012346'),
    (3, 'meera.pillai@yahoo.co.in', NULL), (4, NULL, '7022334455'), (5, 'vikram@shop.example', '022-2345-6789')
)
SELECT id,
  SUBSTR(email, 1, 1) || '***' || SUBSTR(email, INSTR(email, '@')) AS masked_email,
  'XXXXXX' || SUBSTR(phone, -4) AS masked_phone
FROM people
ORDER BY id;
```

## Expected result

| id | masked_email | masked_phone |
| --- | --- | --- |
| 1 | a***@gmail.com | XXXXXX2345 |
| 2 | r***@company.in | XXXXXX2346 |
| 3 | m***@yahoo.co.in | NULL |
| 4 | NULL | XXXXXX4455 |
| 5 | v***@shop.example | XXXXXX6789 |

## Explanation

Masking keeps a record recognisable (to the agency, or to a person checking it against the CRM) without exposing the full value. `SUBSTR(email, 1, 1)` keeps the first character and `SUBSTR(email, INSTR(email, '@'))` keeps the domain, so the agency can still see that a contact is on Gmail or on a company address.

For phones, a negative start in `SUBSTR(phone, -4)` counts from the end, so the last four characters come out right whatever the format: `9845012345`, `+919845012346` and `022-2345-6789` all keep exactly their last four. Nothing extra is needed for missing values, because concatenating `NULL` gives `NULL`: Meera's phone and contact 4's email stay `NULL` instead of turning into `XXXXXX` or `***`.

**Common mistake:** a fixed position such as `SUBSTR(phone, 7, 4)`. It works only for numbers stored exactly as ten digits, and shows the wrong digits for `+919845012346` and `022-2345-6789`.

## Wrong answers

Feedback: incorrect-output

```sql
WITH people(id, email, phone) AS ( VALUES (1, 'asha.rao@gmail.com', '9845012345'), (2, 'r@company.in', '+919845012346'), (3, 'meera.pillai@yahoo.co.in', NULL), (4, NULL, '7022334455'), (5, 'vikram@shop.example', '022-2345-6789') ) SELECT id, SUBSTR(email, 1, 1) || '***' || SUBSTR(email, INSTR(email, '@')) AS masked_email, 'XXXXXX' || SUBSTR(phone, 7, 4) AS masked_phone FROM people ORDER BY id;
```
