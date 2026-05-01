import type { FraudEvaluation, ProviderResult } from './types';

/**
 * Subset of the MaxMind minFraud Insights / Factors response that we surface
 * in the staff portal. All fields are optional — MaxMind omits them freely
 * depending on plan, request data, and what it could resolve.
 *
 * Reference shape provided by minFraud's JSON response.
 */
export type MaxmindLocalizedNames = Partial<{
  en: string;
  de: string;
  es: string;
  fr: string;
  ja: string;
  'pt-BR': string;
  ru: string;
  'zh-CN': string;
}>;

export type MaxmindCountry = Partial<{
  is_high_risk: boolean;
  confidence: number;
  iso_code: string;
  geoname_id: number;
  names: MaxmindLocalizedNames;
}>;

export type MaxmindCity = Partial<{
  confidence: number;
  geoname_id: number;
  names: MaxmindLocalizedNames;
}>;

export type MaxmindSubdivision = Partial<{
  confidence: number;
  iso_code: string;
  geoname_id: number;
  names: MaxmindLocalizedNames;
}>;

export type MaxmindPostal = Partial<{
  confidence: number;
  code: string;
}>;

export type MaxmindIpLocation = Partial<{
  local_time: string;
  average_income: number;
  population_density: number;
  accuracy_radius: number;
  latitude: number;
  longitude: number;
  metro_code: number;
  time_zone: string;
}>;

export type MaxmindIpTraits = Partial<{
  static_ip_score: number;
  user_type: string;
  autonomous_system_number: number;
  autonomous_system_organization: string;
  connection_type: string;
  domain: string;
  isp: string;
  organization: string;
  ip_address: string;
  network: string;
}>;

export type MaxmindIpAddress = Partial<{
  risk: number;
  country: MaxmindCountry;
  registered_country: MaxmindCountry;
  location: MaxmindIpLocation;
  city: MaxmindCity;
  continent: Partial<{ code: string; geoname_id: number; names: MaxmindLocalizedNames }>;
  postal: MaxmindPostal;
  subdivisions: MaxmindSubdivision[];
  traits: MaxmindIpTraits;
}>;

export type MaxmindEmailDomainVisit = Partial<{
  status: string;
  last_visited_on: string;
  has_redirect: boolean;
}>;

export type MaxmindEmailDomain = Partial<{
  first_seen: string;
  classification: string;
  volume: number;
  visit: MaxmindEmailDomainVisit;
}>;

export type MaxmindEmail = Partial<{
  domain: MaxmindEmailDomain;
  first_seen: string;
  is_disposable: boolean;
  is_free: boolean;
  is_high_risk: boolean;
}>;

export type MaxmindRiskScoreReason = {
  multiplier: number;
  reasons: { code: string; reason: string }[];
};

export type MaxmindInsights = Partial<{
  id: string;
  risk_score: number;
  risk_score_reasons: MaxmindRiskScoreReason[];
  funds_remaining: number;
  queries_remaining: number;
  email: MaxmindEmail;
  ip_address: MaxmindIpAddress;
}>;

const MAXMIND_PROVIDER = 'maxmind';

function pickLatestMaxmindResult(evaluation: FraudEvaluation | undefined): ProviderResult | null {
  const stages = evaluation?.status?.stageResults;
  if (!stages?.length) return null;

  // Walk in declared order; stages later in the pipeline overwrite earlier
  // ones so the final retained result is the most recent successful maxmind call.
  let latest: ProviderResult | null = null;
  for (const stage of stages) {
    if (stage.skipped || !stage.providerResults?.length) continue;
    for (const result of stage.providerResults) {
      if (result.provider !== MAXMIND_PROVIDER) continue;
      if (result.error) continue;
      if (result.failurePolicyApplied) continue;
      if (!result.rawResponse) continue;
      latest = result;
    }
  }
  return latest;
}

export function parseMaxmindRawResponse(raw: string | undefined): MaxmindInsights | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as MaxmindInsights) : null;
  } catch {
    return null;
  }
}

export function extractMaxmindInsights(
  evaluation: FraudEvaluation | undefined
): MaxmindInsights | null {
  const result = pickLatestMaxmindResult(evaluation);
  return parseMaxmindRawResponse(result?.rawResponse);
}

/**
 * MaxMind transaction id used to deep-link into the minFraud Interactive UI.
 * Kept here so callers can build the deep-link URL without re-parsing the raw
 * JSON.
 */
export function getMaxmindTransactionId(insights: MaxmindInsights | null): string | undefined {
  return typeof insights?.id === 'string' ? insights.id : undefined;
}
