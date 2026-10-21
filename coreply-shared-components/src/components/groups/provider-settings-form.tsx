import React from "react";
import { SchemaForm } from "../ui/form";
import { providerDefinitions } from "libcoreply";

interface ProviderSettingsFormProps {
  providerId: string;
  settings: Record<string, any>;
  onChange: (settings: Record<string, any>) => void;
  className?: string;
}

export function ProviderSettingsForm({
  providerId,
  settings,
  onChange,
  className,
}: ProviderSettingsFormProps) {
  const provider =
    providerDefinitions[providerId as keyof typeof providerDefinitions];

  if (!provider) {
    return null;
  }

  return (
    <SchemaForm
      schema={provider.settingsSchema}
      data={settings}
      onChange={onChange}
      className={className}
    />
  );
}
