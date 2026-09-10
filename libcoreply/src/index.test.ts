import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./requests", () => ({
  requestSuggestions: vi.fn(),
}));

import { requestSuggestions } from "./requests";
import { Coreply } from "./index";
import { createDefaultGlobalSettings } from "./settings";
import type { LibCoreplyListener } from "./listener";
import type { AndroidSnapshot } from "./context/snapshot";

const requestSuggestionsMock = vi.mocked(requestSuggestions);

function makeListener(): LibCoreplyListener {
  return {
    onCollectionModeUpdated: vi.fn(),
    onInit: vi.fn(),
    onSuggestionUpdated: vi.fn(),
    onSuggestionCleared: vi.fn(),
    onError: vi.fn(),
  };
}

function lineSnapshot(
  messageSpecs: Array<{
    text: string;
    left: number;
    right: number;
    top: number;
    bottom: number;
  }> = [],
): AndroidSnapshot {
  return {
    platform: "android",
    snapshot: {
      id: "",
      className: "android.view.ViewGroup",
      viewIdResourceName: null,
      text: null,
      contentDescription: null,
      hintText: null,
      packageName: "jp.naver.line.android",
      isEditable: false,
      isFocused: false,
      isVisibleToUser: true,
      isShowingHintText: false,
      bounds: {
        left: 0,
        top: 0,
        right: 100,
        bottom: 200,
      },
      children: [
        ...messageSpecs.map((message) => ({
          id: "jp.naver.line.android:id/chat_ui_message_text",
          className: "android.widget.TextView",
          viewIdResourceName: null,
          text: message.text,
          contentDescription: null,
          hintText: null,
          packageName: "jp.naver.line.android",
          isEditable: false,
          isFocused: false,
          isVisibleToUser: true,
          isShowingHintText: false,
          bounds: {
            left: message.left,
            top: message.top,
            right: message.right,
            bottom: message.bottom,
          },
          children: [],
        })),
        {
          id: "jp.naver.line.android:id/chat_ui_message_edit",
          className: "android.widget.EditText",
          viewIdResourceName: null,
          text: null,
          contentDescription: null,
          hintText: null,
          packageName: "jp.naver.line.android",
          isEditable: true,
          isFocused: true,
          isVisibleToUser: true,
          isShowingHintText: false,
          bounds: {
            left: 0,
            top: 150,
            right: 100,
            bottom: 190,
          },
          children: [],
        },
      ],
    },
  };
}

describe("Coreply", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    requestSuggestionsMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("fetches a new suggestion after a sent message is appended to chat context", async () => {
    const listener = makeListener();
    const coreply = new Coreply(listener);
    const globalSettings = createDefaultGlobalSettings();
    globalSettings.fetchControl.debounceMs = 0;
    globalSettings.fetchControl.typingRegexEnabled = true;
    globalSettings.fetchControl.typingRegexPattern = ".+";
    coreply.updateSettings({
      globalSettings,
      providerId: "coreplyCloud",
      providerConfig: {},
    });

    requestSuggestionsMock
      .mockResolvedValueOnce("Sent now confirmed")
      .mockResolvedValueOnce("Sent now refreshed");

    coreply.snapshotUpdated(
      lineSnapshot([
        {
          text: "Need help",
          left: 0,
          right: 40,
          top: 20,
          bottom: 40,
        },
      ]),
    );
    await vi.runAllTimersAsync();
    expect(requestSuggestionsMock).toHaveBeenCalledTimes(0);

    coreply.updateTyping("Sent now");
    await vi.runAllTimersAsync();
    expect(requestSuggestionsMock).toHaveBeenCalledTimes(1);
    expect(listener.onSuggestionUpdated).toHaveBeenLastCalledWith(
      "Sent now confirmed",
    );

    coreply.snapshotUpdated(
      lineSnapshot([
        {
          text: "Need help",
          left: 0,
          right: 40,
          top: 20,
          bottom: 40,
        },
        {
          text: "Sent now",
          left: 60,
          right: 100,
          top: 60,
          bottom: 80,
        },
      ]),
    );
    await vi.runAllTimersAsync();

    expect(requestSuggestionsMock).toHaveBeenCalledTimes(2);
    expect(listener.onSuggestionUpdated).toHaveBeenLastCalledWith(
      "Sent now refreshed",
    );
  });
});
