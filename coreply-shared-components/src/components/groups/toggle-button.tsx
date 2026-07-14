import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Power } from "lucide-react-native";

type ToggleButtonProps = {
  isOn: boolean;
  onPress: () => void;
};

export function ToggleButton({ isOn, onPress }: ToggleButtonProps) {
  return (
    <Button
      variant="outline"
      className={[
        "h-15 w-15 border border-border shadow-none",
        isOn ? "bg-brand-500" : "bg-card",
      ].join(" ")}
      style={{ transform: [{ rotate: isOn ? "0deg" : "180deg" }] }}
      onPress={onPress}
      aria-label={isOn ? "Turn Coreply off" : "Turn Coreply on"}
    >
      <Icon
        as={Power}
        size={25}
        className={isOn ? "text-background" : "text-foreground"}
      ></Icon>
    </Button>
  );
}
