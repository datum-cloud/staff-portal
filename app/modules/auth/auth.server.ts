import { ISession } from './session.server';
import { zitadelStrategy } from './strategies/zitadel.server';
import { Authenticator } from 'remix-auth';

export const authenticator = new Authenticator<ISession>();

// provide support for multiple strategies
authenticator.use(zitadelStrategy, 'zitadel');
