import React from "react";
import { SchemaForm } from "../ui/form";
import { fetchControlSettingsSchema } from "libcoreply";
import type { FetchControlSettings } from "libcoreply";

interface FetchControlFormProps {
  settings: FetchControlSettings;
  onChange: (settings: FetchControlSettings) => void;
  className?: string;
}

export function FetchControlForm({
  settings,
  onChange,
  className,
}: FetchControlFormProps) {
  return (
    <SchemaForm
      schema={fetchControlSettingsSchema}
      data={settings}
      onChange={onChange}
      className={className}
    />
  );
}
