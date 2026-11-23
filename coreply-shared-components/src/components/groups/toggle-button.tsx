import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Power } from "lucide-react-native";
import { useLingui } from "@lingui/react/macro";

type ToggleButtonProps = {
  isOn: boolean;
  onPress: () => void;
};

export function ToggleButton({ isOn, onPress }: ToggleButtonProps) {
  const { t } = useLingui();
  return (
    <Button
      variant={isOn ? "default" : "outline"}
      className={[
        "h-15 w-15 border border-border shadow-none sm:h-15",
        isOn ? "bg-primary" : "bg-card",
      ].join(" ")}
      style={{ transform: [{ rotate: isOn ? "0deg" : "180deg" }] }}
      onPress={onPress}
      aria-label={isOn ? t`Turn Coreply off` : t`Turn Coreply on`}
    >
      <Icon
        as={Power}
        size={25}
        className={isOn ? "text-background" : "text-foreground"}
      ></Icon>
    </Button>
  );
}
