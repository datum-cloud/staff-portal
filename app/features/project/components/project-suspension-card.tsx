import {
  REINSTATE_AUTHORITIES,
  SUSPENSION_REASONS,
  useProjectSuspension,
} from '../hooks/useProjectSuspension';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { DialogForm } from '@/components/dialog';
import { SectionCard } from '@/features/milo';
import { projectQueryKeys, useProjectSuspensionsQuery } from '@/resources/request/client';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form } from '@datum-cloud/datum-ui/form';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans, useLingui } from '@lingui/react/macro';
import type {
  ComMiloapisResourcemanagerV1Alpha1Project,
  ComMiloapisResourcemanagerV1Alpha1ProjectSuspension,
} from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { useQueryClient } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

type Props = {
  project: ComMiloapisResourcemanagerV1Alpha1Project | undefined;
  className?: string;
};

const suspendSchema = z.object({
  reason: z.enum(['Fraud', 'Abuse', 'Billing', 'Compliance', 'Administrative']),
  reinstateAuthority: z.enum(['Operator', 'Consumer']),
  description: z.string().optional(),
});

export function ProjectSuspensionCard({ project, className }: Props) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const projectName = project?.metadata?.name ?? '';

  const { data: suspensions = [], isLoading } = useProjectSuspensionsQuery(projectName);
  const { suspend, lift } = useProjectSuspension();

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [liftingName, setLiftingName] = useState<string | null>(null);

  // A project stays suspended while any suspension is Active (phase is unset until
  // the controller reconciles, so treat anything not yet Lifted as active).
  const active = suspensions.filter((s) => s.status?.phase !== 'Lifted');
  const history = suspensions.filter((s) => s.status?.phase === 'Lifted');
  const isSuspended = active.length > 0;

  const refetch = async () => {
    await queryClient.invalidateQueries({ queryKey: projectQueryKeys.suspensions(projectName) });
  };

  const handleSuspend = async (data: z.infer<typeof suspendSchema>) => {
    if (!project) return;
    try {
      await suspend(project, data, refetch);
    } catch (error) {
      throw error; // keep the dialog open on failure
    }
  };

  const handleLift = async (s: ComMiloapisResourcemanagerV1Alpha1ProjectSuspension) => {
    setLiftingName(s.metadata?.name ?? '');
    try {
      await lift(s, refetch);
    } finally {
      setLiftingName(null);
    }
  };

  return (
    <>
      <DialogForm
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        title={t`Suspend Project`}
        description={t`Pause this project and everything it is running. Data is preserved and the project can be reinstated at any time.`}
        submitText={t`Suspend`}
        cancelText={t`Cancel`}
        onSubmit={handleSuspend}
        schema={suspendSchema}
        requireDirty={false}
        defaultValues={{ reason: 'Abuse', reinstateAuthority: 'Operator', description: '' }}>
        <Form.Field name="reason" label={t`Reason`} required>
          <Form.Select>
            {SUSPENSION_REASONS.map((r) => (
              <Form.SelectItem key={r} value={r}>
                {r}
              </Form.SelectItem>
            ))}
          </Form.Select>
        </Form.Field>
        <Form.Field name="reinstateAuthority" label={t`Reinstate authority`} required>
          <Form.Select>
            {REINSTATE_AUTHORITIES.map((a) => (
              <Form.SelectItem key={a} value={a}>
                {a}
              </Form.SelectItem>
            ))}
          </Form.Select>
        </Form.Field>
        <Form.Field name="description" label={t`Notes (operator-facing)`}>
          <Form.Textarea placeholder={t`Case notes, report IDs, context…`} />
        </Form.Field>
      </DialogForm>

      <SectionCard
        className={cn(className)}
        title={
          <span className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            <Trans>Trust &amp; Safety</Trans>
          </span>
        }
        description={
          <Trans>
            Suspend or reinstate this project. Suspension is reversible — data is never deleted.
          </Trans>
        }>
        {isLoading ? (
          <Text textColor="muted" size="sm">
            <Trans>Loading…</Trans>
          </Text>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Text size="sm" weight="medium">
                  <Trans>Status</Trans>
                </Text>
                <BadgeState state={isSuspended ? 'Suspended' : 'Active'} />
              </div>
              {!isSuspended && (
                <Button type="warning" size="small" onClick={() => setSuspendOpen(true)}>
                  <Trans>Suspend Project</Trans>
                </Button>
              )}
            </div>

            {active.map((s) => (
              <div
                key={s.metadata?.name}
                className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                <div className="flex items-center justify-between gap-2">
                  <BadgeState state={s.spec?.reason ?? 'Unknown'} />
                  <Button
                    type="tertiary"
                    theme="outline"
                    size="small"
                    loading={liftingName === s.metadata?.name}
                    onClick={() => handleLift(s)}>
                    <Trans>Lift</Trans>
                  </Button>
                </div>
                <DescriptionList
                  labelWidth="40%"
                  items={[
                    {
                      label: <Trans>Reinstate authority</Trans>,
                      value: <Text size="sm">{s.spec?.reinstateAuthority}</Text>,
                    },
                    {
                      label: <Trans>Requested by</Trans>,
                      value: <Text size="sm">{s.spec?.requestedBy}</Text>,
                    },
                    ...(s.spec?.description
                      ? [
                          {
                            label: <Trans>Notes</Trans>,
                            value: <Text size="sm">{s.spec.description}</Text>,
                          },
                        ]
                      : []),
                    {
                      label: <Trans>Suspended at</Trans>,
                      value: (
                        <Text size="sm">
                          <DateTime date={s.metadata?.creationTimestamp} variant="both" />
                        </Text>
                      ),
                    },
                  ]}
                />
              </div>
            ))}

            {history.length > 0 && (
              <div>
                <Text size="sm" weight="medium" className="mb-2 block">
                  <Trans>History</Trans>
                </Text>
                <div className="flex flex-col gap-2">
                  {history.map((s) => (
                    <div key={s.metadata?.name} className="bg-muted/40 rounded-md border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <BadgeState state={s.spec?.reason ?? 'Unknown'} variant="dot" />
                        <Text textColor="muted" size="sm">
                          <Trans>Lifted</Trans> · <DateTime date={s.metadata?.creationTimestamp} />
                        </Text>
                      </div>
                      <Text textColor="muted" size="sm" className="mt-1 block">
                        {s.spec?.requestedBy}
                        {s.spec?.description ? ` — ${s.spec.description}` : ''}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </>
  );
}
