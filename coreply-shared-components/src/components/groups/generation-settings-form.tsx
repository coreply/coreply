import React from "react";
import { SchemaForm } from "../ui/form";
import { providerDefinitions } from "libcoreply";

interface GenerationSettingsFormProps {
  providerId: string;
  settings: Record<string, any>;
  onChange: (settings: Record<string, any>) => void;
  className?: string;
}

export function GenerationSettingsForm({
  providerId,
  settings,
  onChange,
  className,
}: GenerationSettingsFormProps) {
  // Get the schema for the selected provider
  const provider = providerDefinitions[providerId as keyof typeof providerDefinitions];
  
  if (!provider) {
    return null;
  }

  return (
    <SchemaForm
      schema={provider.generationSettingsSchema}
      data={settings}
      onChange={onChange}
      title="Generation Settings"
      className={className}
    />
  );
}
