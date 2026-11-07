import { Fragment, useEffect, useId, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Platform, ScrollView, View, useWindowDimensions } from "react-native";
import { Briefcase, Code, Coffee, Heart, MessageCircle, Music, Send, Smile, Sparkles, Star, Sun } from "lucide-react-native";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { Input } from "../ui/input";
import { Text } from "../ui/text";
import type { DemoConversationId } from "../../demo-conversations";
import { createDemoConversation } from "../../demo-conversations/localized";

export function DemoConversation({ chooseThemes = false, url = "" }: { chooseThemes?: boolean; url?: string }) {
  const { i18n } = useLingui();
  const [theme, setTheme] = useState<"dinner" | "workspace" | "dating" | "coding">("dinner");
  const conversation = createDemoConversation(theme, i18n, {});
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const { width } = useWindowDimensions();
  const themes = [
    { id: "dinner", label: <Trans comment="Demo conversation about texting friends">Texting</Trans>, icon: MessageCircle },
    { id: "workspace", label: <Trans comment="Demo conversation about workplace communication">Workplace</Trans>, icon: Briefcase },
    { id: "dating", label: <Trans comment="Demo conversation in a dating app">Dating</Trans>, icon: Heart },
    { id: "coding", label: <Trans comment="Demo conversation with an AI coding agent">AI</Trans>, icon: Code },
  ] as const;
  return (
    <View className="gap-4">
      {chooseThemes && <View className={width >= 768 ? "flex-row flex-wrap justify-center gap-2" : "gap-2"}>
        {themes.map(({ id, label, icon }) => (
          <Button key={id} variant={theme === id ? "default" : "outline"} accessibilityState={{ selected: theme === id }} onPress={() => { setTheme(id); setMessages([]); }} className={width < 768 ? "w-full justify-start rounded-none" : "rounded-none"}>
            <Icon as={icon} className={theme === id ? "size-4 text-primary-foreground" : "size-4 text-foreground"} /><Text>{label}</Text>
          </Button>
        ))}
      </View>}
    <Conversation
      key={theme}
      title={conversation.title}
      background={theme === "dinner"}
      style={theme === "workspace" ? "list" : "bubble"}
      sendColor={theme === "dating" ? "#b32b87" : theme === "coding" ? "#e5e7eb" : theme === "workspace" ? "#2563eb" : undefined}
      sendTextColor={theme === "coding" ? "#111827" : theme === "workspace" ? "#ffffff" : undefined}
      receiveColor={theme === "dating" ? "#e5e7eb" : theme === "dinner" ? "#f2eee7" : theme === "workspace" ? "#c0266e" : undefined}
      receiveTextColor={theme === "dating" || theme === "dinner" ? "#111827" : theme === "workspace" ? "#ffffff" : undefined}
      messages={[...conversation.messages, ...messages]}
      suggestion={{ url, conversationId: theme }}
      onSend={(text) =>
        setMessages((current) => [
          ...current,
          { id: `reply-${current.length + 1}`, outgoing: true, text },
        ])
      }
    />
    </View>
  );
}

export type ConversationMessage = {
  id: string;
  outgoing: boolean;
  sender?: string;
  text?: string;
  quote?: { author: string; text: string };
  day?: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  content?: ReactNode;
  time?: string;
};

export function Conversation({
  title,
  messages,
  suggestion: suggestionConfig,
  onSend,
  composerEnabled = true,
  fullScreen = false,
  composerTip,
  style = "bubble",
  sendColor,
  receiveColor,
  sendTextColor,
  receiveTextColor,
  background = false,
}: {
  title: string;
  messages: ConversationMessage[];
  suggestion?: { url: string; conversationId: DemoConversationId };
  onSend: (text: string) => void;
  composerEnabled?: boolean;
  fullScreen?: boolean;
  composerTip?: ReactNode;
  style?: "bubble" | "list";
  sendColor?: string;
  receiveColor?: string;
  sendTextColor?: string;
  receiveTextColor?: string;
  background?: boolean;
}) {
  const { t, i18n } = useLingui();
  const { height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [patternSize, setPatternSize] = useState({ width: 0, height: 0 });

  return (
    <View
      className={
        fullScreen
          ? "w-full flex-1 bg-background"
          : "w-full border border-border bg-background"
      }
    >
      <ScrollView
        ref={scrollRef}
        style={fullScreen ? { flex: 1 } : { maxHeight: height * 0.65 }}
        contentContainerStyle={fullScreen ? { flexGrow: 1 } : undefined}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
      <View
        className={fullScreen ? "relative flex-1 gap-4 overflow-hidden px-6 py-6" : "relative gap-4 overflow-hidden px-6 py-6"}
        onLayout={background ? (event) => {
          const { width, height } = event.nativeEvent.layout;
          setPatternSize((current) => current.width === width && current.height === height ? current : { width, height });
        } : undefined}
      >
        {background && (
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="absolute inset-0 overflow-hidden">
            {Array.from({ length: Math.ceil(patternSize.width / 28) * Math.ceil(patternSize.height / 28) }, (_, index) => {
              const columns = Math.ceil(patternSize.width / 28);
              const row = Math.floor(index / columns);
              const column = index % columns;
              return (
                <View key={index} className="absolute opacity-10" style={{ left: column * 28 + 4 + (row % 2) * 14, top: row * 28 + 4 + (column % 2) * 8, transform: [{ rotate: (row + column) % 2 === 0 ? "-12deg" : "12deg" }] }}>
                  <Icon as={[MessageCircle, Star, Smile, Sun, Coffee, Music][(row + column) % 6]} className="size-5 text-foreground" />
                </View>
              );
            })}
          </View>
        )}
        {messages.map((message, index) => (
          <Fragment key={message.id}>
          {message.day && message.day !== messages[index - 1]?.day && (
            <Text className="text-center font-sans text-xs text-muted-foreground">
              {new Intl.DateTimeFormat(i18n.locale, { weekday: "long", timeZone: "UTC" }).format(
                new Date(Date.UTC(2024, 0, 7 + ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(message.day))),
              )}
            </Text>
          )}
          <View
            className={
              message.content
                ? "w-full"
                : style === "list" ? "w-full" : `max-w-[85%] ${message.outgoing ? "self-end" : "self-start"}`
            }
          >
            {message.content ? (
              message.content
            ) : style === "list" ? (
              <View className="flex-row items-start gap-3">
                <View className="size-9 items-center justify-center rounded-full bg-accent" style={{ backgroundColor: message.outgoing ? sendColor : receiveColor }}>
                  <Text className="font-semibold text-accent-foreground" style={{ color: message.outgoing ? sendTextColor : receiveTextColor }}>{message.outgoing ? t({ comment: "Name of the current user in a chat", message: "You" }).slice(0, 1) : (message.sender ?? title).slice(0, 1)}</Text>
                </View>
                <View className="min-w-0 flex-1 gap-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="font-semibold">{message.outgoing ? <Trans comment="Name of the current user in a chat">You</Trans> : message.sender ?? title}</Text>
                    {message.time && <Text className="text-xs text-muted-foreground">{message.time}</Text>}
                  </View>
                  {message.quote && (
                    <View className="gap-1 border-l-2 border-border pl-3">
                      <Text className="font-semibold">{message.quote.author}</Text>
                      <Text>{message.quote.text}</Text>
                    </View>
                  )}
                  <Text>{message.text}</Text>
                </View>
              </View>
            ) : (
              <View
                className={`relative gap-1 rounded-2xl px-4 py-3 ${message.outgoing ? "rounded-br-none" : "rounded-bl-none"} ${message.outgoing && !sendColor ? "bg-primary" : ""}`}
                style={{ backgroundColor: message.outgoing ? sendColor : receiveColor }}
              >
                {(message.outgoing || receiveColor) && (
                <View
                  accessible={false}
                  className={`absolute bottom-0 h-0 w-0 border-b-8 ${message.outgoing ? "-right-2 border-r-8 border-r-transparent" : "-left-2 border-l-8 border-l-transparent"} ${message.outgoing && !sendColor ? "border-b-primary" : ""}`}
                  style={{ borderBottomColor: message.outgoing ? sendColor : receiveColor }}
                />
                )}
                {message.quote && (
                  <View className={`gap-1 border-l-2 pl-3 ${message.outgoing ? "border-primary-foreground" : "border-foreground"}`} style={{ borderLeftColor: message.outgoing ? sendTextColor : receiveTextColor }}>
                    <Text className={message.outgoing ? "font-semibold text-primary-foreground" : "font-semibold text-foreground"} style={{ color: message.outgoing ? sendTextColor : receiveTextColor }}>{message.quote.author}</Text>
                    <Text className={message.outgoing ? "text-primary-foreground" : "text-foreground"} style={{ color: message.outgoing ? sendTextColor : receiveTextColor }}>{message.quote.text}</Text>
                  </View>
                )}
                {message.text !== undefined && (
                  <Text
                    className={message.outgoing ? "text-primary-foreground" : "text-foreground"}
                    style={{ color: message.outgoing ? sendTextColor : receiveTextColor }}
                  >
                    {message.text}
                  </Text>
                )}
                {message.time && (message.outgoing || receiveColor) && (
                  <Text
                    className={`self-end text-xs ${message.outgoing ? "text-primary-foreground" : "text-foreground"}`}
                    style={{ color: message.outgoing ? sendTextColor : receiveTextColor, opacity: 0.7 }}
                  >
                    {message.time}
                  </Text>
                )}
              </View>
            )}
          </View>
          </Fragment>
        ))}
      </View>
      </ScrollView>

      {composerEnabled && (
        <ConversationComposer
          title={title}
          suggestionConfig={suggestionConfig}
          onSend={onSend}
          composerTip={composerTip}
        />
      )}
    </View>
  );
}

function ConversationComposer({
  title,
  suggestionConfig,
  onSend,
  composerTip,
}: {
  title: string;
  suggestionConfig?: { url: string; conversationId: DemoConversationId };
  onSend: (text: string) => void;
  composerTip?: ReactNode;
}) {
  const { t, i18n } = useLingui();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<ComponentRef<typeof Input>>(null);
  const inputId = useId();
  const [inputWidth, setInputWidth] = useState(0);
  const [draftWidth, setDraftWidth] = useState(0);
  const [suggestionWidth, setSuggestionWidth] = useState(0);

  const suggestionKey = [
    "demo-suggestion",
    suggestionConfig?.url,
    suggestionConfig?.conversationId,
    i18n.locale,
  ];
  const matchingSuggestion = queryClient
    .getQueriesData<string>({ queryKey: suggestionKey })
    .find(([, text]) => text !== undefined && text.length > draft.length && text.startsWith(draft))?.[1];

  const suggestionQuery = useQuery({
    queryKey: [...suggestionKey, draft],
    enabled: suggestionConfig !== undefined && matchingSuggestion === undefined,
    retry: false,
    staleTime: Infinity,
    queryFn: async () => {
      if (!suggestionConfig)
        throw new Error("Demo suggestions are not configured.");
      const response = await fetch(
        `${suggestionConfig.url}/api/demo-suggestions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: suggestionConfig.conversationId,
            typing: draft,
            locale: i18n.locale,
          }),
        },
      );
      if (!response.ok) throw new Error("Couldn't generate a suggestion.");
      const result: { suggestion: string } = await response.json();
      return draft + result.suggestion;
    },
  });
  const fullSuggestion = matchingSuggestion ?? suggestionQuery.data;
  const suggestion = fullSuggestion?.startsWith(draft) ? fullSuggestion.slice(draft.length) : "";
  const nextChunk = suggestion.match(/^\s*\S+\s*/)?.[0] ?? suggestion;

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const input = event.target;
      if (!(input instanceof HTMLTextAreaElement) || input !== document.getElementById(inputId) ||
          input.selectionStart !== input.value.length || input.selectionEnd !== input.value.length ||
          event.isComposing || !suggestion) return;

      const acceptAll = event.key === "Tab" && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey;
      const acceptNextWord = event.key === "ArrowRight" && (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey;
      if (!acceptAll && !acceptNextWord) return;

      event.preventDefault();
      setDraft(draft + (acceptAll ? suggestion : nextChunk));
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [draft, suggestion, nextChunk, inputId]);

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

    onSend(text);
    setDraft("");
  };

  return (
    <View className="gap-2 border-t border-border bg-form p-4 pb-10">
      {composerTip && (
        <View className="flex-row gap-3">
          <View className="min-w-0 flex-1">{composerTip}</View>
          <View className="size-11" />
        </View>
      )}
      <View className="flex-row items-end gap-3">
        <View
          className="relative min-w-0 flex-1"
          onLayout={(event) =>
            setInputWidth(event.nativeEvent.layout.width)
          }
        >
          <Input
            ref={inputRef}
            nativeID={inputId}
            value={draft}
            onChangeText={setDraft}
            multiline
            textAlignVertical="center"
            maxLength={2000}
            accessibilityLabel={t({
              comment: "Message input label; title is the recipient's name",
              message: `Message ${title}`,
            })}
            placeholder={t({
              comment:
                "Message input placeholder; title is the recipient's name",
              message: `Message ${title}...`,
            })}
            className="h-12 rounded-xl px-3 py-2 text-base leading-5 shadow-none sm:h-12 md:text-base"
            style={Platform.select({ web: { paddingTop: 13, paddingBottom: 13 } })}
          />
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className="absolute top-0 right-0 left-0 flex-row overflow-hidden opacity-0"
          >
            <Text
              className="shrink-0 text-base leading-5 web:font-[inherit]"
              onLayout={(event) =>
                setDraftWidth(event.nativeEvent.layout.width)
              }
            >
              {draft.replace(/ /g, "\u00a0")}
            </Text>
            <Text
              className="shrink-0 text-base leading-5 web:font-[inherit]"
              onLayout={(event) =>
                setSuggestionWidth(event.nativeEvent.layout.width)
              }
            >
              {suggestion.replace(/ /g, "\u00a0")}
            </Text>
          </View>
          {suggestion !== "" && inputWidth > 0 && (
            <>
              <Button
                variant="link"
                accessibilityLabel={t({
                  comment:
                    "Screen reader action; suggestion is the proposed message completion",
                  message: `Insert next word of suggestion: ${suggestion}`,
                })}
                accessibilityHint={t`Tap to insert the next word. Hold to insert the full suggestion.`}
                onPress={() => insertSuggestion(nextChunk)}
                onLongPress={() => insertSuggestion(suggestion)}
                className={
                  emptyComposer
                    ? "absolute top-2 right-3 h-7 max-w-[50%] gap-1 rounded-full bg-card px-2 py-0 shadow-none transition-none sm:h-7"
                    : "absolute top-0 h-12 justify-start overflow-hidden p-0 shadow-none transition-none sm:h-12"
                }
                style={
                  emptyComposer
                    ? undefined
                    : { left: 13 + draftWidth, width: inlineWidth }
                }
              >
                <Text
                  numberOfLines={1}
                  className={`min-w-0 flex-1 text-base font-normal leading-5 transition-none web:font-[inherit] ${emptyComposer ? "text-card-foreground" : "text-muted-foreground"}`}
                >
                  {suggestion.replace(/^ +/, (spaces) => "\u00a0".repeat(spaces.length))}
                </Text>
                {emptyComposer && (
                  <Icon
                    as={Sparkles}
                    className="size-3 text-card-foreground"
                  />
                )}
              </Button>
              {showTrailing && (
                <Button
                  variant="link"
                  accessibilityLabel={t({
                    comment:
                      "Screen reader action; suggestion is the proposed message completion",
                    message: `Insert next word of suggestion: ${suggestion}`,
                  })}
                  accessibilityHint={t`Tap to insert the next word. Hold to insert the full suggestion.`}
                  onPress={() => insertSuggestion(nextChunk)}
                  onLongPress={() => insertSuggestion(suggestion)}
                  className="absolute top-full left-0 h-6 max-w-full gap-1 rounded-full bg-card px-2 py-0 shadow-none transition-none sm:h-6"
                >
                  <Text
                    numberOfLines={1}
                    className="min-w-0 shrink text-[13px] text-card-foreground transition-none"
                  >
                    {suggestion.trimStart()}
                  </Text>
                  {!emptyComposer && (
                    <Icon
                      as={Sparkles}
                      className="size-3 text-card-foreground"
                    />
                  )}
                </Button>
              )}
            </>
          )}
        </View>
        <Button
          size="icon"
          className="size-11 rounded-full sm:size-11"
          accessibilityLabel={t({
            comment: "Button that sends the drafted chat message",
            message: "Send message",
          })}
          disabled={!draft.trim()}
          onPress={sendMessage}
        >
          <Icon as={Send} className="size-5 text-primary-foreground" />
        </Button>
      </View>
    </View>
  );
}
