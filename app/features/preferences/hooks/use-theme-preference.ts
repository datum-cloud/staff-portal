import { useApp } from '@/providers/app.provider';
import { userUpdatePreferencesMutation } from '@/resources/request/client';
import { useTheme, type Theme } from '@datum-cloud/datum-ui/theme';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useLingui } from '@lingui/react/macro';
import { useCallback, useState } from 'react';

/**
 * Persist the theme choice to the user's preferences, the same way the settings
 * page does: apply optimistically for instant feedback, save it to the
 * `preferences/theme` annotation, and revert + toast on failure.
 *
 * Shared by the settings form and the navbar theme toggle so both stay in sync.
 */
export function useThemePreference() {
  const { user, setUser, settings } = useApp();
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLingui();
  const [isUpdating, setIsUpdating] = useState(false);

  const setThemePreference = useCallback(
    async (theme: Theme) => {
      // Optimistically apply immediately for instant feedback.
      setTheme(theme);
      setIsUpdating(true);

      try {
        const updatedUser = await userUpdatePreferencesMutation(user?.metadata?.name || '', {
          annotations: { 'preferences/theme': theme },
        });
        setUser(updatedUser);
      } catch {
        // Revert on error; AppProvider re-syncs from settings.theme.
        setTheme(settings.theme);
        toast.error(t`Failed to update theme`);
      } finally {
        setIsUpdating(false);
      }
    },
    [user, setUser, setTheme, settings.theme, t]
  );

  return { theme: settings.theme, resolvedTheme, isUpdating, setThemePreference };
}
