import { MiloIconButton } from './milo-icon-button';
import { useAssistant } from '@/features/assistant';
import { useLingui } from '@lingui/react/macro';
import { Brain } from 'lucide-react';

/**
 * AI assistant toggle for the navbar, styled like the rest of the right cluster
 * via MiloIconButton. Reuses the shared assistant context so behaviour matches
 * the legacy trigger; only the styling differs.
 */
export function MiloAssistantTrigger() {
  const { t } = useLingui();
  const { isOpen, toggle } = useAssistant();

  return <MiloIconButton label={t`Patch AI`} icon={Brain} active={isOpen} onClick={toggle} />;
}
