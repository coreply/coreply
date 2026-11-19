import React from "react";
import { useLingui } from "@lingui/react/macro";
import type { Option } from "../ui/select";
import { providerDefinitions } from "libcoreply";
import { AdvancedSelect } from "./advanced-select";

interface ProviderSelectorProps {
  selectedProviderKey: string | null;
  onProviderChange: (option: Option) => void;
  allowGlobalDefault?: boolean;
}

export function ProviderSelector({ selectedProviderKey, onProviderChange, allowGlobalDefault }: ProviderSelectorProps) {
  const { t, i18n } = useLingui();
  const options = Object.entries(providerDefinitions).map(([value, provider]) => ({
    value,
    title: provider.name,
    subtitle: i18n._(provider.description),
  }));

  return (
    <AdvancedSelect
      title={t`Select a provider`}
      placeholder={t`Select a provider`}
      options={options}
      value={selectedProviderKey === null ? undefined : selectedProviderKey}
      allowDefault={allowGlobalDefault}
      defaultTitle={t`Use global default`}
      defaultSubtitle={t`Follow the provider selected in global settings.`}
      onValueChange={(value) => {
        if (value === undefined) {
          onProviderChange(undefined);
          return;
        }
        const option = options.find((entry) => entry.value === value);
        if (option) onProviderChange({ value, label: option.title });
      }}
    />
  );
}
