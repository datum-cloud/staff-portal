import { ThinkingBlock } from './thinking-block';
import { cn } from '@datum-cloud/datum-ui/utils';
import { code } from '@streamdown/code';
import { getToolName, isReasoningUIPart, isTextUIPart, isToolUIPart, type UIMessage } from 'ai';
import { Link } from 'react-router';
import { type ExtraProps, Streamdown } from 'streamdown';
import 'streamdown/styles.css';

const TOOL_LABELS: Record<string, string> = {
  searchUsers: 'Searching users…',
  searchOrganizations: 'Searching organizations…',
  searchProjects: 'Searching projects…',
  listUsers: 'Listing users…',
  getUser: 'Fetching user details…',
  getOrganization: 'Fetching organization details…',
  getProject: 'Fetching project details…',
  listOrgProjects: 'Loading org projects…',
  listOrgMembers: 'Loading org members…',
  listUserOrganizations: 'Loading user organizations…',
  listProjectDomains: 'Loading domains…',
  listProjectDnsZones: 'Loading DNS zones…',
  listProjectEdge: 'Loading AI edge resources…',
  listProjectExportPolicies: 'Loading export policies…',
  listProjectQuotas: 'Loading quotas…',
  queryActivityLogs: 'Loading activity logs…',
  listFraudEvaluations: 'Loading fraud evaluations…',
  getFraudEvaluation: 'Fetching evaluation details…',
  listFraudPolicies: 'Loading fraud policies…',
  queryPrometheus: 'Querying metrics…',
  queryPrometheusRange: 'Querying metrics range…',
  listSentryIssues: 'Loading Sentry issues…',
  getSentryIssue: 'Fetching Sentry issue…',
  listSentryEvents: 'Loading Sentry events…',
  searchSentryErrors: 'Searching Sentry errors…',
  getFluxStatus: 'Checking Flux status…',
  getClusterResources: 'Loading cluster resources…',
  getPodLogs: 'Fetching pod logs…',
  getPodMetrics: 'Loading pod metrics…',
  queryClusterMetrics: 'Querying cluster metrics…',
  queryClusterMetricsRange: 'Querying cluster metrics…',
  getClusterAlerts: 'Loading cluster alerts…',
  getDatumPlatformDocs: 'Reading docs…',
  getDesktopAppInfo: 'Getting app info…',
};

interface AssistantMessageProps {
  msg: UIMessage;
  isLastMessage: boolean;
  status: string;
}

export function AssistantMessage({ msg, isLastMessage, status }: AssistantMessageProps) {
  const isStreaming = isLastMessage && status === 'streaming';
  const hasText = msg.parts.some((p) => isTextUIPart(p) && p.text);
  const activeToolPart = msg.parts.find(
    (p) => isToolUIPart(p) && (p.state === 'input-streaming' || p.state === 'input-available')
  );
  const showInitialLoading = isStreaming && !hasText && !activeToolPart;
  const showToolIndicator = isLastMessage && activeToolPart != null;

  return (
    <div className="flex w-full justify-start">
      <div className="bg-muted text-foreground w-full rounded-xl px-3 py-2 text-sm">
        {msg.parts.map((part, i) => {
          if (isReasoningUIPart(part)) {
            const isThinkingStreaming = isStreaming && i === msg.parts.length - 1;
            return <ThinkingBlock key={i} text={part.text} isStreaming={isThinkingStreaming} />;
          }

          if (isTextUIPart(part) && part.text) {
            return (
              <Streamdown
                key={i}
                className={cn(
                  "**:data-[streamdown='code-block-body']:bg-card **:data-[streamdown='inline-code']:bg-card dark:**:data-[streamdown='inline-code']:bg-accent **:data-[streamdown='inline-code']:border [&_h2]:text-xl [&_h3]:text-lg",
                  isStreaming &&
                    "**:data-[streamdown='inline-code']:animate-[sd-blurIn_300ms_ease-out_both]"
                )}
                isAnimating={isStreaming}
                plugins={{ code }}
                animated={{
                  animation: 'blurIn',
                  duration: 300,
                  easing: 'ease-out',
                  sep: 'word',
                  stagger: 30,
                }}
                components={{
                  a: ({
                    href,
                    children,
                  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & ExtraProps) => {
                    const isSentry = href?.includes('sentry');
                    if (href?.startsWith('/')) {
                      return (
                        <Link className="underline" to={href}>
                          {children}
                        </Link>
                      );
                    }
                    return (
                      <span className="inline-flex items-center gap-1">
                        {isSentry && <SentryIcon />}
                        <a
                          href={href}
                          className="underline"
                          target="_blank"
                          rel="noopener noreferrer">
                          {children}
                        </a>
                      </span>
                    );
                  },
                  img: ({ src, alt }: React.ImgHTMLAttributes<HTMLImageElement> & ExtraProps) => (
                    <img
                      src={src}
                      alt={alt ?? ''}
                      className="my-2 inline-block max-h-16 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ),
                }}>
                {part.text}
              </Streamdown>
            );
          }

          return null;
        })}

        {showInitialLoading && (
          <div className="py-1">
            <LoadingDots />
          </div>
        )}

        {showToolIndicator && (
          <div className="text-muted-foreground flex items-center gap-1.5 py-1 text-xs">
            <span className="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
            <span className="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
            <span className="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full" />
            <span>{TOOL_LABELS[getToolName(activeToolPart)] ?? 'Working…'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SentryIcon() {
  return (
    <svg
      className="inline-block size-3.5 shrink-0"
      viewBox="0 -14.5 256 256"
      fill="currentColor"
      aria-hidden="true">
      <path d="M148.367708,12.4025287 C144.036807,5.21480737 136.258026,0.820118864 127.866362,0.820118864 C119.474697,0.820118864 111.695916,5.21480737 107.365016,12.4025287 L73.6403017,70.165071 C126.066153,96.3390588 160.689085,148.341727 164.615024,206.806542 L140.93597,206.806542 C137.017513,156.694333 106.874845,112.396698 61.6982677,90.3588968 L30.4849684,144.32869 C55.8497707,155.704426 73.6778379,179.211206 77.7918243,206.704035 L23.4120041,206.704035 C22.1018479,206.611361 20.9266153,205.864669 20.2861278,204.71799 C19.6456403,203.571311 19.6261529,202.179068 20.2342955,201.014912 L35.3027847,175.388229 C30.1976229,171.128798 24.3630321,167.829476 18.0816541,165.65009 L3.16692493,191.276772 C0.0305635285,196.656417 -0.818661742,203.068719 0.809210488,209.079324 C2.43708272,215.08993 6.40620885,220.197261 11.8287436,223.258872 C15.3657216,225.251729 19.3523095,226.310116 23.4120041,226.334074 L97.8831433,226.334074 C100.696274,191.620878 85.1423372,157.966047 56.8804514,137.614499 L68.7199787,117.113153 C104.398813,141.618242 124.473737,183.151896 121.510945,226.334074 L184.603837,226.334074 C187.593899,160.904124 155.557278,98.8221906 100.497065,63.3483734 L124.432386,22.3456815 C125.542508,20.4856859 127.944329,19.8680747 129.81399,20.9618406 C132.530418,22.4481882 233.807067,199.169791 235.703442,201.219925 C236.383476,202.439289 236.358897,203.929352 235.639016,205.125624 C234.919136,206.321896 233.614065,207.041397 232.218213,207.011555 L207.821611,207.011555 C208.129131,213.537817 208.129131,220.046994 207.821611,226.539592 L232.32072,226.539592 C238.604421,226.580218 244.643414,224.105731 249.091568,219.667205 C253.539722,215.228679 256.027289,209.195062 256,202.911286 C256.002825,198.802186 254.905596,194.767215 252.822066,191.225519 L148.367708,12.4025287 Z" />
    </svg>
  );
}

export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-1', className)}>
      <span className="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
      <span className="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
      <span className="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full" />
    </div>
  );
}
