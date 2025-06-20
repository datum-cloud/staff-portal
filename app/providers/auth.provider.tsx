import { AuthUser } from '@/resources/schemas/auth.schema';
import React, { createContext, useContext, useMemo, useState } from 'react';

interface IContextProps {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  setToken: (token: string) => void;
  setUser: (user: AuthUser) => void;
}

const AuthContext = createContext<IContextProps>({
  isAuthenticated: false,
  user: null,
  token: null,
  setToken: () => {},
  setUser: () => {},
});

interface IProviderProps {
  children: React.ReactNode;
  user?: AuthUser;
  token?: string;
}

export const AuthProvider: React.FC<IProviderProps> = ({ user, token, children }) => {
  const [userState, setUserState] = useState<AuthUser | null>(user ?? null);
  const [tokenState, setTokenState] = useState<string | null>(token ?? null);

  const contextPayload = useMemo(
    () => ({
      isAuthenticated: !!tokenState,
      user: userState,
      token: tokenState,
      setToken: setTokenState,
      setUser: setUserState,
    }),
    [userState, tokenState]
  );

  return <AuthContext.Provider value={contextPayload}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a AuthProvider');
  }
  return context;
};
