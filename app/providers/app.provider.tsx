import { AuthUser } from '@/resources/schemas/auth.schema';
import React, { createContext, useContext, useMemo, useState } from 'react';

interface IContextProps {
  user: AuthUser | null;
}

const AppContext = createContext<IContextProps>({
  user: null,
});

interface IProviderProps {
  children: React.ReactNode;
  user: AuthUser;
}

export const AppProvider: React.FC<IProviderProps> = ({ user, children }) => {
  const [userState, setUserState] = useState<any>(user);
  const contextPayload = useMemo(() => ({ user: userState }), [userState]);

  return <AppContext.Provider value={contextPayload}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
