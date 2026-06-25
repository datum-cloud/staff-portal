import { MiloIconButton } from './milo-icon-button';
import { useThemePreference } from '@/features/preferences';
import { ClientOnly } from '@datum-cloud/datum-ui/theme';
import { useLingui } from '@lingui/react/macro';
import { Moon, Sun } from 'lucide-react';

/**
 * Light/dark theme toggle for the navbar. Persists the choice to the user's
 * preferences (same path as the settings page) via useThemePreference. Wrapped
 * in ClientOnly so the resolved theme is read after hydration.
 */
export function MiloThemeToggle() {
  const { t } = useLingui();
  const { resolvedTheme, isUpdating, setThemePreference } = useThemePreference();
  const isDark = resolvedTheme === 'dark';

  return (
    <ClientOnly fallback={<MiloIconButton label={t`Toggle theme`} icon={<Sun />} />}>
      <MiloIconButton
        label={isDark ? t`Switch to light theme` : t`Switch to dark theme`}
        icon={isDark ? <Sun /> : <Moon />}
        onClick={() => !isUpdating && setThemePreference(isDark ? 'light' : 'dark')}
      />
    </ClientOnly>
  );
}
