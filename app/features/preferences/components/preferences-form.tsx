import { ThemePreview } from './theme-preview';
import { SelectTimezone } from '@/components/select/timezone';
import { useApp } from '@/providers/app.provider';
import { userUpdatePreferencesMutation } from '@/resources/request/client';
import type { Theme } from '@datum-cloud/datum-ui';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { useTheme } from '@datum-cloud/datum-ui/theme';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
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
            <Row gutter={[16, 16]}>
              {THEME_OPTIONS.map((opt) => (
                <Col key={opt.value} span={12} md={6}>
                  <ThemePreview
                    value={opt.value}
                    selected={settings.theme === opt.value}
                    disabled={isUpdatingTheme}
                    onSelect={handleThemeUpdate}
                  />

                  <Text>{opt.label}</Text>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
