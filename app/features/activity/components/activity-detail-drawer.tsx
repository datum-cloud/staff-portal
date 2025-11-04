import { BadgeState } from '@/components/badge';
import { DateFormatter } from '@/components/date';
import { ActivityLogEntry } from '@/modules/loki';
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shadcn/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/modules/shadcn/ui/sheet';
import { Tooltip } from '@datum-ui/tooltip';
import { Text } from '@datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { formatDistanceToNowStrict } from 'date-fns';
import { AlertTriangle, CheckCircle, Info, XCircle, Copy, Code, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface ActivityDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: ActivityLogEntry | null;
}

type TabType = 'overview' | 'raw';

// Detailed HTTP status descriptions for tooltips
const HTTP_STATUS_DESCRIPTIONS: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
};

export default function ActivityDetailDrawer({
  open,
  onOpenChange,
  entry,
}: ActivityDetailDrawerProps) {
  const { t } = useLingui();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showRequestManagedFields, setShowRequestManagedFields] = useState(false);
  const [showResponseManagedFields, setShowResponseManagedFields] = useState(false);

  if (!entry) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getDetailedStatusDescription = (code?: number) => {
    if (!code) return undefined;
    return HTTP_STATUS_DESCRIPTIONS[code as keyof typeof HTTP_STATUS_DESCRIPTIONS];
  };

  const renderCopyableField = (label: string, value: string | undefined, fieldKey: string) => {
    if (!value) return null;

    return (
      <div className="flex items-start justify-between gap-4 py-1.5">
        <div className="flex-1">
          <Text textColor="muted" className="text-xs font-medium tracking-wide uppercase">
            {label}
          </Text>
          <p className="mt-1 font-mono text-sm break-words whitespace-pre-wrap text-gray-800">
            {value}
          </p>
        </div>
        <button
          onClick={() => handleCopy(value, fieldKey)}
          className="flex-shrink-0 rounded p-2 transition-colors hover:bg-gray-100"
          title={t`Copy to clipboard`}
          type="button">
          <Copy
            size={16}
            className={copiedField === fieldKey ? 'text-green-600' : 'text-gray-600'}
          />
        </button>
      </div>
    );
  };

  const renderCodeblockField = (label: string, value: string | undefined, fieldKey: string) => {
    if (!value) return null;

    return (
      <div className="space-y-1">
        <Text textColor="muted" className="text-xs font-medium tracking-wide uppercase">
          {label}
        </Text>
        <div className="relative">
          <pre className="overflow-x-auto rounded bg-gray-900 p-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-gray-100">
            {value}
          </pre>
          <button
            onClick={() => handleCopy(value, fieldKey)}
            className="absolute top-2 right-2 rounded bg-blue-600 p-2 text-xs font-medium text-white shadow-lg transition-colors hover:bg-blue-700"
            title={t`Copy to clipboard`}
            type="button">
            <Copy size={14} />
          </button>
        </div>
      </div>
    );
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Kubernetes managed fields to filter (control-plane managed)
  const MANAGED_FIELDS_KEYWORDS = [
    'managedFields',
    'resourceVersion',
    'uid',
    'generation',
    'selfLink',
    'creationTimestamp',
  ];

  const filterManagedFields = (data: any): any => {
    if (!data || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map((item) => filterManagedFields(item));

    const filtered: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (!MANAGED_FIELDS_KEYWORDS.includes(key)) {
        filtered[key] = filterManagedFields(value);
      }
    }
    return filtered;
  };

  const renderExpandableJson = (
    label: string,
    data: any,
    sectionId: string,
    showManagedFields: boolean = false
  ) => {
    if (!data) return null;

    const isExpanded = expandedSections[sectionId];
    const displayData = showManagedFields ? data : filterManagedFields(data);
    let jsonString = '';
    try {
      jsonString = JSON.stringify(displayData, null, 2);
    } catch {
      return null;
    }

    const hasManagedFields = JSON.stringify(data) !== JSON.stringify(displayData);

    return (
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <button
          onClick={() => toggleSection(sectionId)}
          className="flex w-full items-center justify-between bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100"
          type="button">
          <Text textColor="muted" className="text-xs font-bold tracking-wider uppercase">
            {label}
          </Text>
          <ChevronDown
            size={16}
            className={`text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
        {isExpanded && (
          <div className="max-h-96 overflow-auto bg-gray-900 p-3 text-gray-100">
            <div className="sticky top-0 right-0 -mx-3 -mt-3 mb-2 flex flex-col gap-2 bg-gradient-to-b from-gray-900 to-transparent px-3 pt-3 pb-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => handleCopy(jsonString, sectionId)}
                  className="flex items-center gap-1.5 rounded bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg transition-colors hover:bg-blue-700"
                  title={t`Copy JSON`}
                  type="button">
                  <Copy size={14} />
                  <span>{copiedField === sectionId ? t`Copied!` : t`Copy`}</span>
                </button>
              </div>
              {hasManagedFields && (
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={showManagedFields}
                    onChange={() =>
                      sectionId.includes('request')
                        ? setShowRequestManagedFields(!showManagedFields)
                        : setShowResponseManagedFields(!showManagedFields)
                    }
                    className="cursor-pointer"
                  />
                  <span>Show managed fields</span>
                </label>
              )}
            </div>
            <pre className="font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
              {jsonString}
            </pre>
          </div>
        )}
      </div>
    );
  };

  const renderSection = (title: string, children: React.ReactNode) => {
    return (
      <Card className="border-2 border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="border-b-2 border-gray-100 pb-2">
          <CardTitle className="text-sm font-bold tracking-wider text-gray-900 uppercase">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-2">{children}</CardContent>
      </Card>
    );
  };

  const renderRawJson = () => {
    if (!entry.raw) {
      return (
        <div className="flex h-64 items-center justify-center text-gray-500">
          <p>No raw audit log data available</p>
        </div>
      );
    }

    try {
      // Try to parse and pretty-print the JSON
      const parsed = JSON.parse(entry.raw);
      const formatted = JSON.stringify(parsed, null, 2);
      return (
        <pre className="overflow-x-auto rounded bg-gray-900 p-4 font-mono text-xs leading-relaxed text-gray-100">
          {formatted}
        </pre>
      );
    } catch {
      // If it's not JSON, just display as is
      return (
        <pre className="overflow-x-auto rounded bg-gray-900 p-4 font-mono text-xs leading-relaxed text-gray-100">
          {entry.raw}
        </pre>
      );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex h-[80vh] flex-col p-0">
        <SheetHeader className="flex-shrink-0 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-3">
              {entry.category === 'success' && (
                <CheckCircle size={20} className="flex-shrink-0 text-green-600" />
              )}
              {entry.category === 'error' && (
                <XCircle size={20} className="flex-shrink-0 text-red-600" />
              )}
              {entry.category === 'warning' && (
                <AlertTriangle size={20} className="flex-shrink-0 text-amber-600" />
              )}
              {entry.category === 'info' && (
                <Info size={20} className="flex-shrink-0 text-blue-600" />
              )}
              {!entry.category && <Info size={20} className="flex-shrink-0 text-gray-600" />}
              <div className="flex flex-col gap-1">
                <span>
                  <Trans>Activity Details</Trans>
                </span>
                <span className="text-xs font-normal text-gray-500">
                  {formatDistanceToNowStrict(new Date(entry.timestamp), { addSuffix: true })}
                </span>
              </div>
            </SheetTitle>
          </div>

          {/* Tabs */}
          <div className="-mx-6 mt-4 flex gap-4 border-b border-gray-200 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}>
              <Trans>Overview</Trans>
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`flex items-center gap-2 px-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === 'raw'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}>
              <Code size={16} />
              <Trans>Raw Audit Log</Trans>
            </button>
          </div>
        </SheetHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' ? (
            <div className="grid auto-rows-max grid-cols-1 gap-3 px-6 py-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
                {/* Event Summary Section */}
                <Card className="border-2 border-blue-200 bg-blue-50 shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="border-b-2 border-blue-200 pb-2">
                    <CardTitle className="text-sm font-bold tracking-wider text-blue-900 uppercase">
                      <Trans>Event Summary</Trans>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-2">
                    {/* Message */}
                    <div>
                      {entry.formattedMessage ? (
                        <div
                          className="text-sm leading-relaxed break-words whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: entry.formattedMessage }}
                        />
                      ) : (
                        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                          {entry.message}
                        </p>
                      )}
                    </div>

                    {/* Key Details Grid */}
                    <div className="grid grid-cols-2 gap-2 border-t border-blue-200 pt-2">
                      <div>
                        <Text
                          textColor="muted"
                          className="mb-1 block text-xs font-bold tracking-wider uppercase">
                          <Trans>Who</Trans>
                        </Text>
                        <p className="text-sm font-semibold text-gray-900">
                          {entry.user?.username || <span className="text-gray-500">Unknown</span>}
                        </p>
                        {entry.user?.uid && (
                          <p className="mt-1 font-mono text-xs text-gray-600">{entry.user.uid}</p>
                        )}
                      </div>

                      <div>
                        <Text
                          textColor="muted"
                          className="mb-2 block text-xs font-bold tracking-wider uppercase">
                          <Trans>What</Trans>
                        </Text>
                        <div className="flex items-center gap-2">
                          <BadgeState state={entry.verb || 'info'} />
                          {entry.resource && (
                            <span className="font-mono text-xs text-gray-600">
                              {entry.resource.resource}
                              {entry.resource.name ? `/${entry.resource.name}` : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <Text
                          textColor="muted"
                          className="mb-2 block text-xs font-bold tracking-wider uppercase">
                          <Trans>When</Trans>
                        </Text>
                        <p className="font-mono text-sm text-gray-900">
                          <DateFormatter date={entry.timestamp} withTime />
                        </p>
                      </div>

                      <div>
                        <Text
                          textColor="muted"
                          className="mb-2 block text-xs font-bold tracking-wider uppercase">
                          <Trans>Status</Trans>
                        </Text>
                        {entry.responseStatus ? (
                          <div className="flex items-center gap-2">
                            {entry.statusMessage ? (
                              <Tooltip
                                message={`${entry.responseStatus.code} ${getDetailedStatusDescription(entry.responseStatus.code) || ''}`}>
                                <BadgeState
                                  state={entry.category || 'info'}
                                  message={entry.statusMessage}
                                />
                              </Tooltip>
                            ) : (
                              <BadgeState
                                state={entry.category || 'info'}
                                message={entry.responseStatus.code?.toString() || 'Unknown'}
                              />
                            )}
                            {entry.responseStatus.reason && (
                              <span className="text-xs text-gray-600">
                                {entry.responseStatus.reason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No status</span>
                        )}
                      </div>
                    </div>

                    {/* Error Message - Display if error occurred */}
                    {entry.responseStatus &&
                      entry.responseStatus.code &&
                      entry.responseStatus.code >= 400 &&
                      (entry.responseStatus.reason || entry.responseStatus.message) && (
                        <div className="-mx-4 space-y-1.5 border-t border-red-200 bg-red-50 px-4 py-2">
                          <Text
                            textColor="muted"
                            className="mb-1 block text-xs font-bold tracking-wider text-red-900 uppercase">
                            <Trans>Error</Trans>
                          </Text>
                          <div className="space-y-1">
                            {entry.responseStatus.reason && (
                              <p className="text-sm break-words whitespace-pre-wrap text-red-800">
                                {entry.responseStatus.reason}
                              </p>
                            )}
                            {entry.responseStatus.message && (
                              <p className="text-sm break-words whitespace-pre-wrap text-red-700">
                                {entry.responseStatus.message}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Source Information */}
                    {(entry.sourceIPs || entry.userAgent) && (
                      <div className="space-y-1.5 border-t border-blue-200 pt-1.5">
                        {entry.sourceIPs && entry.sourceIPs.length > 0 && (
                          <div>
                            <Text
                              textColor="muted"
                              className="mb-1 block text-xs font-bold tracking-wider uppercase">
                              <Trans>From</Trans>
                            </Text>
                            <div className="flex flex-wrap gap-2">
                              {entry.sourceIPs.map((ip) => (
                                <span
                                  key={ip}
                                  className="rounded border border-blue-300 bg-blue-100 px-2 py-1 font-mono text-xs text-blue-900">
                                  {ip}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {entry.userAgent && (
                          <div>
                            <Text
                              textColor="muted"
                              className="mb-1 block text-xs font-bold tracking-wider uppercase">
                              <Trans>User Agent</Trans>
                            </Text>
                            <p className="font-mono text-xs break-all text-gray-700">
                              {entry.userAgent}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Resource Information - Most Important */}
              {entry.resource &&
                renderSection(
                  t`Resource`,
                  <div className="space-y-2">
                    {renderCopyableField('Type', entry.resource.resource, 'resourceType')}
                    {renderCopyableField('Name', entry.resource.name, 'resourceName')}
                    {renderCopyableField('Namespace', entry.resource.namespace, 'namespace')}
                    {renderCopyableField('API Group', entry.resource.apiGroup, 'apiGroup')}
                    {renderCopyableField('API Version', entry.resource.apiVersion, 'apiVersion')}
                  </div>
                )}

              {/* User Information */}
              {entry.user &&
                renderSection(
                  t`User`,
                  <div className="space-y-2">
                    {renderCopyableField('Username', entry.user.username, 'username')}
                    {renderCopyableField('UID', entry.user.uid, 'uid')}
                    {entry.user.groups && entry.user.groups.length > 0 && (
                      <div>
                        <Text
                          textColor="muted"
                          className="mb-1 text-xs font-bold tracking-wider uppercase">
                          <Trans>Groups</Trans>
                        </Text>
                        <div className="flex flex-wrap gap-1">
                          {entry.user.groups.map((group) => (
                            <span
                              key={group}
                              className="rounded border border-gray-200 bg-gray-100 px-2 py-1 font-mono text-xs text-gray-800">
                              {group}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* Response Information */}
              {entry.responseStatus &&
                renderSection(
                  t`Response`,
                  <div className="space-y-2">
                    <div className="space-y-2">
                      {entry.responseStatus.code && (
                        <div className="flex items-center justify-between gap-2 py-1.5">
                          <Text
                            textColor="muted"
                            className="text-xs font-bold tracking-wider uppercase">
                            <Trans>Code</Trans>
                          </Text>
                          <BadgeState
                            state={entry.category || 'info'}
                            message={entry.responseStatus.code.toString()}
                          />
                        </div>
                      )}
                      {entry.responseStatus.reason && (
                        <div className="flex items-center justify-between gap-2 py-1.5">
                          <Text
                            textColor="muted"
                            className="flex-shrink-0 text-xs font-bold tracking-wider uppercase">
                            <Trans>Reason</Trans>
                          </Text>
                          <p className="flex-1 text-right text-sm text-gray-700">
                            {entry.responseStatus.reason}
                          </p>
                        </div>
                      )}
                    </div>
                    {entry.raw &&
                      (() => {
                        try {
                          const parsed = JSON.parse(entry.raw);
                          return (
                            <div className="space-y-2">
                              {parsed?.response &&
                                renderExpandableJson(
                                  t`Response Object`,
                                  parsed.response,
                                  'response-object',
                                  showResponseManagedFields
                                )}
                              {parsed?.responseObject &&
                                renderExpandableJson(
                                  t`Response Body`,
                                  parsed.responseObject,
                                  'response-body',
                                  showResponseManagedFields
                                )}
                            </div>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                  </div>
                )}

              {/* Request Information */}
              {(entry.requestUri || entry.userAgent || entry.sourceIPs) &&
                renderSection(
                  t`Request`,
                  <div className="space-y-2">
                    <div className="space-y-2">
                      {renderCodeblockField('URI', entry.requestUri, 'requestUri')}
                      {renderCopyableField('User Agent', entry.userAgent, 'userAgent')}
                      {entry.sourceIPs && entry.sourceIPs.length > 0 && (
                        <div>
                          <Text
                            textColor="muted"
                            className="mb-1 text-xs font-bold tracking-wider uppercase">
                            <Trans>Source IPs</Trans>
                          </Text>
                          <div className="flex flex-wrap gap-1">
                            {entry.sourceIPs.map((ip) => (
                              <span
                                key={ip}
                                className="rounded border border-gray-200 bg-gray-100 px-2 py-1 font-mono text-xs text-gray-800">
                                {ip}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {entry.raw &&
                      (() => {
                        try {
                          const parsed = JSON.parse(entry.raw);
                          return (
                            <div className="space-y-2">
                              {parsed?.request &&
                                renderExpandableJson(
                                  t`Request Object`,
                                  parsed.request,
                                  'request-object',
                                  showRequestManagedFields
                                )}
                              {parsed?.requestObject &&
                                renderExpandableJson(
                                  t`Request Body`,
                                  parsed.requestObject,
                                  'request-body',
                                  showRequestManagedFields
                                )}
                            </div>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                  </div>
                )}

              {/* Audit Metadata - Consolidated */}
              {(entry.auditId ||
                entry.stage ||
                (entry.annotations && Object.keys(entry.annotations).length > 0)) &&
                renderSection(
                  t`Audit Metadata`,
                  <div className="space-y-3">
                    {/* Audit ID */}
                    {entry.auditId && renderCopyableField('Audit ID', entry.auditId, 'auditId')}

                    {/* Stage */}
                    {entry.stage && renderCopyableField('Stage', entry.stage, 'stage')}

                    {/* Annotations */}
                    {entry.annotations && Object.keys(entry.annotations).length > 0 && (
                      <div>
                        <Text
                          textColor="muted"
                          className="mb-1.5 block text-xs font-bold tracking-wider uppercase">
                          <Trans>Annotations</Trans>
                        </Text>
                        <div className="space-y-1">
                          {Object.entries(entry.annotations).map(([key, value]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between gap-2 rounded border border-gray-200 bg-gray-50 px-2 py-1">
                              <Text
                                textColor="muted"
                                className="flex-shrink-0 text-xs font-bold tracking-wider uppercase">
                                {key}
                              </Text>
                              <p className="flex-1 text-right font-mono text-xs break-words text-gray-700">
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          ) : (
            <div className="space-y-3 px-6 py-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <Text textColor="muted" className="text-xs font-bold tracking-wider uppercase">
                  <Trans>Raw Audit Log</Trans>
                </Text>
                <button
                  onClick={() => {
                    if (entry.raw) {
                      handleCopy(entry.raw, 'raw');
                    }
                  }}
                  className="flex items-center gap-1.5 rounded border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                  title={t`Copy raw audit log JSON`}
                  type="button">
                  <Copy size={14} />
                  <span>{copiedField === 'raw' ? t`Copied!` : t`Copy`}</span>
                </button>
              </div>
              {renderRawJson()}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
