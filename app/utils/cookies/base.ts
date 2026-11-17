import { openCookieValue, SEALED_PREFIX, SealedCookiePayload, sealCookieValue } from './cipher';
import { env } from '@/utils/config/env.server';
import { createCookie, createCookieSessionStorage } from 'react-router';

/**
 * The longest a session lives from sign-in, however often it is used or
 * refreshed. Nothing in this repo records the IdP's refresh-token lifetime, so
 * this is a fixed 30 days. An older cookie reads as no session.
 */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;

export interface IBaseCookieData {}

type CookieResponse<T> = {
  data?: T;
  headers: Headers;
  /** When the session behind the cookie began (epoch ms). Present whenever `data` is. */
  issuedAt?: number;
  /** True when the request carried the cookie in the old signed-only format. */
  isLegacy?: boolean;
};

/** What a request's cookie held, and whether it was still in the old signed-only format. */
type ReadResult<T> = { data?: T; issuedAt?: number; isLegacy: boolean };

type SetOptions = {
  /** When the session began (epoch ms). Defaults to now; a refresh passes the original. */
  issuedAt?: number;
};

const isPastMaxAge = (issuedAt: number, now: number): boolean =>
  now - issuedAt >= SESSION_MAX_AGE_MS;

/** The sealed JSON as a payload, or undefined when it lacks a usable issue time. */
function parsePayload<T>(json: string | null): SealedCookiePayload<T> | undefined {
  if (!json) return undefined;
  const payload = JSON.parse(json) as Partial<SealedCookiePayload<T>> | null;
  if (!payload || typeof payload.issuedAt !== 'number' || !Number.isFinite(payload.issuedAt)) {
    return undefined;
  }
  if (payload.data === undefined) return undefined;
  return { issuedAt: payload.issuedAt, data: payload.data };
}

/**
 * A cookie whose payload is JSON sealed with AES-256-GCM (see `./cipher`), so
 * the browser and anything that logs the Cookie header never see the tokens
 * inside. GCM authenticates the value, so it needs no separate signature.
 *
 * The sealed payload records when the session began. Re-issuing the cookie
 * keeps that time, and its Max-Age never runs past {@link SESSION_MAX_AGE_SECONDS}
 * from it, so a session in constant use still ends.
 *
 * Cookies written before encryption hold signed-only JSON. Those are still
 * read through the old signed storage, reported as `isLegacy`, and `upgrade`
 * re-issues them sealed with the session starting at the upgrade.
 */
export abstract class BaseCookie<T extends IBaseCookieData> {
  protected abstract readonly COOKIE_KEY: string;
  protected abstract readonly MAX_AGE: number;

  private legacyStorage!: ReturnType<typeof createCookieSessionStorage<Record<string, T>>>;

  static create<T extends IBaseCookieData>(this: new () => BaseCookie<T>): BaseCookie<T> {
    const instance = new this();
    instance.initialize();
    return instance;
  }

  private initialize() {
    const legacyCookie = createCookie(this.COOKIE_KEY, {
      path: '/',
      domain: this.domain(),
      sameSite: 'lax',
      httpOnly: true,
      maxAge: this.MAX_AGE,
      secrets: [env.SESSION_SECRET],
    });
    this.legacyStorage = createCookieSessionStorage({ cookie: legacyCookie });
  }

  private domain(): string {
    return new URL(env.APP_URL).hostname;
  }

  /** `Set-Cookie` value; `Secure` everywhere but local development (plain http). */
  private serialize(value: string, maxAge: number): string {
    const attributes = [
      `${this.COOKIE_KEY}=${value}`,
      `Max-Age=${maxAge}`,
      ...(maxAge === 0 ? ['Expires=Thu, 01 Jan 1970 00:00:00 GMT'] : []),
      `Domain=${this.domain()}`,
      'Path=/',
      'HttpOnly',
      ...(env.isDev ? [] : ['Secure']),
      'SameSite=Lax',
    ];
    return attributes.join('; ');
  }

  /** This cookie's Max-Age, cut short so it never outlives the session's absolute limit. */
  private maxAgeFor(issuedAt: number, now: number): number {
    const remaining = Math.floor((issuedAt + SESSION_MAX_AGE_MS - now) / 1000);
    return Math.max(0, Math.min(this.MAX_AGE, remaining));
  }

  private seal(data: T, issuedAt: number): string {
    const payload: SealedCookiePayload<T> = { issuedAt, data };
    return this.serialize(
      sealCookieValue(JSON.stringify(payload), env.SESSION_SECRET, this.COOKIE_KEY),
      this.maxAgeFor(issuedAt, Date.now())
    );
  }

  private rawValue(request: Request): string | undefined {
    const prefix = `${this.COOKIE_KEY}=`;
    return (request.headers.get('Cookie') ?? '')
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length);
  }

  private async read(request: Request): Promise<ReadResult<T>> {
    const raw = this.rawValue(request);
    if (!raw) return { isLegacy: false };

    if (raw.startsWith(SEALED_PREFIX)) {
      const payload = parsePayload<T>(openCookieValue(raw, env.SESSION_SECRET, this.COOKIE_KEY));
      if (!payload || isPastMaxAge(payload.issuedAt, Date.now())) return { isLegacy: false };
      return { data: payload.data, issuedAt: payload.issuedAt, isLegacy: false };
    }

    const session = await this.legacyStorage.getSession(request.headers.get('Cookie'));
    const data = session.get(this.COOKIE_KEY) as T | undefined;
    if (data === undefined) return { isLegacy: false };
    // The old format carries no issue time, so the session counts from now.
    return { data, issuedAt: Date.now(), isLegacy: true };
  }

  /**
   * The data an old signed-only cookie is re-issued with when it is sealed.
   * Subclasses drop whatever must not survive the upgrade.
   */
  protected forUpgrade(data: T): T {
    return data;
  }

  private createHeaders(cookieHeader: string): Headers {
    return new Headers({ 'Set-Cookie': cookieHeader });
  }

  async set(_request: Request, data: T, options: SetOptions = {}): Promise<CookieResponse<T>> {
    const issuedAt = options.issuedAt ?? Date.now();
    return {
      data,
      issuedAt,
      isLegacy: false,
      headers: this.createHeaders(this.seal(data, issuedAt)),
    };
  }

  async get(request: Request): Promise<CookieResponse<T>> {
    const { data, issuedAt, isLegacy } = await this.read(request);
    if (!data || issuedAt === undefined) return { data: undefined, headers: new Headers() };

    const resealed = isLegacy ? this.forUpgrade(data) : data;
    return { data, issuedAt, isLegacy, headers: this.createHeaders(this.seal(resealed, issuedAt)) };
  }

  async destroy(_request: Request): Promise<CookieResponse<T>> {
    return { headers: this.createHeaders(this.serialize('', 0)) };
  }

  /**
   * When the request still carries this cookie in the old signed-only format,
   * returns a `Set-Cookie` value that re-issues its data (less anything
   * `forUpgrade` drops) sealed, with the session starting now. Returns null for
   * a sealed, missing or unreadable cookie.
   */
  async upgrade(request: Request): Promise<string | null> {
    const { data, issuedAt, isLegacy } = await this.read(request);
    if (!isLegacy || !data || issuedAt === undefined) return null;
    return this.seal(this.forUpgrade(data), issuedAt);
  }
}
