import React from "react";
import { SchemaForm } from "../ui/form";
import { globalSettingsSchema } from "libcoreply";
import type { GlobalSettings } from "libcoreply";

interface GlobalSettingsFormProps {
  settings: GlobalSettings;
  onChange: (settings: GlobalSettings) => void;
  className?: string;
}

export function GlobalSettingsForm({
  settings,
  onChange,
  className,
}: GlobalSettingsFormProps) {
  return (
    <SchemaForm
      schema={globalSettingsSchema}
      data={settings}
      onChange={onChange}
      className={className}
    />
  );
}
