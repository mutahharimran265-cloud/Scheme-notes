# Entitlements (subscription features)

SchemNotes gates its paid capabilities through a small, self-contained
entitlements system. **No billing integration is required to use it** — features
can be unlocked with an environment flag or per-account, so you can ship, demo,
and give testers access before wiring Stripe.

## The plans

| Plan   | What it adds |
|--------|--------------|
| `free` | The full interactive review experience on every file format (incl. KiCad). Limited by **volume**, not capability: 5 uploads/month, 10 MB attachments. |
| `pro`  | Cloud sync, automated backups, comment **version history**, scriptable API tokens, unlimited uploads, 50 MB attachments. |
| `team` | Everything in Pro, plus **team workspaces** (roles + per-project access), **priority-support** flag, 100 MB attachments, and notifications/integrations hooks. |

The five subscription features and where they are enforced:

| Feature | Server gate (authoritative, returns HTTP 402) | Client gate (UI only) |
|---|---|---|
| Cloud sync across devices | `POST /api/cloud/config`, `POST /api/cloud/sync`, `GET/PUT /api/sync` | dashboard renders `CloudSync` only when entitled |
| Team / shared workspaces | `POST /api/teams` (create) | `TeamsPanel` hidden unless entitled |
| Automated backups | `GET/POST /api/backups` | `BackupsPanel` hidden unless entitled |
| Version history | `GET /api/comments/[id]/versions` | "History" button shows a Pro upsell on 402 |
| Higher attachment limits | `POST /api/attachments` (per-plan byte cap) | dashboard shows the current limit |
| Priority-support flag | `Account.prioritySupport` (data) | dashboard badge |

## How a plan is resolved

Effective plan = **the higher of** (a) the per-account plan and (b) the
deployment-wide env flag:

```
effectivePlan(email) = max( Account.plan for that email , SCHEMNOTES_PLAN )
```

- `entitlements.ts` — the sync source of truth: `hasFeature(feature, plan)`,
  `planLimits(plan)`, `getPlan()` (reads `SCHEMNOTES_PLAN`).
- `plan.ts` — the per-account layer: `getPlanForEmail(email)`,
  `hasFeatureForEmail(feature, email)` (async, server-side),
  `uploadAllowance(email)`.

**Rule:** server code must gate with `hasFeature` / `hasFeatureForEmail` /
`planLimits` (authoritative). Client code may also check, but only to show/hide
UI — never as the security boundary.

## Unlocking features without billing

Two independent switches, use either or both:

1. **Deployment-wide (simple self-host / demo):** set the env flag.
   ```
   SCHEMNOTES_PLAN=pro     # or: team
   ```
   Everyone on that deployment gets that plan as a floor.

2. **Per user (grant a specific tester):** create/update their `Account` row.
   ```sql
   -- SQLite (local): prisma/dev.db   |   Postgres (cloud): your DATABASE_URL
   INSERT INTO "Account" (email, plan, "prioritySupport", "createdAt", "updatedAt")
   VALUES ('tester@example.com', 'team', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
   ON CONFLICT(email) DO UPDATE SET plan = excluded.plan;
   ```
   Or, once Stripe is wired, the billing webhook writes this row automatically.

## Adding a new gated feature

1. Add the feature name to the `Feature` union and the right plan array in
   `entitlements.ts`.
2. Gate the server route: `if (!(await hasFeatureForEmail("my_feature", email)))
   return 402`.
3. Gate the UI: render the control only when `hasFeature("my_feature", plan)`
   (or handle the 402 with an upsell message).
