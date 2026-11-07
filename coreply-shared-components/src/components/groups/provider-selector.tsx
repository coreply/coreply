import React, { useState } from "react";
import { Trans } from "@lingui/react/macro";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "../../components/ui/text";
import { Button } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
import { AlertDialog, AlertDialogContent, AlertDialogTitle } from "../../components/ui/alert-dialog";
import type { Option } from "../../components/ui/select";
import { providerDefinitions } from "libcoreply";
import { Check, ChevronDown } from "lucide-react-native";

interface ProviderSelectorProps {
  selectedProviderKey: string | null;
  onProviderChange: (option: Option) => void;
  allowGlobalDefault?: boolean;
}

export function ProviderSelector({ selectedProviderKey, onProviderChange, allowGlobalDefault = false }: ProviderSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = selectedProviderKey === null ? null : providerDefinitions[selectedProviderKey as keyof typeof providerDefinitions];

  return (
    <View>
      <Button variant="outline" className="w-full justify-between" onPress={() => setOpen(true)}>
        <Text className="flex-1 text-left" numberOfLines={1}>{selected ? selected.name : <Trans>Use global default</Trans>}</Text>
        <Icon as={ChevronDown} className="size-4 text-muted-foreground" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent portalHost="coreplyPortal" className="w-full max-w-lg max-h-[80%]">
            <AlertDialogTitle><Trans>Select a provider</Trans></AlertDialogTitle>
            <ScrollView>
              {allowGlobalDefault && (
                <Pressable className="border-b border-border py-3" onPress={() => { onProviderChange(undefined); setOpen(false); }}>
                  <Text className="font-semibold"><Trans>Use global default</Trans></Text>
                  <Text className="text-sm text-muted-foreground"><Trans>Follow the provider selected in global settings.</Trans></Text>
                </Pressable>
              )}
              {Object.entries(providerDefinitions).map(([id, provider]) => (
                <Pressable key={id} className="border-b border-border py-3" onPress={() => { onProviderChange({ value: id, label: provider.name }); setOpen(false); }}>
                  <View className="flex-row items-center gap-2">
                    <Text className="font-semibold">{provider.name}</Text>
                    {id === selectedProviderKey && <Icon as={Check} className="size-4 text-foreground" />}
                  </View>
                  <Text className="text-sm text-muted-foreground">
                    {"stateful" in provider && provider.stateful ? <Trans>Keeps request history when the conversation continues.</Trans> : <Trans>Generates each suggestion from the current context.</Trans>}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Button variant="outline" className="mt-3" onPress={() => setOpen(false)}><Text><Trans comment="Closes the provider selection modal">Close</Trans></Text></Button>
          </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}
