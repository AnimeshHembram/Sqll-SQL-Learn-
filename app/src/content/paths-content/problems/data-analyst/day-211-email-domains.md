---
id: da-day-211
title: Sign-ups by email domain
order: 211
difficulty: intermediate
topic: Text functions
summary: Clean messy email addresses and count sign-ups per domain, keeping unusable addresses visible.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Extract part of a string with INSTR and SUBSTR
  - Clean text before grouping
prerequisites:
  - Day 53
  - Day 197
---

## Task

Marketing wants to know where sign-ups come from (data in the starter query). Clean each email by trimming spaces and lower-casing it, then take the **domain**: everything after the `@`. An email that is missing (`NULL`) or has no `@` counts under the domain `'(invalid)'`.

Return `domain`, `signups` and `share_pct` (share of all sign-ups, rounded to 1 decimal place). Sort by `signups` from most to fewest, then `domain`.

## Starter query

```sql
WITH signups(id, email) AS (
  VALUES
    (1, 'Asha.R@Gmail.com'), (2, 'ravi@company.in'), (3, ' meera@gmail.com '), (4, 'john.doe@yahoo.co.in'),
    (5, 'priya@COMPANY.IN'), (6, 'no-email-given'), (7, NULL), (8, 'kiran@mail.company.in'), (9, 'sam@gmail.com')
)
SELECT id, email
FROM signups
ORDER BY id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Clean first in a CTE: `LOWER(TRIM(email)) AS email`. `INSTR(email, '@')` gives the position of the `@` (0 when there is none).
3. Domain: `CASE WHEN email IS NULL OR INSTR(email, '@') = 0 THEN '(invalid)' ELSE SUBSTR(email, INSTR(email, '@') + 1) END`. Share: `100.0 * COUNT(*) / SUM(COUNT(*)) OVER ()`.

## Solution

```sql
WITH signups(id, email) AS (
  VALUES
    (1, 'Asha.R@Gmail.com'), (2, 'ravi@company.in'), (3, ' meera@gmail.com '), (4, 'john.doe@yahoo.co.in'),
    (5, 'priya@COMPANY.IN'), (6, 'no-email-given'), (7, NULL), (8, 'kiran@mail.company.in'), (9, 'sam@gmail.com')
),
cleaned AS (
  SELECT id, LOWER(TRIM(email)) AS email FROM signups
),
domains AS (
  SELECT id,
    CASE WHEN email IS NULL OR INSTR(email, '@') = 0 THEN '(invalid)' ELSE SUBSTR(email, INSTR(email, '@') + 1) END AS domain
  FROM cleaned
)
SELECT domain, COUNT(*) AS signups, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS share_pct
FROM domains
GROUP BY domain
ORDER BY signups DESC, domain;
```

## Expected result

| domain | signups | share_pct |
| --- | --- | --- |
| gmail.com | 3 | 33.3 |
| (invalid) | 2 | 22.2 |
| company.in | 2 | 22.2 |
| mail.company.in | 1 | 11.1 |
| yahoo.co.in | 1 | 11.1 |

## Explanation

Grouping raw text treats `Asha.R@Gmail.com`, ` meera@gmail.com ` and `sam@gmail.com` as three different strings with three different domains. Cleaning first (`TRIM` for the stray spaces, `LOWER` for the capitals) makes them one domain: Gmail has 3 of the 9 sign-ups (33.3%), and `company.in` gets both of its addresses, including `priya@COMPANY.IN`.

`INSTR(email, '@')` finds the separator and `SUBSTR` takes everything after it. Keeping unusable addresses as `'(invalid)'` (one has no `@`, one is `NULL`) means the counts still add up to all 9 sign-ups, and 2 of 9 is worth telling the sign-up form owner about. `mail.company.in` stays separate from `company.in`: deciding whether subdomains belong together is a business rule, not something the query should guess.

**Common mistake:** grouping on the domain without `LOWER` and `TRIM`. `Gmail.com` and `gmail.com ` become separate rows, so the biggest domain looks smaller than it is.

## Wrong answers

Feedback: incorrect-output

```sql
WITH signups(id, email) AS ( VALUES (1, 'Asha.R@Gmail.com'), (2, 'ravi@company.in'), (3, ' meera@gmail.com '), (4, 'john.doe@yahoo.co.in'), (5, 'priya@COMPANY.IN'), (6, 'no-email-given'), (7, NULL), (8, 'kiran@mail.company.in'), (9, 'sam@gmail.com') ) SELECT CASE WHEN email IS NULL OR INSTR(email, '@') = 0 THEN '(invalid)' ELSE SUBSTR(email, INSTR(email, '@') + 1) END AS domain, COUNT(*) AS signups, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS share_pct FROM signups GROUP BY domain ORDER BY signups DESC, domain;
```
