import React from "react";
import { SchemaForm } from "../ui/form";
import { providerDefinitions } from "libcoreply";
import { CoreplyCloudSignIn } from "./coreply-cloud-sign-in";

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

  if (providerId === "coreplyCloudStateful") {
    return <CoreplyCloudSignIn />;
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
