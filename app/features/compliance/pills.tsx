import { Badge } from '@datum-cloud/datum-ui/badge';
import { Text } from '@datum-cloud/datum-ui/typography';

interface PillsProps {
  values?: readonly string[];
}

/**
 * Renders a list of strings as compact pill-style badges, with a muted "-"
 * fallback when the list is empty.
 */
export function Pills({ values }: PillsProps) {
  if (!values || values.length === 0) {
    return (
      <Text size="sm" textColor="muted">
        -
      </Text>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {values.map((value) => (
        <Badge key={value} type="muted" theme="solid" className="font-normal">
          {value}
        </Badge>
      ))}
    </div>
  );
}
