import { useApp } from '@/providers/app.provider';
import { ReactNode, useEffect } from 'react';

const AppActionBar = ({ children }: { children: ReactNode }) => {
  const { addActions, removeActions } = useApp();

  useEffect(() => {
    addActions(children);

    return () => {
      removeActions(children);
    };
  }, [children]);

  return <></>;
};

export default AppActionBar;
