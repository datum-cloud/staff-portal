import { ThemePreview } from './theme-preview';
import { SelectTimezone } from '@/components/select';
import { Theme } from '@/modules/datum-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shadcn/ui/card';
import { useApp } from '@/providers/app.provider';
import { userUpdateMutation } from '@/resources/request/client';
import { Button } from '@datum-ui/button';
import { toast } from '@datum-ui/toast';
import { Text } from '@datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState, useEffect } from 'react';

const THEME_OPTIONS: readonly { readonly value: Theme; readonly label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
] as const;

export function PreferencesForm() {
  const { user, setUser, settings } = useApp();
  const { t } = useLingui();

  // Local state for preferences
  const [preferences, setPreferences] = useState({
    timezone: settings.timezone,
    theme: settings.theme,
  });
  const [isPreferencesDirty, setIsPreferencesDirty] = useState(false);
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);

  // Update local state when settings change
  useEffect(() => {
    setPreferences({
      timezone: settings.timezone,
      theme: settings.theme,
    });
    setIsPreferencesDirty(false);
  }, [settings.timezone, settings.theme]);

  // Check if preferences are dirty
  useEffect(() => {
    const isDirty =
      preferences.timezone !== settings.timezone || preferences.theme !== settings.theme;
    setIsPreferencesDirty(isDirty);
  }, [preferences, settings]);

  const handlePreferencesUpdate = async () => {
    setIsUpdatingPreferences(true);
    try {
      const { data: updatedUser } = await userUpdateMutation(user?.metadata.name || '', {
        apiVersion: 'iam.miloapis.com/v1alpha1',
        kind: 'User',
        metadata: {
          annotations: {
            'preferences/timezone': preferences.timezone,
            'preferences/theme': preferences.theme,
          },
        },
      });

      setUser(updatedUser);
      toast.success(t`Preferences updated successfully`);
    } finally {
      setIsUpdatingPreferences(false);
    }
  };

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
              selectedValue={preferences.timezone}
              onValueChange={(tz) => {
                setPreferences((prev) => ({
                  ...prev,
                  timezone: tz.value,
                }));
              }}
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
                    selected={preferences.theme === opt.value}
                    onSelect={(theme) => {
                      setPreferences((prev) => ({
                        ...prev,
                        theme,
                      }));
                    }}
                  />

                  <Text>{opt.label}</Text>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              onClick={handlePreferencesUpdate}
              disabled={!isPreferencesDirty}
              loading={isUpdatingPreferences}>
              <Trans>Apply</Trans>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
