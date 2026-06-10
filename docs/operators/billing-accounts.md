# Billing Accounts

This guide is for staff users (support, ops, finance liaison) who need to
stand up billing attribution for an organization: create the
`BillingAccount`, bind the org's projects to it, and verify that usage is
flowing. It assumes you already have staff portal access and a working
`kubectl` against the milo control plane (the staff portal does not yet
have a UI to _create_ billing accounts — it only displays them and their
usage).

> **Important:** Today this work only **attributes** usage to an account.
> No invoices are generated, no charges are processed, no customer sees a
> bill. The goal is to prove the metering layer end-to-end before money
> moves.

## What you can do here

- Create a `BillingAccount` under an organization.
- Bind one or more of the org's projects to that account so the usage
  pipeline knows who would pay for resources in each project.
- Verify in the staff portal that metered usage is reaching Amberflo and
  attributed to the account you just created.

## Where things live

| Resource                | Where                                   | API group                       |
| ----------------------- | --------------------------------------- | ------------------------------- |
| `BillingAccount`        | `organization-<orgname>` namespace      | `billing.miloapis.com/v1alpha1` |
| `BillingAccountBinding` | `organization-<orgname>` namespace      | `billing.miloapis.com/v1alpha1` |
| Usage view              | Staff portal → **Organization → Usage** | (Amberflo, read-through)        |

`BillingAccount` and `BillingAccountBinding` are both org-scoped. There is
no global "all billing accounts" view.

## 1. Create a `BillingAccount`

Apply this against the milo control plane:

```yaml
apiVersion: billing.miloapis.com/v1alpha1
kind: BillingAccount
metadata:
  name: acme-primary
  namespace: organization-acme
spec:
  currencyCode: USD
  paymentTerms:
    netDays: 30
    invoiceFrequency: Monthly
    invoiceDayOfMonth: 1
  contactInfo:
    email: billing@acme.example
    name: Acme Billing
```

Notes:

- `currencyCode` is immutable once the account leaves `Provisioning` — get
  it right at create.
- `paymentTerms` and `contactInfo` are forward-looking. They have no
  invoicing effect today; they exist so the data is in place when
  invoicing turns on.
- The account's `metadata.uid` becomes Amberflo's `customerId`. There is
  no parallel ID to maintain.

Wait for `status.phase: Ready`:

```sh
kubectl -n organization-acme get billingaccount acme-primary \
  -o jsonpath='{.status.phase}'
```

`Provisioning → Ready` means the provider sync controller has created
the matching Amberflo customer. If it sticks in `Provisioning`, hand it
to engineering with the account name and namespace — see the
[runbook](https://github.com/datum-cloud/billing/blob/main/docs/runbooks/usage-metering.md).

## 2. Bind projects to the account

A `BillingAccountBinding` is the source of truth for "who would pay for
usage in this project." **Bindings are immutable** — to rebind a project
to a different account, you create a new binding and the old one
transitions to `Superseded`.

```yaml
apiVersion: billing.miloapis.com/v1alpha1
kind: BillingAccountBinding
metadata:
  name: acme-prod-to-primary
  namespace: organization-acme
spec:
  billingAccountRef:
    name: acme-primary
  projectRef:
    name: acme-prod
```

Repeat per project. List the org's bindings to confirm coverage:

```sh
kubectl -n organization-acme get billingaccountbindings
```

You should see one `Active` binding per project that's expected to
generate billable usage. A project with no `Active` binding will have its
usage events held in the quarantine stream — they aren't lost, but they
aren't attributed either.

### Rebinding mid-period

If you need to move a project to a different account:

```sh
kubectl -n organization-acme apply -f - <<'YAML'
apiVersion: billing.miloapis.com/v1alpha1
kind: BillingAccountBinding
metadata:
  name: acme-prod-to-secondary
  namespace: organization-acme
spec:
  billingAccountRef:
    name: acme-secondary
  projectRef:
    name: acme-prod
YAML
```

The previous binding transitions to `Superseded` automatically. Usage
that occurred before the new binding's `status.billingResponsibility.establishedAt`
remains attributed to the old account; usage after that moment lands on
the new account. This is by design and is the source of truth for
mid-period account changes.

## 3. Verify usage is flowing

Open the staff portal, find the organization, and go to:

**Organization → Usage**

You'll see a line chart per `MeterDefinition` registered on the platform,
showing daily totals for the last 30 days summed across every
`BillingAccount` in the org.

What the page tells you, depending on what it shows:

| The page shows                         | What it means                                                                                                                    | Next step                                                                                                                                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Charts with values                     | Metering is working end-to-end for at least one meter.                                                                           | Nothing — this is success.                                                                                                                                                                   |
| Page says **no billing account**       | The org has no `BillingAccount` yet, or your token can't list them.                                                              | Re-check §1. If the account exists, this is an RBAC issue — see the runbook.                                                                                                                 |
| Page says **no meters**                | No `MeterDefinition` is registered at all.                                                                                       | This is a platform-level state, not org-specific. Engineering issue.                                                                                                                         |
| Page renders but every meter is flat   | Either no service is emitting yet, the project isn't bound (§2), the meter isn't `Published`, or events are stuck in quarantine. | Hand to engineering with the org name, account name, and meter; they'll work the [usage-metering runbook](https://github.com/datum-cloud/billing/blob/main/docs/runbooks/usage-metering.md). |
| Page says **unconfigured**             | The staff portal deployment doesn't have an Amberflo API key set.                                                                | SRE config issue, not org-specific.                                                                                                                                                          |
| Page says **insufficient permissions** | Your staff role can't list `BillingAccount` in this org.                                                                         | Ask your manager to raise your role, or check that the platform admin role binding is in place.                                                                                              |

The chart is summed across all `BillingAccount`s in the org. If the org
has multiple accounts and you need a per-account breakdown, that's a
direct Amberflo console query today (filter by `customerId =` the
`BillingAccount.metadata.uid`).

## What you can't do here

- **Create or edit a `BillingAccount` from the staff portal.** Use
  `kubectl` against the milo control plane. A staff-portal create flow is
  a future enhancement.
- **Edit a `BillingAccountBinding` in place.** Bindings are immutable.
  Create a new one; the old one is `Superseded` automatically.
- **Delete a `BillingAccount` that has active bindings.** Supersede or
  delete the bindings first.
- **See invoices, charges, or rated totals.** This phase is measurement
  and attribution only. The usage view shows raw consumption per meter.
- **Backfill usage.** Meters start counting when a service starts
  emitting; we do not replay history into Amberflo.

## When something looks wrong

- Account stuck in `Provisioning`, binding stuck without `Active`, or
  every meter flat for an org you know is using the platform — escalate
  to engineering with the org name, account name (if any), and the
  approximate time window you're investigating. They'll work the
  [usage-metering runbook](https://github.com/datum-cloud/billing/blob/main/docs/runbooks/usage-metering.md).
- Customer asks "is what I see in the cloud portal correct?" — the
  cloud-portal usage view and the staff-portal usage view both read from
  the same Amberflo data; numbers should match. If they don't, that's
  the runbook's "wrong account attributed" / "provider lag" path.

## Cross-references

- Service developer guide (declaring meters and emitting events):
  [billing/docs/emitting-usage.md](https://github.com/datum-cloud/billing/blob/main/docs/emitting-usage.md)
- Pipeline design:
  [billing/docs/enhancements/usage-pipeline.md](https://github.com/datum-cloud/billing/blob/main/docs/enhancements/usage-pipeline.md)
- Support runbook:
  [billing/docs/runbooks/usage-metering.md](https://github.com/datum-cloud/billing/blob/main/docs/runbooks/usage-metering.md)
