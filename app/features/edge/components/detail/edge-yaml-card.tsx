import { ButtonCopy } from '@/components/button';
import { toHttpProxyYaml } from '@/features/edge/lib';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { CodeEditor, type EditorLanguage } from '@datum-cloud/datum-ui/code-editor';
import { Trans } from '@lingui/react/macro';
import type { ComDatumapisNetworkingV1AlphaHttpProxy } from '@openapi/networking.datumapis.com/v1alpha';
import { useMemo } from 'react';

type EdgeYamlCardProps = {
  raw: ComDatumapisNetworkingV1AlphaHttpProxy;
};

export function EdgeYamlCard({ raw }: EdgeYamlCardProps) {
  const yaml = useMemo(() => toHttpProxyYaml(raw), [raw]);

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>
          <Trans>YAML</Trans>
        </CardTitle>
        <ButtonCopy
          value={yaml}
          successMessage="YAML copied to clipboard"
          tooltipText="Copy YAML"
        />
      </CardHeader>
      <CardContent>
        <CodeEditor value={yaml} language={'yaml' as EditorLanguage} readOnly minHeight="400px" />
      </CardContent>
    </Card>
  );
}
