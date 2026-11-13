---
id: da-day-233
title: First-contact resolution by channel
order: 233
difficulty: intermediate
topic: Operations
summary: Credit each resolved ticket to the channel of its first contact and measure how often one contact was enough.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Summarise multi-step records
  - Choose the right denominator
prerequisites:
  - Day 114
  - Day 231
---

## Task

Each support ticket (starter query) has one or more contacts, numbered from 1; `resolved` is 1 on the contact that resolved it. A ticket is **resolved on first contact** when contact 1 resolved it.

Group tickets by the **channel of their first contact** and return `channel`, `tickets` (all tickets), `resolved` (tickets resolved at some point) and `fcr_pct`: the share of resolved tickets that were resolved on first contact (rounded to 1 decimal place; unresolved tickets are left out of this rate). Sort by `fcr_pct` from highest, then `channel`.

## Starter query

```sql
WITH contacts(ticket_id, contact_no, channel, resolved) AS (
  VALUES
    (1, 1, 'chat', 1),
    (2, 1, 'phone', 0), (2, 2, 'phone', 1),
    (3, 1, 'email', 0), (3, 2, 'phone', 0), (3, 3, 'phone', 1),
    (4, 1, 'chat', 1),
    (5, 1, 'chat', 0), (5, 2, 'email', 1),
    (6, 1, 'phone', 1),
    (7, 1, 'email', 0),
    (8, 1, 'phone', 1),
    (9, 1, 'chat', 0)
)
SELECT ticket_id, contact_no, channel, resolved
FROM contacts
ORDER BY ticket_id, contact_no;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Summarise each ticket: the first channel is `MAX(CASE WHEN contact_no = 1 THEN channel END)`, resolved at all is `MAX(resolved)`, resolved on the first contact is `MAX(contact_no = 1 AND resolved = 1)`.
3. Then group by first channel: `100.0 * SUM(first_resolved) / NULLIF(SUM(resolved), 0)`.

## Solution

```sql
WITH contacts(ticket_id, contact_no, channel, resolved) AS (
  VALUES
    (1, 1, 'chat', 1),
    (2, 1, 'phone', 0), (2, 2, 'phone', 1),
    (3, 1, 'email', 0), (3, 2, 'phone', 0), (3, 3, 'phone', 1),
    (4, 1, 'chat', 1),
    (5, 1, 'chat', 0), (5, 2, 'email', 1),
    (6, 1, 'phone', 1),
    (7, 1, 'email', 0),
    (8, 1, 'phone', 1),
    (9, 1, 'chat', 0)
),
per_ticket AS (
  SELECT ticket_id,
    MAX(CASE WHEN contact_no = 1 THEN channel END) AS first_channel,
    MAX(resolved) AS resolved,
    MAX(contact_no = 1 AND resolved = 1) AS first_resolved
  FROM contacts
  GROUP BY ticket_id
)
SELECT first_channel AS channel, COUNT(*) AS tickets, SUM(resolved) AS resolved,
  ROUND(100.0 * SUM(first_resolved) / NULLIF(SUM(resolved), 0), 1) AS fcr_pct
FROM per_ticket
GROUP BY first_channel
ORDER BY fcr_pct DESC, channel;
```

## Expected result

| channel | tickets | resolved | fcr_pct |
| --- | --- | --- | --- |
| chat | 4 | 3 | 66.7 |
| phone | 3 | 3 | 66.7 |
| email | 2 | 1 | 0 |

## Explanation

First-contact resolution is about tickets, not contacts, so summarise each ticket first: its first channel, whether it was ever resolved and whether contact 1 resolved it. Grouping contacts directly would count ticket 3 three times, under two channels.

The denominator is resolved tickets: a ticket still open has not been resolved on any contact yet, and counting it as a failure would mix unresolved work into a quality rate. Chat and phone both resolve two thirds of their resolved tickets on the first contact. Email's only resolved ticket (ticket 3) needed three contacts, so its rate is 0%, a sign that email questions are being routed or answered poorly.

**Common mistake:** dividing by all tickets. Chat's open ticket 9 would drag its rate to 50%, and the comparison between channels would really be about backlog.

## Wrong answers

Feedback: incorrect-output

```sql
WITH contacts(ticket_id, contact_no, channel, resolved) AS ( VALUES (1, 1, 'chat', 1), (2, 1, 'phone', 0), (2, 2, 'phone', 1), (3, 1, 'email', 0), (3, 2, 'phone', 0), (3, 3, 'phone', 1), (4, 1, 'chat', 1), (5, 1, 'chat', 0), (5, 2, 'email', 1), (6, 1, 'phone', 1), (7, 1, 'email', 0), (8, 1, 'phone', 1), (9, 1, 'chat', 0) ), per_ticket AS (SELECT ticket_id, MAX(CASE WHEN contact_no = 1 THEN channel END) AS first_channel, MAX(resolved) AS resolved, MAX(contact_no = 1 AND resolved = 1) AS first_resolved FROM contacts GROUP BY ticket_id) SELECT first_channel AS channel, COUNT(*) AS tickets, SUM(resolved) AS resolved, ROUND(100.0 * SUM(first_resolved) / COUNT(*), 1) AS fcr_pct FROM per_ticket GROUP BY first_channel ORDER BY fcr_pct DESC, channel;
```
