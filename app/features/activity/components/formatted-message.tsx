import { FormattedAuditMessage } from '@/modules/loki';
import { Trans } from '@lingui/react/macro';

interface FormattedMessageProps {
  message: FormattedAuditMessage;
}

/**
 * Renders a formatted audit message with semantic HTML structure
 * Allows for CSS styling of individual components (user, verb, resource, etc.)
 */
export function FormattedMessage({ message }: FormattedMessageProps) {
  const renderMessage = () => {
    const parts: React.ReactNode[] = [];

    // User part
    parts.push(
      <span key="user" className="activity-log-user font-semibold text-gray-900">
        {message.user}
      </span>
    );

    parts.push(' ');

    // Verb part
    parts.push(
      <span key="verb" className="activity-log-event text-gray-700">
        {message.verb}
      </span>
    );

    parts.push(' the ');

    // Resource part
    parts.push(
      <span key="resource" className="activity-log-resource font-medium text-gray-900">
        {message.resource}
      </span>
    );

    // Resource name if present
    if (message.resourceName) {
      parts.push(' ');
      parts.push(
        <span key="resourceName" className="font-mono text-gray-700">
          {message.resourceName}
        </span>
      );
    }

    // Namespace if present
    if (message.namespace) {
      parts.push(' ');
      parts.push(<Trans key="inThe">in the</Trans>);
      parts.push(' ');
      parts.push(
        <span key="namespace" className="activity-log-namespace font-mono text-gray-700">
          {message.namespace}
        </span>
      );
      parts.push(' ');
      parts.push(<Trans key="namespace_label">namespace</Trans>);
    }

    return parts;
  };

  return (
    <div className="space-y-2">
      <div className="text-sm leading-relaxed break-words">{renderMessage()}</div>

      {message.errorMessage && (
        <div className="border-t border-gray-200 pt-1">
          <p className="activity-log-error-message text-sm leading-relaxed break-words text-red-700">
            {message.errorMessage}
          </p>
        </div>
      )}
    </div>
  );
}
