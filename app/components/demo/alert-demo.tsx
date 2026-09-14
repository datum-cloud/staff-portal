import { DemoGroup, DemoSection, type DemoSectionMeta } from './demo-section';
import { ActionCard } from '@/components/action-card';
import { DangerZoneCard } from '@/components/danger-zone-card';
import { MessageCard } from '@/components/message-card';
import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { Button } from '@datum-cloud/datum-ui/button';
import { toast } from '@datum-cloud/datum-ui/toast';
import { AlertTriangle, CheckCircle2, Info, RotateCcw } from 'lucide-react';

export const alertDemoSections: DemoSectionMeta[] = [
  { id: 'alert-variants', label: 'Alert' },
  { id: 'action-card', label: 'ActionCard' },
  { id: 'message-card', label: 'MessageCard' },
  { id: 'danger-zone', label: 'DangerZoneCard' },
];

export default function AlertDemo() {
  return (
    <DemoGroup
      title="Alerts & Callouts"
      description="datum-ui Alert plus staff-portal's callout, empty-state, and danger-zone cards.">
      <DemoSection
        id="alert-variants"
        title="Alert"
        description="datum-ui Alert — variants and a closable example.">
        <div className="space-y-3">
          <Alert variant="info">
            <Info className="h-4 w-4" />
            <AlertTitle>Heads up</AlertTitle>
            <AlertDescription>This organization is on the legacy quota plan.</AlertDescription>
          </Alert>
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Approved</AlertTitle>
            <AlertDescription>The registration request has been approved.</AlertDescription>
          </Alert>
          <Alert variant="warning" closable>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Nearing quota</AlertTitle>
            <AlertDescription>This project is at 92% of its ALB quota.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Payment failed</AlertTitle>
            <AlertDescription>The billing account could not be charged.</AlertDescription>
          </Alert>
        </div>
      </DemoSection>

      <DemoSection
        id="action-card"
        title="ActionCard"
        description="Callout banner with an icon, copy, and an action slot.">
        <div className="space-y-3">
          <ActionCard
            variant="info"
            icon={Info}
            title="Suspended project"
            description="This project is suspended. Lift the suspension to restore access."
            action={
              <Button type="secondary" size="small" icon={<RotateCcw className="h-4 w-4" />}>
                Lift suspension
              </Button>
            }
          />
          <ActionCard
            variant="warning"
            icon={AlertTriangle}
            title="Unverified email"
            description="The account owner has not verified their email address."
            action={
              <Button type="warning" size="small">
                Resend verification
              </Button>
            }
          />
          <ActionCard
            variant="success"
            icon={CheckCircle2}
            title="All checks passed"
            description="No outstanding fraud signals on this organization."
          />
        </div>
      </DemoSection>

      <DemoSection
        id="message-card"
        title="MessageCard"
        description="Centered fallback for failed queries, empty datasets, and no-access states."
        bare>
        <MessageCard
          className="m-0"
          message="No audit logs in the selected range."
          detail="Try widening the time window."
          actions={
            <Button type="secondary" theme="outline" size="small">
              Reset filters
            </Button>
          }
        />
      </DemoSection>

      <DemoSection
        id="danger-zone"
        title="DangerZoneCard"
        description="Destructive action wrapped in a confirm dialog. (Confirm is a no-op here.)"
        bare>
        <DangerZoneCard
          className="mt-0"
          deleteTitle="Delete this user"
          deleteDescription="Permanently remove the user and revoke all access."
          dialogTitle="Delete user?"
          dialogDescription="This cannot be undone. The user will lose access immediately."
          onConfirm={() => {
            toast.success('Confirmed (demo — nothing was deleted)');
          }}
        />
      </DemoSection>
    </DemoGroup>
  );
}
