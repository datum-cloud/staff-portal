import { Theme, useTheme } from '@/modules/datum-themes';
import { User } from '@/resources/schemas';
import { setSentryUser, clearSentryUser } from '@/utils/logger';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

interface IContextProps {
  user: User | null;
  setUser: (user: User) => void;
  actions: ReactNode[];
  addActions: (children: ReactNode) => void;
  removeActions: (children: ReactNode) => void;
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
  settings: {
    theme: 'light',
    timezone: 'Etc/GMT',
  },
});

interface IProviderProps {
  children: ReactNode;
  user?: User;
}

export const AppProvider: React.FC<IProviderProps> = ({ children, user }) => {
  const [userState, setUserState] = useState<User | null>(user ?? null);
  const [actions, setActions] = useState<ReactNode[]>([]);
  const { resolvedTheme, setTheme } = useTheme();

  const addActions = (nodes: ReactNode) => {
    setActions((prevActions) => [nodes, ...prevActions]);
  };

  const removeActions = (nodes: ReactNode) => {
    setActions((prevActions) => prevActions.filter((action) => action !== nodes));
  };

  const contextPayload = useMemo(
    () => ({
      user: userState,
      setUser: setUserState,
      actions,
      addActions,
      removeActions,
      settings: {
        theme: (userState?.metadata.annotations?.['preferences/theme'] as Theme) ?? 'light',
        timezone: userState?.metadata.annotations?.['preferences/timezone'] ?? 'Etc/GMT',
      },
    }),
    [actions, userState]
  );

  // Update theme when settings change
  useEffect(() => {
    setTheme(contextPayload.settings.theme);
  }, [contextPayload.settings]);

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
