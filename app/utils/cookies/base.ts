import { openCookieValue, SEALED_PREFIX, sealCookieValue } from './cipher';
import { env } from '@/utils/config/env.server';
import { createCookie, createCookieSessionStorage } from 'react-router';

export interface IBaseCookieData {}

type CookieResponse<T> = {
  data?: T;
  headers: Headers;
};

/** What a request's cookie held, and whether it was still in the old signed-only format. */
type ReadResult<T> = { data?: T; isLegacy: boolean };

/**
 * A cookie whose payload is JSON sealed with AES-256-GCM (see `./cipher`), so
 * the browser and anything that logs the Cookie header never see the tokens
 * inside. GCM authenticates the value, so it needs no separate signature.
 *
 * Cookies written before encryption hold signed-only JSON. Those are still
 * read through the old signed storage, and `upgrade` re-issues them sealed.
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

  private seal(data: T): string {
    return this.serialize(
      sealCookieValue(JSON.stringify(data), env.SESSION_SECRET, this.COOKIE_KEY),
      this.MAX_AGE
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
      const json = openCookieValue(raw, env.SESSION_SECRET, this.COOKIE_KEY);
      return { data: json ? (JSON.parse(json) as T) : undefined, isLegacy: false };
    }

    const session = await this.legacyStorage.getSession(request.headers.get('Cookie'));
    const data = session.get(this.COOKIE_KEY) as T | undefined;
    return { data, isLegacy: data !== undefined };
  }

  private createHeaders(cookieHeader: string): Headers {
    return new Headers({ 'Set-Cookie': cookieHeader });
  }

  async set(_request: Request, data: T): Promise<CookieResponse<T>> {
    return { data, headers: this.createHeaders(this.seal(data)) };
  }

  async get(request: Request): Promise<CookieResponse<T>> {
    const { data } = await this.read(request);
    if (!data) return { data, headers: new Headers() };

    return { data, headers: this.createHeaders(this.seal(data)) };
  }

  async destroy(_request: Request): Promise<CookieResponse<T>> {
    return { headers: this.createHeaders(this.serialize('', 0)) };
  }

  /**
   * When the request still carries this cookie in the old signed-only format,
   * returns a `Set-Cookie` value that re-issues the same data sealed. Returns
   * null for a sealed, missing or unreadable cookie.
   */
  async upgrade(request: Request): Promise<string | null> {
    const { data, isLegacy } = await this.read(request);
    return isLegacy && data ? this.seal(data) : null;
  }
}
