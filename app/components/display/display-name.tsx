import { Text } from '@/components/typography';
import { Link } from 'react-router';

interface NameDisplayProps {
  /** The display name/description to show as the main link text */
  displayName: string;
  /** The ID/name to show as subtext */
  name: string;
  /** The route to navigate to */
  to: string;
  /** Optional className for the container */
  className?: string;
}

/**
 * A reusable component for displaying name-description pairs in data tables.
 * Shows the display name as a clickable link with the actual name as subtext.
 *
 * @example
 * ```tsx
 * <NameDisplay
 *   displayName="John Doe"
 *   name="john.doe@example.com"
 *   to="/users/john.doe"
 * />
 * ```
 */
export const NameDisplay = ({ displayName, name, to, className = '' }: NameDisplayProps) => {
  return (
    <div className={`flex flex-col ${className}`}>
      <div>
        <Link to={to}>{displayName}</Link>
      </div>
      <Text size="sm" textColor="muted">
        {name}
      </Text>
    </div>
  );
};
