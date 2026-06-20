import React from "react";
import { SchemaForm } from "../ui/form";
import { presentationSchema } from "libcoreply";

interface PresentationFormProps {
  settings: Record<string, any>;
  onChange: (settings: Record<string, any>) => void;
  className?: string;
}

export function PresentationForm({
  settings,
  onChange,
  className,
}: PresentationFormProps) {
  return (
    <SchemaForm
      schema={presentationSchema}
      data={settings}
      onChange={onChange}
      title="Presentation"
      className={className}
    />
  );
}
