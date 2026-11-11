---
id: da-day-167
title: Rebuild a table from its change log
order: 167
difficulty: intermediate
topic: Data engineering
summary: Apply insert, update and delete events in sequence to get the current state of each record.
module: data-analyst
duration: 13
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Apply a change log in sequence
  - Treat deletes as the latest state
prerequisites:
  - Day 69
  - Day 104
---

## Task

A replication feed (in the starter query) sends every change to the customers table as an event with a sequence number `seq`. Inserts and updates carry the full row; a delete removes the customer; a customer can be inserted again after being deleted. Rows arrived out of order, so `seq` is the truth.

Return the **current** customers: `customer_id`, `email` and `plan`. Sort by `customer_id`.

## Starter query

```sql
WITH change_log(seq, op, customer_id, email, plan) AS (
  VALUES
    (3, 'update', 1, 'a@x.in', 'pro'), (1, 'insert', 1, 'a@x.in', 'basic'), (2, 'insert', 2, 'b@x.in', 'pro'),
    (4, 'insert', 3, 'c@x.in', 'basic'), (5, 'delete', 2, NULL, NULL), (6, 'update', 3, 'c2@x.in', 'basic'),
    (7, 'insert', 4, 'd@x.in', 'basic'), (8, 'delete', 4, NULL, NULL), (9, 'insert', 4, 'd@y.in', 'pro'),
    (10, 'update', 1, 'a@new.in', 'pro')
)
SELECT seq, op, customer_id, email, plan
FROM change_log
ORDER BY seq;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. The current state of a customer is their **latest** event by `seq`: `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY seq DESC)`.
3. Keep row number 1 and drop it if that latest event is a delete: `WHERE n = 1 AND op <> 'delete'`.

## Solution

```sql
WITH change_log(seq, op, customer_id, email, plan) AS (
  VALUES
    (3, 'update', 1, 'a@x.in', 'pro'), (1, 'insert', 1, 'a@x.in', 'basic'), (2, 'insert', 2, 'b@x.in', 'pro'),
    (4, 'insert', 3, 'c@x.in', 'basic'), (5, 'delete', 2, NULL, NULL), (6, 'update', 3, 'c2@x.in', 'basic'),
    (7, 'insert', 4, 'd@x.in', 'basic'), (8, 'delete', 4, NULL, NULL), (9, 'insert', 4, 'd@y.in', 'pro'),
    (10, 'update', 1, 'a@new.in', 'pro')
),
latest AS (
  SELECT customer_id, op, email, plan,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY seq DESC) AS n
  FROM change_log
)
SELECT customer_id, email, plan
FROM latest
WHERE n = 1 AND op <> 'delete'
ORDER BY customer_id;
```

## Expected result

| customer_id | email | plan |
| --- | --- | --- |
| 1 | a@new.in | pro |
| 3 | c2@x.in | basic |
| 4 | d@y.in | pro |

## Explanation

Change data capture (CDC) feeds describe what happened, not what is. Because every insert and update carries the full row, the latest event per key fully describes the record, and a delete as the latest event means the record is gone.

Customer 2 was deleted at seq 5 and never came back. Customer 4 was deleted at seq 8 and inserted again at seq 9 with a new email, so they exist. Customer 1's events arrived out of order; sorting by `seq`, not by arrival, gives their final email from seq 10.

**Common mistake:** taking the latest non-delete event, which resurrects deleted customer 2. The opposite slip, dropping every key that was ever deleted, loses customer 4.

## Wrong answers

Feedback: extra-rows

```sql
WITH change_log(seq, op, customer_id, email, plan) AS ( VALUES (3, 'update', 1, 'a@x.in', 'pro'), (1, 'insert', 1, 'a@x.in', 'basic'), (2, 'insert', 2, 'b@x.in', 'pro'), (4, 'insert', 3, 'c@x.in', 'basic'), (5, 'delete', 2, NULL, NULL), (6, 'update', 3, 'c2@x.in', 'basic'), (7, 'insert', 4, 'd@x.in', 'basic'), (8, 'delete', 4, NULL, NULL), (9, 'insert', 4, 'd@y.in', 'pro'), (10, 'update', 1, 'a@new.in', 'pro') ), latest AS (SELECT customer_id, op, email, plan, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY seq DESC) AS n FROM change_log WHERE op <> 'delete') SELECT customer_id, email, plan FROM latest WHERE n = 1 ORDER BY customer_id;
```

Feedback: missing-rows

```sql
WITH change_log(seq, op, customer_id, email, plan) AS ( VALUES (3, 'update', 1, 'a@x.in', 'pro'), (1, 'insert', 1, 'a@x.in', 'basic'), (2, 'insert', 2, 'b@x.in', 'pro'), (4, 'insert', 3, 'c@x.in', 'basic'), (5, 'delete', 2, NULL, NULL), (6, 'update', 3, 'c2@x.in', 'basic'), (7, 'insert', 4, 'd@x.in', 'basic'), (8, 'delete', 4, NULL, NULL), (9, 'insert', 4, 'd@y.in', 'pro'), (10, 'update', 1, 'a@new.in', 'pro') ), latest AS (SELECT customer_id, op, email, plan, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY seq DESC) AS n FROM change_log) SELECT customer_id, email, plan FROM latest WHERE n = 1 AND customer_id NOT IN (SELECT customer_id FROM change_log WHERE op = 'delete') ORDER BY customer_id;
```
