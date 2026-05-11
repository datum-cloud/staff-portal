# Feature Flags

This guide is for staff users (sales, support, ops) who need to turn a feature
on or off for a specific organization. It assumes you already have staff
portal access.

## What you can do here

- Browse every feature flag registered across the platform.
- See which orgs have a given flag turned on right now.
- Toggle a flag on or off for a single org. Toggling on creates an
  entitlement; toggling off revokes it. The next evaluation in the calling
  service picks up the change.
- See who flipped the switch and when, via the activity timeline (and the
  underlying audit log).

## Where the page lives

Open the staff portal, find the organization, and go to:

**Organization → Quota → Feature Flags**

You'll see a table of every registered flag with a switch in the right
column. The switch's current state reflects whether the org has an active
grant for that flag.

## Toggling a flag

1. Find the flag in the table. The display name comes from the
   `kubernetes.io/display-name` annotation on the registration; the
   description is below it.
2. Flip the switch.
3. Confirm in the dialog. Each toggle records your identity in the resource —
   the `staff-portal.miloapis.com/enabled-by` annotation captures your email
   on create, and the underlying `ResourceGrant` create/delete is recorded in
   the Kubernetes audit log.

There is no batch toggle. Each flag is flipped individually, deliberately —
this is the same machinery as quota grants, so the audit trail per-flag is
intentional.

## Reading the audit trail

Every toggle is a `ResourceGrant` create or delete attributable to the staff
user. Two ways to read it:

- **Activity timeline** in the org detail view — surfaces grant create/delete
  events alongside other org changes.
- **Kubernetes audit log** for the milo control plane — definitive record.
  Query by `objectRef.resource=resourcegrants` and the org namespace
  (`organization-<orgname>`). The SRE team can pull this if needed.

## When the switch doesn't seem to work

A flag that's been toggled on but isn't visibly enabling the feature is
almost always one of three things: the org doesn't have an `AllowanceBucket`
yet (reconciliation lag), the calling service hasn't picked up the new
bucket, or the flag was registered without the
`app.kubernetes.io/component: feature-flags` label (in which case it won't
appear in this page at all).

If the toggle itself errors, or a flag is enabled in the table but the
feature doesn't activate end-to-end, hand it to engineering with the org
name, the flag name, and the approximate time you flipped it — they'll work
through the [feature-flags
runbook](https://github.com/datum-cloud/milo/blob/main/docs/runbooks/feature-flags.md).

## What you can't do here

- Grant a flag to a single user, project, or percentage of users. Flags are
  org-scoped booleans only.
- Set a flag for "all orgs" in one click. Each org is toggled individually.
- Create new flags. New flags are registered by the engineering team that
  owns the feature (see the [developer
  guide](https://github.com/datum-cloud/milo/blob/main/docs/providers/openfeature.md)).
