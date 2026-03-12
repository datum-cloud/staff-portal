import { getBrowserTimezone } from '@/utils/helpers';
import { clearSentryUser, setSentryUser } from '@/utils/logger';
import { useTheme, type Theme } from '@datum-cloud/datum-ui/theme';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface IContextProps {
  user: ComMiloapisIamV1Alpha1User | null;
  setUser: (user: ComMiloapisIamV1Alpha1User) => void;
  actions: ReactNode[];
  addActions: (children: ReactNode) => void;
  removeActions: (children: ReactNode) => void;
  navigation: ReactNode | null;
  setNavigation: (node: ReactNode | null) => void;
  settings: {
    theme: Theme;
    timezone: string;
  };
}

const AppContext = createContext<IContextProps>({
  user: null,
  setUser: () => {},
  actions: [],
  addActions: () => {},
  removeActions: () => {},
  navigation: null,
  setNavigation: () => {},
  settings: {
    theme: 'light',
    timezone: 'Etc/GMT',
  },
});

interface IProviderProps {
  children: ReactNode;
  user?: ComMiloapisIamV1Alpha1User;
}

export const AppProvider: React.FC<IProviderProps> = ({ children, user }) => {
  const [userState, setUserState] = useState<ComMiloapisIamV1Alpha1User | null>(user ?? null);
  const [actions, setActions] = useState<ReactNode[]>([]);
  const [navigation, setNavigation] = useState<ReactNode | null>(null);
  const { resolvedTheme, setTheme } = useTheme();

  const addActions = useCallback((nodes: ReactNode) => {
    setActions((prevActions) => [nodes, ...prevActions]);
  }, []);

  const removeActions = useCallback((nodes: ReactNode) => {
    setActions((prevActions) => prevActions.filter((action) => action !== nodes));
  }, []);

  const contextPayload = useMemo(
    () => ({
      user: userState,
      setUser: setUserState,
      actions,
      addActions,
      removeActions,
      navigation,
      setNavigation,
      settings: {
        theme: (userState?.metadata?.annotations?.['preferences/theme'] as Theme) ?? 'light',
        timezone:
          userState?.metadata?.annotations?.['preferences/timezone'] ?? getBrowserTimezone(),
      },
    }),
    [actions, navigation, userState]
  );

  // Update theme when settings change
  useEffect(() => {
    setTheme(contextPayload.settings.theme);
  }, [contextPayload.settings, setTheme]);

  // Update theme-color meta tag when theme changes
  useEffect(() => {
    const themeColor = resolvedTheme === 'dark' ? '#020817' : '#fff';
    const metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (metaThemeColor) metaThemeColor.setAttribute('content', themeColor);
  }, [resolvedTheme]);

  // Update Sentry user context when user state changes
  useEffect(() => {
    if (userState) {
      setSentryUser(userState);
    } else {
      clearSentryUser();
    }
  }, [userState]);

  return <AppContext.Provider value={contextPayload}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within a AppProvider');
  }
  return context;
};
