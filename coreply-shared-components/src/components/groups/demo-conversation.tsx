import { useRef, useState, type ComponentRef } from "react";
import { View } from "react-native";
import { Send, Sparkles } from "lucide-react-native";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { Input } from "../ui/input";
import { Text } from "../ui/text";

const initialMessages = [
  { id: 1, outgoing: false, text: "Hey! Want to grab dinner tonight?", time: "18:42" },
  { id: 2, outgoing: true, text: "I'd love to! What are you in the mood for?", time: "18:43" },
  { id: 3, outgoing: false, text: "Maybe Italian? There's a new place near the station.", time: "18:43" },
  { id: 4, outgoing: false, text: "I can book a table for 7. Does that work for you?", time: "18:44" },
];

// Fixed demo completions. Each chunk matches a native short-press insertion.
const demoSuggestions = [
  { prefix: "", chunks: ["7", " works", " for", " me!"] },
  { prefix: "Hello", chunks: [" there", "!", " See", " you", " at", " 7."] },
];

export function DemoConversation() {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const nextMessageId = useRef(initialMessages.length + 1);
  const inputRef = useRef<ComponentRef<typeof Input>>(null);
  const [inputWidth, setInputWidth] = useState(0);
  const [draftWidth, setDraftWidth] = useState(0);
  const [suggestionWidth, setSuggestionWidth] = useState(0);

  const demoSuggestion = demoSuggestions.find(({ prefix, chunks }) =>
    draft.length >= prefix.length && (prefix + chunks.join("")).startsWith(draft),
  );
  let suggestion = "";
  let nextChunk = "";
  if (demoSuggestion) {
    const fullText = demoSuggestion.prefix + demoSuggestion.chunks.join("");
    suggestion = fullText.slice(draft.length);
    let chunkEnd = demoSuggestion.prefix.length;
    for (const chunk of demoSuggestion.chunks) {
      chunkEnd += chunk.length;
      if (chunkEnd > draft.length) {
        nextChunk = fullText.slice(draft.length, chunkEnd);
        break;
      }
    }
  }

  const emptyComposer = draft === "";
  const inlineWidth = emptyComposer
    ? Math.max(0, inputWidth * 0.5 - 32)
    : Math.max(0, inputWidth - 26 - draftWidth);
  const showTrailing = suggestion !== "" && suggestionWidth > inlineWidth;

  const insertSuggestion = (text: string) => {
    setDraft(draft + text);
    inputRef.current?.focus();
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;

    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const message = { id: nextMessageId.current++, outgoing: true, text, time };
    setMessages((current) => [...current, message]);
    setDraft("");
  };

  return (
    <View className="w-full border border-border bg-background">
      <View className="flex-row items-center gap-3 border-b border-border bg-form px-5 py-4">
        <View className="size-10 items-center justify-center rounded-full bg-accent">
          <Text className="font-sans text-lg font-semibold text-foreground">A</Text>
        </View>
        <View className="gap-1">
          <Text className="font-sans text-base font-semibold">Alex</Text>
          <Text className="font-sans text-xs text-muted-foreground">Demo conversation</Text>
        </View>
      </View>

      <View className="gap-4 px-6 py-6">
        <Text className="text-center font-sans text-xs text-muted-foreground">Today</Text>
        {messages.map((message) => (
          <View
            key={message.id}
            className={`max-w-[85%] ${message.outgoing ? "self-end" : "self-start"}`}
          >
            <View
              className={`relative gap-1 rounded-2xl px-4 py-3 ${message.outgoing ? "rounded-br-none bg-primary" : "rounded-bl-none bg-card"}`}
            >
              <View
                accessible={false}
                className={`absolute bottom-0 h-0 w-0 border-b-8 ${message.outgoing ? "-right-2 border-r-8 border-r-transparent border-b-primary" : "-left-2 border-l-8 border-l-transparent border-b-card"}`}
              />
              <Text
                className={`font-sans text-sm leading-6 ${message.outgoing ? "text-primary-foreground" : "text-card-foreground"}`}
              >
                {message.text}
              </Text>
              <Text
                className={`self-end font-sans text-[10px] ${message.outgoing ? "text-primary-foreground/75" : "text-muted-foreground"}`}
              >
                {message.time}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View className="flex-row items-end gap-3 border-t border-border bg-form p-4 pb-10">
        <View
          className="relative min-w-0 flex-1"
          onLayout={(event) => setInputWidth(event.nativeEvent.layout.width)}
        >
          <Input
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            maxLength={2000}
            accessibilityLabel="Message Alex"
            placeholder="Message Alex..."
            className="h-11 rounded-xl px-3 text-base leading-5 shadow-none sm:h-11 md:text-base"
          />
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className="absolute top-0 left-0 flex-row opacity-0"
          >
            <Text
              className="shrink-0 font-sans text-base leading-5"
              onLayout={(event) => setDraftWidth(event.nativeEvent.layout.width)}
            >
              {draft}
            </Text>
            <Text
              className="shrink-0 font-sans text-base leading-5"
              onLayout={(event) => setSuggestionWidth(event.nativeEvent.layout.width)}
            >
              {suggestion}
            </Text>
          </View>
          {suggestion !== "" && inputWidth > 0 && (
            <>
              <Button
                variant="link"
                accessibilityLabel={`Insert next word of suggestion: ${suggestion.trimStart()}`}
                accessibilityHint="Tap to insert the next word. Hold to insert the full suggestion."
                onPress={() => insertSuggestion(nextChunk)}
                onLongPress={() => insertSuggestion(suggestion)}
                className={emptyComposer
                  ? "absolute top-2 right-3 h-7 max-w-[50%] gap-1 rounded-full bg-card px-2 py-0 shadow-none sm:h-7"
                  : "absolute top-0 h-11 justify-start overflow-hidden p-0 shadow-none sm:h-11"}
                style={emptyComposer ? undefined : { left: 13 + draftWidth, width: inlineWidth }}
              >
                <Text
                  numberOfLines={1}
                  className={`min-w-0 flex-1 font-sans text-base leading-5 ${emptyComposer ? "text-card-foreground" : "text-muted-foreground"}`}
                >
                  {suggestion}
                </Text>
                {emptyComposer && <Icon as={Sparkles} className="size-3 text-card-foreground" />}
              </Button>
              {showTrailing && (
                <Button
                  variant="link"
                  accessibilityLabel={`Insert next word of suggestion: ${suggestion.trimStart()}`}
                  accessibilityHint="Tap to insert the next word. Hold to insert the full suggestion."
                  onPress={() => insertSuggestion(nextChunk)}
                  onLongPress={() => insertSuggestion(suggestion)}
                  className="absolute top-full left-0 h-6 max-w-full gap-1 rounded-full bg-card px-2 py-0 shadow-none sm:h-6"
                >
                  <Text numberOfLines={1} className="min-w-0 shrink font-sans text-[13px] text-card-foreground">
                    {suggestion.trimStart()}
                  </Text>
                  {!emptyComposer && <Icon as={Sparkles} className="size-3 text-card-foreground" />}
                </Button>
              )}
            </>
          )}
        </View>
        <Button
          size="icon"
          className="size-11 rounded-full sm:size-11"
          accessibilityLabel="Send message"
          disabled={!draft.trim()}
          onPress={sendMessage}
        >
          <Icon as={Send} className="size-5 text-primary-foreground" />
        </Button>
      </View>
    </View>
  );
}
