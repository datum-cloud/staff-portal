import React, { createContext, useContext, useMemo, useState } from 'react';

interface IContextProps {
  user: any;
}

const AppContext = createContext<IContextProps>({
  user: null,
});

interface IProviderProps {
  children: React.ReactNode;
  user: any;
}

export const AppProvider: React.FC<IProviderProps> = ({ user, children }) => {
  const [userState, setUserState] = useState<any>(user);
  const contextPayload = useMemo(() => ({ user: userState }), [userState]);

  return <AppContext.Provider value={contextPayload}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
