import { themeSessionResolver } from '@/utils/cookies';
import { createThemeAction } from 'remix-themes';

export const action = createThemeAction(themeSessionResolver);
