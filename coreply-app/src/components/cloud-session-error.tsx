import { Trans } from "@lingui/react/macro";
import { CircleAlert, RefreshCw } from "lucide-react-native";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export function CloudSessionError({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="min-h-60 w-full items-center justify-center gap-4 border border-border bg-form p-3 sm:px-5 sm:py-6">
      <Icon as={CircleAlert} className="size-8 text-muted-foreground" aria-hidden />
      <Text role="alert" className="text-center font-sans text-sm text-muted-foreground">
        <Trans>Couldn't check your session.</Trans>
      </Text>
      <Button variant="ghost" onPress={onRetry}>
        <Icon as={RefreshCw} className="size-4" aria-hidden />
        <Text className="font-sans">
          <Trans comment="Retries checking the sign-in session">Try again</Trans>
        </Text>
      </Button>
    </View>
  );
}
