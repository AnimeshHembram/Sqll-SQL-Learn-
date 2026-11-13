---
id: da-day-334
title: Which duplicate rows should be deleted?
order: 334
difficulty: intermediate
topic: Interview practice
summary: List the rows a clean-up would delete: every duplicate of an email except the oldest, with emails normalised.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Pick survivors in duplicate groups
  - Normalise keys before de-duplicating
prerequisites:
  - Day 69
  - Day 197
---

## Task

The contacts table (starter query) has duplicates of the same person with slightly different emails. Two rows are duplicates when their emails are equal after trimming and lower-casing. Keep the **oldest** row of each duplicate group (earliest `created_on`, then lowest `id`) and list every other row as **to delete**. Rows without an email are never treated as duplicates.

Return `id`, `email`, `keep_id` (the id that will be kept) and `created_on`, sorted by `id`.

## Starter query

```sql
WITH contacts(id, email, name, created_on) AS (
  VALUES
    (1, 'asha@example.com', 'Asha Rao', '2024-05-01'), (2, 'ravi@example.com', 'Ravi K', '2024-06-11'), (3, 'Asha@Example.com', 'Asha R', '2024-07-02'),
    (4, 'meera@example.com', 'Meera P', '2024-07-15'), (5, 'ASHA@example.com', 'Asha', '2024-09-30'), (6, 'ravi@example.com', 'Ravi Kumar', '2024-10-01'),
    (7, NULL, 'Unknown', '2024-10-05'), (8, NULL, 'Unknown', '2024-10-06')
)
SELECT id, email, name, created_on
FROM contacts
ORDER BY id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Normalise with `LOWER(TRIM(email))` and rank rows within each normalised email: `ROW_NUMBER() OVER (PARTITION BY clean ORDER BY created_on, id)`.
3. The kept id is `FIRST_VALUE(id) OVER (same partition and order)`. Delete rows with rank above 1, and filter out `NULL` emails first, since `NULL`s would otherwise all fall into one partition.

## Solution

```sql
WITH contacts(id, email, name, created_on) AS (
  VALUES
    (1, 'asha@example.com', 'Asha Rao', '2024-05-01'), (2, 'ravi@example.com', 'Ravi K', '2024-06-11'), (3, 'Asha@Example.com', 'Asha R', '2024-07-02'),
    (4, 'meera@example.com', 'Meera P', '2024-07-15'), (5, 'ASHA@example.com', 'Asha', '2024-09-30'), (6, 'ravi@example.com', 'Ravi Kumar', '2024-10-01'),
    (7, NULL, 'Unknown', '2024-10-05'), (8, NULL, 'Unknown', '2024-10-06')
),
ranked AS (
  SELECT id, email, created_on,
    ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(email)) ORDER BY created_on, id) AS rn,
    FIRST_VALUE(id) OVER (PARTITION BY LOWER(TRIM(email)) ORDER BY created_on, id) AS keep_id
  FROM contacts
  WHERE email IS NOT NULL
)
SELECT id, email, keep_id, created_on
FROM ranked
WHERE rn > 1
ORDER BY id;
```

## Expected result

| id | email | keep_id | created_on |
| --- | --- | --- | --- |
| 3 | Asha@Example.com | 1 | 2024-07-02 |
| 5 | ASHA@example.com | 1 | 2024-09-30 |
| 6 | ravi@example.com | 2 | 2024-10-01 |

## Explanation

De-duplication is two decisions: what makes rows duplicates, and which one survives. Here duplicates share an email after trimming and lower-casing, so `Asha@Example.com` and `ASHA@example.com` belong with row 1, and the survivor is the oldest row (earliest `created_on`, then lowest id). `FIRST_VALUE(id)` over the same window shows which row each deletion is folded into.

Rows without an email are excluded first: `PARTITION BY` treats all `NULL`s as one group, so rows 7 and 8 would otherwise be "duplicates" of each other, though nothing says they are the same person. The query lists rows rather than deleting them, which is how a careful clean-up starts: someone reviews the list before anything is removed.

**Common mistake:** keeping the `NULL` emails in the window. Row 8 is then marked for deletion as a duplicate of row 7, removing a contact that might be a different person.

## Wrong answers

Feedback: extra-rows

```sql
WITH contacts(id, email, name, created_on) AS ( VALUES (1, 'asha@example.com', 'Asha Rao', '2024-05-01'), (2, 'ravi@example.com', 'Ravi K', '2024-06-11'), (3, 'Asha@Example.com', 'Asha R', '2024-07-02'), (4, 'meera@example.com', 'Meera P', '2024-07-15'), (5, 'ASHA@example.com', 'Asha', '2024-09-30'), (6, 'ravi@example.com', 'Ravi Kumar', '2024-10-01'), (7, NULL, 'Unknown', '2024-10-05'), (8, NULL, 'Unknown', '2024-10-06') ), ranked AS (SELECT id, email, created_on, ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(email)) ORDER BY created_on, id) AS rn, FIRST_VALUE(id) OVER (PARTITION BY LOWER(TRIM(email)) ORDER BY created_on, id) AS keep_id FROM contacts) SELECT id, email, keep_id, created_on FROM ranked WHERE rn > 1 ORDER BY id;
```

Feedback: missing-rows

```sql
WITH contacts(id, email, name, created_on) AS ( VALUES (1, 'asha@example.com', 'Asha Rao', '2024-05-01'), (2, 'ravi@example.com', 'Ravi K', '2024-06-11'), (3, 'Asha@Example.com', 'Asha R', '2024-07-02'), (4, 'meera@example.com', 'Meera P', '2024-07-15'), (5, 'ASHA@example.com', 'Asha', '2024-09-30'), (6, 'ravi@example.com', 'Ravi Kumar', '2024-10-01'), (7, NULL, 'Unknown', '2024-10-05'), (8, NULL, 'Unknown', '2024-10-06') ), ranked AS (SELECT id, email, created_on, ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_on, id) AS rn, FIRST_VALUE(id) OVER (PARTITION BY email ORDER BY created_on, id) AS keep_id FROM contacts WHERE email IS NOT NULL) SELECT id, email, keep_id, created_on FROM ranked WHERE rn > 1 ORDER BY id;
```
