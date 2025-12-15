import { ThemePreview } from './theme-preview';
import { SelectTimezone } from '@/components/select/timezone';
import { Theme, useTheme } from '@/modules/datum-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shadcn/ui/card';
import { useApp } from '@/providers/app.provider';
import { userUpdatePreferencesMutation } from '@/resources/request/client';
import { toast } from '@datum-ui/toast';
import { Text } from '@datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { useCallback, useState } from 'react';

const THEME_OPTIONS: readonly { readonly value: Theme; readonly label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
] as const;

export function PreferencesForm() {
  const { user, setUser, settings } = useApp();
  const { t } = useLingui();
  const { setTheme } = useTheme();
  const [isUpdatingTheme, setIsUpdatingTheme] = useState(false);
  const [isUpdatingTimezone, setIsUpdatingTimezone] = useState(false);

  const handleThemeUpdate = useCallback(
    async (theme: Theme) => {
      // Optimistically apply theme immediately for instant feedback
      setTheme(theme);
      setIsUpdatingTheme(true);

      try {
        const updatedUser = await userUpdatePreferencesMutation(user?.metadata?.name || '', {
          annotations: {
            'preferences/theme': theme,
          },
        });

        setUser(updatedUser);
      } catch (error) {
        // Revert theme on error - AppProvider will sync settings.theme
        setTheme(settings.theme);
        toast.error(t`Failed to update theme`);
      } finally {
        setIsUpdatingTheme(false);
      }
    },
    [user?.metadata?.name, setUser, setTheme, settings.theme, t]
  );

  const handleTimezoneUpdate = useCallback(
    async (timezone: string) => {
      setIsUpdatingTimezone(true);

      try {
        const updatedUser = await userUpdatePreferencesMutation(user?.metadata?.name || '', {
          annotations: {
            'preferences/timezone': timezone,
          },
        });

        setUser(updatedUser);
        toast.success(t`Timezone updated successfully`);
      } catch (error) {
        toast.error(t`Failed to update timezone`);
      } finally {
        setIsUpdatingTimezone(false);
      }
    },
    [user?.metadata?.name, setUser, t]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans>Portal Preferences</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Text strong>Timezone</Text>
            <SelectTimezone
              placeholder={t`Select timezone...`}
              selectedValue={settings.timezone}
              disabled={isUpdatingTimezone}
              onValueChange={(tz) => handleTimezoneUpdate(tz.timezoneName)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col">
              <Text strong>Theme Mode</Text>
              <Text size="xs" textColor="muted">
                <Trans>
                  Choose how the portal looks to you. Select a single theme, or sync with your
                  system.
                </Trans>
              </Text>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {THEME_OPTIONS.map((opt) => (
                <div key={opt.value}>
                  <ThemePreview
                    value={opt.value}
                    selected={settings.theme === opt.value}
                    disabled={isUpdatingTheme}
                    onSelect={handleThemeUpdate}
                  />

                  <Text>{opt.label}</Text>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
