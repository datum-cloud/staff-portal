import { useApp } from '@/providers/app.provider';
import { ReactNode, useEffect } from 'react';

const AppNavigation = ({ children }: { children: ReactNode }) => {
  const { setNavigation } = useApp();

  useEffect(() => {
    setNavigation(children);

    return () => {
      setNavigation(null);
    };
  }, [children, setNavigation]);

  return null;
};

export default AppNavigation;
