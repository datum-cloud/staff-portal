import { getOrganizationDetailMetadata } from '../../shared';
import type { Route } from './+types/index';
import { authenticator } from '@/modules/auth';
import { getOrgControlPlaneBaseURL } from '@/resources/request/client/apis/control-plane';
import { env } from '@/utils/config/env.server';
import { metaObject } from '@/utils/helpers';
import { listBillingMiloapisComV1Alpha1NamespacedBillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';
import { UnwrapProxyResponse } from '@openapi/shared/core/types.gen';
import { format } from 'date-fns';
import { BarChart3 } from 'lucide-react';
import { data, useLoaderData } from 'react-router';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export const handle = {
  breadcrumb: () => 'Usage',
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { organizationName } = getOrganizationDetailMetadata(matches);
  return metaObject(`Usage - ${organizationName}`);
};

interface MeterSeries {
  meterApiName: string;
  label: string;
  values: { timestamp: number; value: number }[];
}

interface MeterDefinition {
  // Amberflo meterApiName, which the amberflo-provider sets to the
  // MeterDefinition's metadata.uid (not spec.meterName) for charset/length
  // safety. See milo-os/amberflo-provider meterdefinition_controller.go.
  meterApiName: string;
  displayName: string;
}

async function listMeterDefinitions(token: string): Promise<MeterDefinition[]> {
  // MeterDefinitions are cluster-scoped and granted to system:authenticated.
  // Fall back to an empty list on any error so the page shows 'no-meters'.
  try {
    const url = `${env.API_URL}/apis/billing.miloapis.com/v1alpha1/meterdefinitions`;
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!resp.ok) return [];
    const json = (await resp.json()) as {
      items?: {
        metadata?: { uid?: string };
        spec?: { meterName?: string; displayName?: string };
      }[];
    };
    const items = json.items ?? [];
    return items
      .map((item) => ({
        meterApiName: item.metadata?.uid ?? '',
        displayName: item.spec?.displayName ?? item.spec?.meterName ?? '',
      }))
      .filter((m) => m.meterApiName);
  } catch {
    return [];
  }
}

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const token = session?.accessToken ?? '';

  const orgName = params.orgName;
  if (!orgName) {
    return data({ status: 'unconfigured' as const, meters: [] });
  }

  const apiKey = env.amberfloApiKey;
  if (!apiKey) {
    return data({ status: 'unconfigured' as const, meters: [] });
  }

  const orgNamespace = `organization-${orgName}`;
  const orgBaseURL = getOrgControlPlaneBaseURL(orgName);

  // List BillingAccounts in the org namespace. Every account in the org rolls
  // up here since the Amberflo data only carries customerId (= account uid);
  // there is no per-project dimension on submitted events today.
  let accountsResp;
  try {
    accountsResp = await listBillingMiloapisComV1Alpha1NamespacedBillingAccount({
      baseURL: orgBaseURL,
      path: { namespace: orgNamespace },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      return data({ status: 'insufficient-permissions' as const, meters: [] });
    }
    throw err;
  }

  const accounts = accountsResp.data as unknown as UnwrapProxyResponse<typeof accountsResp.data>;
  const customerIds = (accounts?.items ?? [])
    .map((a) => a.metadata?.uid)
    .filter((uid): uid is string => !!uid);

  if (customerIds.length === 0) {
    return data({ status: 'no-billing-account' as const, meters: [] });
  }

  const meterDefs = await listMeterDefinitions(token);
  if (meterDefs.length === 0) {
    return data({ status: 'no-meters' as const, meters: [] });
  }

  const amberfloBaseUrl = env.amberfloBaseUrl;
  const nowSec = Math.floor(Date.now() / 1000);
  const startSec = nowSec - 30 * 24 * 3600;

  const meters = await Promise.all(
    meterDefs.map(async ({ meterApiName, displayName }): Promise<MeterSeries> => {
      try {
        const resp = await fetch(`${amberfloBaseUrl}/usage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            meterApiName,
            aggregation: 'sum',
            timeGroupingInterval: 'day',
            timeRange: { startTimeInSeconds: startSec, endTimeInSeconds: nowSec },
            filter: { customerId: customerIds },
            groupBy: ['customerId'],
          }),
        });

        if (!resp.ok) {
          return { meterApiName, label: displayName, values: [] };
        }

        const json = (await resp.json()) as {
          clientMeters?: { values?: { secondsSinceEpochUtc: number; value: number }[] }[];
        };
        // Sum across all clientMeters (one per customerId group) per bucket.
        const buckets = new Map<number, number>();
        for (const cm of json.clientMeters ?? []) {
          for (const v of cm.values ?? []) {
            buckets.set(
              v.secondsSinceEpochUtc,
              (buckets.get(v.secondsSinceEpochUtc) ?? 0) + v.value
            );
          }
        }
        const values = [...buckets.entries()]
          .sort(([a], [b]) => a - b)
          .map(([ts, value]) => ({ timestamp: ts * 1000, value }));
        return { meterApiName, label: displayName, values };
      } catch {
        return { meterApiName, label: displayName, values: [] };
      }
    })
  );

  return data({ status: 'ok' as const, meters });
};

function MeterChart({ meter }: { meter: MeterSeries }) {
  const hasData = meter.values.length > 0;

  return (
    <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6 pb-3">
        <h3 className="text-base leading-none font-semibold tracking-tight">{meter.label}</h3>
        <p className="text-muted-foreground text-sm">Last 30 days</p>
      </div>
      <div className="p-6 pt-0">
        {!hasData ? (
          <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
            No usage in last 30 days
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={meter.values} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(ts: number) => format(new Date(ts), 'MMM d')}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--foreground)', fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={55}
                tick={{ fill: 'var(--foreground)', fontSize: 11 }}
              />
              <Tooltip
                labelFormatter={(ts) => format(new Date(ts as number), 'MMM d, yyyy HH:mm')}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default function UsagePage() {
  const result = useLoaderData<typeof loader>();

  const emptyState = (() => {
    switch (result.status) {
      case 'unconfigured':
        return {
          title: 'Usage data not available',
          body: (
            <>
              Configure <code>AMBERFLO_API_KEY</code> to enable this view.
            </>
          ),
        };
      case 'insufficient-permissions':
        return {
          title: 'Usage data not available',
          body: 'Billing permissions are still being provisioned for this organization. Check back soon or contact the platform team if this persists.',
        };
      case 'no-billing-account':
        return {
          title: 'No billing account',
          body: 'This organization does not have a billing account. Usage data is keyed to a billing account, so there is nothing to display.',
        };
      case 'no-meters':
        return {
          title: 'No meters configured',
          body: 'No MeterDefinitions were found. Verify that the billing meter pipeline is running and that meters have been configured for this environment.',
        };
      case 'ok':
        if (result.meters.length === 0 || result.meters.every((m) => m.values.length === 0)) {
          return {
            title: 'No usage to display',
            body: 'Usage data will appear here once this organization starts consuming metered resources.',
          };
        }
        return null;
    }
  })();

  return (
    <div className="m-4 flex flex-col gap-4">
      {emptyState ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <BarChart3 className="text-muted-foreground h-10 w-10" aria-hidden="true" />
          <p className="text-lg font-medium">{emptyState.title}</p>
          <p className="text-muted-foreground max-w-sm text-sm">{emptyState.body}</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {result.status === 'ok' &&
            result.meters.map((meter) => <MeterChart key={meter.meterApiName} meter={meter} />)}
        </div>
      )}
    </div>
  );
}
