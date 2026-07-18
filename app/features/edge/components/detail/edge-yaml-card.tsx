import { ButtonCopy } from '@/components/button';
import { toHttpProxyYaml } from '@/features/edge/lib';
import { SectionCard } from '@/features/milo';
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
    <SectionCard
      title={<Trans>YAML</Trans>}
      action={
        <ButtonCopy
          value={yaml}
          successMessage="YAML copied to clipboard"
          tooltipText="Copy YAML"
        />
      }>
      <CodeEditor value={yaml} language={'yaml' as EditorLanguage} readOnly minHeight="400px" />
    </SectionCard>
  );
}
