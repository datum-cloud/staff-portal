import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { Link } from 'react-router';

export interface KpiCounterCardProps {
  icon: React.ReactNode;
  label: React.ReactNode;
  count: number | undefined;
  href: string;
  isLoading: boolean;
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
    <Link
      to={href}
      className="focus-visible:ring-ring block rounded-lg focus:outline-none focus-visible:ring-2">
      <Card className="hover:bg-muted/50 h-full cursor-pointer gap-0 py-0 transition-colors">
        <CardContent className="flex flex-col gap-1 p-2.5">
          <div className="text-muted-foreground flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
            <Text size="xs" textColor="muted">
              {label}
            </Text>
          </div>
          <div className="flex h-7 items-center pl-5">
            {isLoading ? (
              <div className="bg-muted h-5 w-14 animate-pulse rounded" aria-hidden="true" />
            ) : isError ? (
              <Title level={4} className="text-muted-foreground leading-none font-semibold">
                &mdash;
              </Title>
            ) : (
              <Title level={4} className="leading-none font-semibold">
                {(count ?? 0).toLocaleString()}
              </Title>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
