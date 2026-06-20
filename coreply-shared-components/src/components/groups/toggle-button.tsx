import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Power } from "lucide-react-native";
import { Text } from "../ui/text";

export function ToggleButton() {
  return (
    <Button
      variant="outline"
      className="w-15 h-15 shadow-none border-gray-300 border"
      style={{ transform: [{ rotate: "180deg" }] }}
    >
      <Icon as={Power} size={25}></Icon>
    </Button>
  );
}
