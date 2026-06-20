import React from "react";
import { SchemaForm } from "../ui/form";
import { fetchControlSchema } from "libcoreply";

interface FetchControlFormProps {
  settings: Record<string, any>;
  onChange: (settings: Record<string, any>) => void;
  className?: string;
}

export function FetchControlForm({
  settings,
  onChange,
  className,
}: FetchControlFormProps) {
  return (
    <SchemaForm
      schema={fetchControlSchema}
      data={settings}
      onChange={onChange}
      title="Fetch Control"
      className={className}
    />
  );
}
