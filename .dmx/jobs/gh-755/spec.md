---
ticket: gh-755
branch: bug-gh-755-fix-email-activity-500-by-paginating-the
summary: Fix Email Activity 500 by paginating the milo-system email list
ticketing: github-issues
---

# Fix Email Activity 500 by paginating the milo-system email list

**Ticket:** [#755](https://github.com/datum-cloud/staff-portal/issues/755)
**Type:** bug
**Branch:** bug-gh-755-fix-email-activity-500-by-paginating-the

---

## Context
`/operations/email-activity` returns a 500 in production (Sentry event `c6a0721937994bea9f6ddb6a8e2ca900`, request id `e27a7e8e-299b-9fa2-9d3c-93b481058cf5`). The page asks for every Email in `milo-system` in one unpaginated request. Each Email includes `status.htmlBody` and `status.textBody`, so the response grows with every email sent.

The error envelope (`HTTP_ERROR`, "An unexpected error occurred") comes from the `default` branch of `onResponseError` in `app/modules/axios/axios.server.ts` when there is no upstream response. That matches axios aborting on the 32 MB `maxContentLength` cap. The other request continued after the user navigated away because the query function ignores the abort signal.

## Scope
- `app/resources/request/client/apis/email.api.ts`: page through the list with `limit` / `continue` and pass the abort `signal`.
- `app/features/email/components/email-list.tsx`: load pages instead of the whole list.
- `app/routes/operation/email-activity/index.tsx`: stop passing `{}` (unbounded).
- `app/routes/customer/project/detail/email-activity.tsx`: check for the same unbounded fetch.

## Out of Scope
- The 32 MB cap in `axios.server.ts`. It is doing its job and stays.
- `summarizeEmailDelivery` in `app/server/routes/platform.ts`, which already pages.
- Upstream API changes (time-ordered listing, field selection to drop bodies). Those belong to milo.
- `projectSuspensionWarningEmailListQuery`. It is label-filtered and bounded.

## Technical Approach
- Follows the request layering in systemPatterns: page → query hook / `useQuery` → API function → generated SDK. The API function keeps calling `listNotificationMiloapisComV1Alpha1NamespacedEmail` and gains `limit`, `cursor` and `signal`, using `ListQueryParams` from `app/resources/schemas/common.schema.ts`.
- In `EmailList`, pass React Query's `signal` into `fetchFn`. A client abort then reaches `isClientAbort` in the proxy and returns 499 instead of a Sentry error.
- Loading (decided after Q1): the list API can't sort and Email names are deterministic hashes, so the portal walks every page (`limit: 100`, following `continue` until it's empty) and `ListTable` sorts newest first over the full set. Each upstream response stays far under the 32 MB cap. Load time still grows with the total, and the milo issue below is the long-term fix.
- Newest-first ordering upstream is raised separately as milo-os/milo#932 (developer's decision). When it ships, the portal switches to it.
- Confirm the root cause in server logs before implementing (`maxContentLength size of 33554432 exceeded` for the request id above).

---

## Questions
<!-- Answer each question before running /dmx/plan. -->

1. Upstream returns emails in name order, not newest first. Should the page fetch only the first N pages and sort client-side, or page through on demand and accept that "newest" only applies within loaded rows?
   Answer: it should be newest 

2. `ListTable` search, filters (priority, status) and sort currently work client-side over the full list. Once paginated, is filtering over loaded rows acceptable, or do any filters need to become server-side (label/field selectors)?
   Answer: filtering loaded is fine for now

3. Page size: reuse 500 (as in `summarizeEmailDelivery`), or go smaller given each Email carries full HTML/text bodies?
   Answer: lets do 100

4. The project-detail Email Activity tab also uses `EmailList`. Should it move to the same paginated behaviour in this ticket?
   Answer: yes
