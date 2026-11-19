import React, { useState } from "react";
import { Trans } from "@lingui/react/macro";
import { Pressable, ScrollView, View } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import { AlertDialog, AlertDialogContent, AlertDialogTitle } from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { Text } from "../ui/text";
import { cn } from "../../lib/utils";

interface AdvancedSelectProps {
  title: string;
  placeholder: string;
  options: { title: string; subtitle?: string; value: string }[];
  value: string | undefined;
  onValueChange: (value: string | undefined) => void;
  allowDefault?: boolean;
  defaultTitle?: string;
  defaultSubtitle?: string;
  disabled?: boolean;
  invalid?: boolean;
}

export function AdvancedSelect({
  title, placeholder, options, value, onValueChange, allowDefault,
  defaultTitle, defaultSubtitle, disabled, invalid,
}: AdvancedSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  function select(next: string | undefined) {
    onValueChange(next);
    setOpen(false);
  }

  return (
    <View>
      <Button variant="outline" className={cn("w-full justify-between", invalid && "border-destructive")} disabled={disabled} onPress={() => setOpen(true)}>
        <Text className="flex-1 text-left" numberOfLines={1}>{selected ? selected.title : value === undefined && allowDefault ? defaultTitle : placeholder}</Text>
        <Icon as={ChevronDown} className="size-4 text-muted-foreground" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent portalHost="coreplyPortal" className="w-full max-w-lg max-h-[80%] px-0">
          <AlertDialogTitle className="px-6">{title}</AlertDialogTitle>
          <ScrollView>
            {allowDefault && (
              <Pressable accessibilityRole="radio" accessibilityState={{ checked: value === undefined }} className={cn("border-border px-6 py-3 active:bg-muted", options.length > 0 && "border-b")} onPress={() => select(undefined)}>
                <View className="flex-row items-center gap-2">
                  <Text className="font-semibold">{defaultTitle}</Text>
                  {value === undefined && <Icon as={Check} className="size-4 text-foreground" />}
                </View>
                {defaultSubtitle && <Text className="text-sm text-muted-foreground">{defaultSubtitle}</Text>}
              </Pressable>
            )}
            {options.map((option, index) => (
              <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: option.value === value }} className={cn("border-border px-6 py-3 active:bg-muted", index < options.length - 1 && "border-b")} onPress={() => select(option.value)}>
                <View className="flex-row items-center gap-2">
                  <Text className="font-semibold">{option.title}</Text>
                  {option.value === value && <Icon as={Check} className="size-4 text-foreground" />}
                </View>
                {option.subtitle && <Text className="text-sm text-muted-foreground">{option.subtitle}</Text>}
              </Pressable>
            ))}
          </ScrollView>
          <View className="px-6">
            <Button variant="outline" className="mt-3" onPress={() => setOpen(false)}><Text><Trans comment="Closes a selection dialog">Close</Trans></Text></Button>
          </View>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}
