import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { Link } from 'react-router';

export interface KpiCounterCardProps {
  /** Lucide icon component to render beside the label */
  icon: React.ReactNode;
  /** Label displayed below the count. Accepts a string or a React node (e.g. <Trans>) */
  label: React.ReactNode;
  /** Numeric count to display. undefined renders a skeleton or em dash. */
  count: number | undefined;
  /** Route path the card links to when clicked */
  href: string;
  /** When true, renders a loading skeleton in place of the count */
  isLoading: boolean;
  /** When true, renders an em dash in place of the count */
  isError?: boolean;
}

export function KpiCounterCard({
  icon,
  label,
  count,
  href,
  isLoading,
  isError,
}: KpiCounterCardProps) {
  return (
    <Link to={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
      <Card className="hover:bg-muted/50 cursor-pointer transition-colors h-full py-0 gap-0">
        <CardContent className="flex flex-col gap-1.5 p-3">
          <div className="text-muted-foreground flex items-center gap-2">
            <span className="h-4 w-4 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
            <Text size="sm" textColor="muted">
              {label}
            </Text>
          </div>
          <div className="pl-6">
            {isLoading ? (
              <div className="bg-muted h-8 w-16 animate-pulse rounded" aria-hidden="true" />
            ) : isError ? (
              <Title level={3} className="text-muted-foreground font-semibold">
                &mdash;
              </Title>
            ) : (
              <Title level={3} className="font-semibold">
                {(count ?? 0).toLocaleString()}
              </Title>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
