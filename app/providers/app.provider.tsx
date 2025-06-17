import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react';

interface IContextProps {
  actions: ReactNode[];
  addActions: (children: ReactNode) => void;
  removeActions: (children: ReactNode) => void;
}

const AppContext = createContext<IContextProps>({
  actions: [],
  addActions: () => {},
  removeActions: () => {},
});

interface IProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<IProviderProps> = ({ children }) => {
  const [actions, setActions] = useState<ReactNode[]>([]);

  const addActions = (nodes: ReactNode) => {
    setActions((prevActions) => [...prevActions, nodes]);
  };

  const removeActions = (nodes: ReactNode) => {
    setActions((prevActions) => prevActions.filter((action) => action !== nodes));
  };

  const contextPayload = useMemo(
    () => ({
      actions,
      addActions,
      removeActions,
    }),
    [actions]
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
