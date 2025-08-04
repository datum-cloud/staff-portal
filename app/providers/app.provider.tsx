import { AuthUser } from '@/resources/schemas';
import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react';

interface IContextProps {
  user: AuthUser | null;
  setUser: (user: AuthUser) => void;
  actions: ReactNode[];
  addActions: (children: ReactNode) => void;
  removeActions: (children: ReactNode) => void;
}

const AppContext = createContext<IContextProps>({
  user: null,
  setUser: () => {},
  actions: [],
  addActions: () => {},
  removeActions: () => {},
});

interface IProviderProps {
  children: ReactNode;
  user?: AuthUser;
}

export const AppProvider: React.FC<IProviderProps> = ({ children, user }) => {
  const [userState, setUserState] = useState<AuthUser | null>(user ?? null);
  const [actions, setActions] = useState<ReactNode[]>([]);

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
    }),
    [actions, userState]
  );

  return <AppContext.Provider value={contextPayload}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within a AppProvider');
  }
  return context;
};
