import { useApp } from '@/providers/app.provider';
import { ReactNode, useEffect, useRef } from 'react';

const AppActionBar = ({ children }: { children: ReactNode }) => {
  const { addActions, removeActions } = useApp();
  // Store the initial children in a ref - this creates a stable reference
  // that won't change during the component lifecycle
  const childrenRef = useRef<ReactNode>(children);

  useEffect(() => {
    // Capture the children value to use in cleanup
    const actionsToAdd = childrenRef.current;
    // Add actions on mount
    addActions(actionsToAdd);

    return () => {
      // Remove actions on unmount
      removeActions(actionsToAdd);
    };
  }, [addActions, removeActions]);

  return <></>;
};

export default AppActionBar;
