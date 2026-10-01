import React from "react";
import { View } from "react-native";
import { Text } from "../../components/ui/text";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
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
  const selectedProvider =
    providerDefinitions[selectedProviderKey as keyof typeof providerDefinitions];
  const isStateful =
    "stateful" in selectedProvider && selectedProvider.stateful === true;
  const providerType = isStateful ? "stateful" : "stateless";
  const providers = Object.entries(providerDefinitions).filter(
    ([, provider]) =>
      ("stateful" in provider && provider.stateful === true) === isStateful,
  );

  const handleProviderTypeChange = (value: string) => {
    if (value === providerType) {
      return;
    }

    const nextProvider = Object.entries(providerDefinitions).find(
      ([, provider]) =>
        ("stateful" in provider && provider.stateful === true) ===
        (value === "stateful"),
    );
    if (nextProvider) {
      const [key, provider] = nextProvider;
      onProviderChange({ value: key, label: provider.name });
    }
  };

  return (
    <View className="mb-6 gap-3">
      <RadioGroup
        value={providerType}
        onValueChange={handleProviderTypeChange}
        className="flex-row gap-6"
      >
        <View className="flex-row items-center gap-2">
          <RadioGroupItem
            value="stateful"
            aria-labelledby="stateful-provider-label"
          />
          <Text
            className="font-sans"
            nativeID="stateful-provider-label"
            onPress={() => handleProviderTypeChange("stateful")}
          >
            Stateful
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <RadioGroupItem
            value="stateless"
            aria-labelledby="stateless-provider-label"
          />
          <Text
            className="font-sans"
            nativeID="stateless-provider-label"
            onPress={() => handleProviderTypeChange("stateless")}
          >
            Stateless
          </Text>
        </View>
      </RadioGroup>
      <Select
        onValueChange={onProviderChange}
        value={{
          value: selectedProviderKey,
          label: selectedProvider.name,
        }}
      >
        <SelectTrigger className="shadow-none bg-white border-border border">
          <SelectValue placeholder="Select a provider" />
        </SelectTrigger>
        <SelectContent portalHost="coreplyPortal">
          {providers.map(([key, provider]) => (
            <SelectItem key={key} label={provider.name} value={key}>
              {provider.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </View>
  );
}
