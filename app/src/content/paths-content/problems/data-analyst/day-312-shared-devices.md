---
id: da-day-312
title: Devices shared by many accounts
order: 312
difficulty: intermediate
topic: Risk analytics
summary: Find devices that logged in to three or more accounts, a common sign of fake or farmed accounts.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Count distinct entities per key
  - List grouped values in order
prerequisites:
  - Day 260
  - Day 197
---

## Task

Several accounts logging in from the same device can indicate fake accounts created by one person. From the login log (starter query), find devices used by **3 or more distinct accounts**. Return `device_id`, `accounts`, `account_list` (account names in alphabetical order, separated by `', '`), `first_seen` and `last_seen`. Sort by `accounts` from most, then `device_id`.

## Starter query

```sql
WITH logins(account, device_id, logged_in_on) AS (
  VALUES
    ('acc1', 'dev-1', '2025-03-01'), ('acc2', 'dev-1', '2025-03-01'), ('acc3', 'dev-1', '2025-03-02'), ('acc4', 'dev-1', '2025-03-02'),
    ('acc5', 'dev-2', '2025-03-01'), ('acc5', 'dev-3', '2025-03-03'), ('acc6', 'dev-3', '2025-03-03'), ('acc7', 'dev-4', '2025-03-04'),
    ('acc8', 'dev-5', '2025-03-04'), ('acc9', 'dev-5', '2025-03-05'), ('acc10', 'dev-5', '2025-03-05'), ('acc1', 'dev-1', '2025-03-06')
)
SELECT account, device_id, logged_in_on
FROM logins
ORDER BY device_id, account;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Group by device: `COUNT(DISTINCT account)` and `HAVING` it at least 3. The same account logging in twice counts once.
3. For the list, feed `GROUP_CONCAT` from a subquery of distinct device-account pairs sorted by account, or use `GROUP_CONCAT(DISTINCT account)` (which cannot take a custom separator).

## Solution

```sql
WITH logins(account, device_id, logged_in_on) AS (
  VALUES
    ('acc1', 'dev-1', '2025-03-01'), ('acc2', 'dev-1', '2025-03-01'), ('acc3', 'dev-1', '2025-03-02'), ('acc4', 'dev-1', '2025-03-02'),
    ('acc5', 'dev-2', '2025-03-01'), ('acc5', 'dev-3', '2025-03-03'), ('acc6', 'dev-3', '2025-03-03'), ('acc7', 'dev-4', '2025-03-04'),
    ('acc8', 'dev-5', '2025-03-04'), ('acc9', 'dev-5', '2025-03-05'), ('acc10', 'dev-5', '2025-03-05'), ('acc1', 'dev-1', '2025-03-06')
),
pairs AS (
  SELECT DISTINCT device_id, account FROM logins ORDER BY device_id, account
),
lists AS (
  SELECT device_id, COUNT(*) AS accounts, GROUP_CONCAT(account, ', ') AS account_list FROM pairs GROUP BY device_id
)
SELECT l.device_id, l.accounts, l.account_list, MIN(g.logged_in_on) AS first_seen, MAX(g.logged_in_on) AS last_seen
FROM lists AS l
JOIN logins AS g ON g.device_id = l.device_id
WHERE l.accounts >= 3
GROUP BY l.device_id, l.accounts, l.account_list
ORDER BY l.accounts DESC, l.device_id;
```

## Expected result

| device_id | accounts | account_list | first_seen | last_seen |
| --- | --- | --- | --- | --- |
| dev-1 | 4 | acc1, acc2, acc3, acc4 | 2025-03-01 | 2025-03-06 |
| dev-5 | 3 | acc10, acc8, acc9 | 2025-03-04 | 2025-03-05 |

## Explanation

When many accounts log in from one device, they are often controlled by one person: fake sign-ups for referral bonuses, or a fraud ring. `COUNT(DISTINCT account)` per device counts accounts, not logins, so acc1 logging in twice from dev-1 counts once.

Dev-1 served four accounts and dev-5 three, both worth reviewing. The account list is sorted as text, which is why `acc10` comes before `acc8`; if account names mattered numerically, the list would need a numeric sort key. Feeding `GROUP_CONCAT` from a sorted, de-duplicated subquery gives a stable list.

**Common mistake:** `COUNT(account)` instead of `COUNT(DISTINCT account)`. Repeat logins inflate the count, and a single account that logs in three times from its own phone looks like a device farm.

## Wrong answers

Feedback: incorrect-output

```sql
WITH logins(account, device_id, logged_in_on) AS ( VALUES ('acc1', 'dev-1', '2025-03-01'), ('acc2', 'dev-1', '2025-03-01'), ('acc3', 'dev-1', '2025-03-02'), ('acc4', 'dev-1', '2025-03-02'), ('acc5', 'dev-2', '2025-03-01'), ('acc5', 'dev-3', '2025-03-03'), ('acc6', 'dev-3', '2025-03-03'), ('acc7', 'dev-4', '2025-03-04'), ('acc8', 'dev-5', '2025-03-04'), ('acc9', 'dev-5', '2025-03-05'), ('acc10', 'dev-5', '2025-03-05'), ('acc1', 'dev-1', '2025-03-06') ), lists AS (SELECT device_id, COUNT(account) AS accounts, GROUP_CONCAT(account, ', ') AS account_list, MIN(logged_in_on) AS first_seen, MAX(logged_in_on) AS last_seen FROM (SELECT * FROM logins ORDER BY device_id, account) GROUP BY device_id) SELECT device_id, accounts, account_list, first_seen, last_seen FROM lists WHERE accounts >= 3 ORDER BY accounts DESC, device_id;
```
