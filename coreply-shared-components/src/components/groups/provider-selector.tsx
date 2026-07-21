import React from "react";
import { Text } from "../../components/ui/text";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  type Option,
} from "../../components/ui/select";
import { providerDefinitions } from "libcoreply";

interface ProviderSelectorProps {
  selectedProviderKey: string;
  onProviderChange: (option: Option) => void;
}

export function ProviderSelector({
  selectedProviderKey,
  onProviderChange,
}: ProviderSelectorProps) {
  return (
    <Select
      onValueChange={onProviderChange}
      className="mb-6"
      value={{
        value: selectedProviderKey,
        label:
          providerDefinitions[
            selectedProviderKey as keyof typeof providerDefinitions
          ].name,
      }}
    >
      <SelectTrigger className="shadow-none bg-white border-border border">
        <SelectValue placeholder="Select a provider" />
      </SelectTrigger>
      <SelectContent portalHost="coreplyPortal">
        {Object.entries(providerDefinitions).map(([key, provider]) => (
          <SelectItem key={key} label={provider.name} value={key}>
            {provider.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
