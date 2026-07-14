import React from "react";
import { SchemaForm } from "../ui/form";
import { presentationSettingsSchema } from "libcoreply";
import type { PresentationSettings } from "libcoreply";

interface PresentationFormProps {
  settings: PresentationSettings;
  onChange: (settings: PresentationSettings) => void;
  className?: string;
}

export function PresentationForm({
  settings,
  onChange,
  className,
}: PresentationFormProps) {
  return (
    <SchemaForm
      schema={presentationSettingsSchema}
      data={settings}
      onChange={onChange}
      className={className}
    />
  );
}
