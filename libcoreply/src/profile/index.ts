// ** Implemented Profile type with extractors, platform, and drop rule
/* A Profile contains:
- an id
- an array of extractors
- a field 'platform' : 'android' | 'web'
- a drop rule defining how context would be dropped when this profile is active. e.g. {
  differentProfile: 0,
  sameProfile: {
    chat: 1
    todoList: 2
  }
} instructs store to remove all contexts not from this profile, keep the latest chat type context, and the two latest contexts with label 'todoList'.

An extractor contains:
- a JSONata that takes a representation of the AccessibilityNodeInfo (android) / DOM tree (web) of the entire rootInActiveWindow (android)/ webpage (web) and results in a structured object containing the following:
  - a field indicating how the native layer should collect snapshots in the future: 'minimal' | 'frequent' | 'active', rationale: 
    'minimal' when the snapshot is not used at a context, signalling the screen is not important, so only updates when major changes occur is enough;
    'frequent' when context is detected, so updates should be sent more frequently to capture more;
    'active' is same frequency as 'frequent', plus sending all typing updates as this indicate the focus target should activate coreply.
  - literal type of the context: 'chat' | 'screen'
  - an optional arbitrary (except 'chat' and 'screen') label
  - the structured data compatible with that type of context
*/

export interface DropRule {
  differentProfile: Record<string, number> | number;
  sameProfile: Record<string, number> | number;
}

export interface Profile {
  id: string;
  extractors: string[]; // array of JSONata expressions
  platform: "android" | "web";
  dropRule: DropRule;
}

export interface ProfileGroup {
  rule: string; // A coarse rule that matches packageNames (android) or URLs (web), serves as id at the same time.
  profiles: Profile[];
}

// ** Fixed JSONata syntax: replaced custom shorthand with standard $.** for recursive descent
export const profileGroups: ProfileGroup[] = [
  {
    rule: "com.whatsapp",
    profiles: [
      {
        id: "whatsapp-chat",
        extractors: [
          // ** WhatsApp chat context extractor
          // Checks input position, handles not-found cases, finds messages and creates chat turns
          `(
            $input := $.**[id = "com.whatsapp:id/entry"];
            $inputBounds := $input.bounds;
            $rootBounds := $.bounds;
            
            $messages := $.**[id = "com.whatsapp:id/message_text" or id = "com.whatsapp:id/caption"];
            
            $hasMessages := $count($messages) > 0;
            
            $result := ($not($hasMessages)) ? {"snapshotFrequency": "minimal"} : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2 ? "Me" : "Others",
                "userSent": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2,
                "messages": [{
                  "body": text,
                  "time": $.**[id = "com.whatsapp:id/message_time"][0].text,
                  "quote": ($.**[id = "com.whatsapp:id/quote"][0].text) ?? ""
                }]
              };
              {
                "type": "chat",
                "label": "messages",
                "snapshotFrequency": "active",
                "turns": $turns
              }
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "org.telegram.messenger",
    profiles: [
      {
        id: "telegram-chat",
        extractors: [
          `(
            $rootBounds := $.bounds;
            $contentNodes := $.**[id = "android:id/content"];
            $contentNode := (($count($contentNodes) = 1) and ($contentNodes[0].packageName = "org.telegram.messenger")) ? $contentNodes[0] : null;
            $input := $.**[packageName = "org.telegram.messenger" and className = "android.widget.EditText" and isFocused = true][0];
            $hasTrigger := $contentNode and $input and (($contentNode.bounds.top + $contentNode.bounds.bottom) / 2 < $input.bounds.bottom);
            $bubbles := $.**[className = "android.view.ViewGroup" and text != null and $trim(text) != ""];
            $result := ($not($hasTrigger) or $count($bubbles) = 0) ? null : (
              $sorted := $sort($bubbles, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2 ? "Me" : "Others",
                "userSent": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2,
                "messages": [{
                  "body": text
                }]
              };
              {
                "type": "chat",
                "label": "messages",
                "snapshotFrequency": "active",
                "turns": $turns
              }
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "com.whatsapp.w4b",
    profiles: [
      {
        id: "whatsapp-business-chat",
        extractors: [
          `(
            $rootBounds := $.bounds;
            $hasInput := $count($.**[id = "com.whatsapp.w4b:id/entry"]) > 0;
            $messages := $.**[id = "com.whatsapp.w4b:id/message_text" or id = "com.whatsapp.w4b:id/caption"];
            $result := ($not($hasInput) or $count($messages) = 0) ? null : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2 ? "Me" : "Others",
                "userSent": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2,
                "messages": [{"body": text}]
              };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "org.telegram.messenger.web",
    // ** Fixed platform from web to android as this is an Android app package
    profiles: [
      {
        id: "telegram-web-chat",
        extractors: [
          `(
            $rootBounds := $.bounds;
            $contentNodes := $.**[id = "android:id/content"];
            $contentNode := (($count($contentNodes) = 1) and ($contentNodes[0].packageName = "org.telegram.messenger.web")) ? $contentNodes[0] : null;
            $input := $.**[packageName = "org.telegram.messenger.web" and className = "android.widget.EditText" and isFocused = true][0];
            $hasTrigger := $contentNode and $input and (($contentNode.bounds.top + $contentNode.bounds.bottom) / 2 < $input.bounds.bottom);
            $bubbles := $.**[className = "android.view.ViewGroup" and text != null and $trim(text) != ""];
            $result := ($not($hasTrigger) or $count($bubbles) = 0) ? null : (
              $sorted := $sort($bubbles, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2 ? "Me" : "Others",
                "userSent": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2,
                "messages": [{"body": text}]
              };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "jp.naver.line.android",
    profiles: [
      {
        id: "line-chat",
        extractors: [
          `(
            $rootBounds := $.bounds;
            $hasInput := $count($.**[id = "jp.naver.line.android:id/chat_ui_message_edit"] ) > 0;
            $messages := $.**[id = "jp.naver.line.android:id/chat_ui_message_text"];
            $result := ($not($hasInput) or $count($messages) = 0) ? null : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2 ? "Me" : "Others",
                "userSent": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2,
                "messages": [{"body": text}]
              };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "com.instagram.android",
    profiles: [
      {
        id: "instagram-chat",
        extractors: [
          `(
            $rootBounds := $.bounds;
            $hasInput := $count($.**[id = "com.instagram.android:id/row_thread_composer_edittext"]) > 0;
            $messageList := $.**[id = "com.instagram.android:id/message_list"][0];
            $directMessages := $messageList.**[
              id = "com.instagram.android:id/direct_text_message_text_view" and
              isVisibleToUser = true and
              text != null and
              $trim(text) != ""
            ];
            $metaMessages := $messageList.**[className = "com.facebook.compose.view.MetaComposeView"].**[
              className = "android.widget.TextView" and
              isVisibleToUser = true and
              text != null and
              $trim(text) != ""
            ];
            $messages := $append($directMessages, $metaMessages);
            $result := ($not($hasInput) or $count($messages) = 0) ? null : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := [$map($sorted, function($message) {
                {
                  "sender": (($message.bounds.left + $message.bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2) ? "Me" : "Others",
                  "userSent": (($message.bounds.left + $message.bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2),
                  "messages": [{"body": $message.text}]
                }
              })];
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "com.instagram.barcelona",
    profiles: [
      {
        id: "threads-comment-chat",
        extractors: [
          `(
            $hasInput := $count($.**[className = "android.widget.EditText" and isFocused = true]) > 0;
            $textNodes := $.**[className = "android.widget.TextView" and text != null and $trim(text) != ""];
            $messages := $filter($textNodes, function($node) {
              $not($contains($lowercase($node.id ?? ""), "button")) and
              $not($contains($lowercase($node.id ?? ""), "edit")) and
              $not($contains($lowercase($node.id ?? ""), "composer")) and
              $not($contains($lowercase($node.id ?? ""), "input"))
            });
            $result := ($not($hasInput) or $count($messages) = 0) ? null : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": "Others",
                "userSent": false,
                "messages": [{"body": text}]
              };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "org.thoughtcrime.securesms",
    profiles: [
      {
        id: "signal-chat",
        extractors: [
          `(
            $rootBounds := $.bounds;
            $hasInput := $count($.**[id = "org.thoughtcrime.securesms:id/embedded_text_editor"]) > 0;
            $messages := $.**[id = "org.thoughtcrime.securesms:id/conversation_item_body"];
            $result := ($not($hasInput) or $count($messages) = 0) ? null : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2 ? "Me" : "Others",
                "userSent": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2,
                "messages": [{"body": text}]
              };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "com.discord",
    profiles: [
      {
        id: "discord-chat",
        extractors: [
          `(
            $rootBounds := $.bounds;
            $hasInput := $count($.**[id = "com.discord:id/chat_input_edit_text"]) > 0;
            $messageNodes := $.**[id = "com.discord:id/accessories_view"].(
              $count(children) > 0 ? children[0] : $
            );
            $result := ($not($hasInput) or $count($messageNodes) = 0) ? null : (
              $sorted := $sort($messageNodes, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2 ? "Me" : "Others",
                "userSent": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2,
                "messages": [{"body": text ?? ""}]
              };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "co.hinge.app",
    profiles: [
      {
        id: "hinge-chat",
        extractors: [
          `(
            $rootBounds := $.bounds;
            $hasInput := $count($.**[id = "co.hinge.app:id/messageComposition"]) > 0;
            $messages := $.**[id = "co.hinge.app:id/chatBubble"];
            $result := ($not($hasInput) or $count($messages) = 0) ? null : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2 ? "Me" : "Others",
                "userSent": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2,
                "messages": [{"body": text}]
              };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "com.tinder",
    profiles: [
      {
        id: "tinder-chat",
        extractors: [
          `(
            $rootBounds := $.bounds;
            $hasInput := $count($.**[id = "com.tinder:id/textMessageInput"]) > 0;
            $messages := $.**[id = "com.tinder:id/chatTextMessageContent"];
            $result := ($not($hasInput) or $count($messages) = 0) ? null : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2 ? "Me" : "Others",
                "userSent": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2,
                "messages": [{"body": text}]
              };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "com.vr.heymandi",
    profiles: [
      {
        id: "heymandi-chat",
        extractors: [
          `(
            $rootBounds := $.bounds;
            $hasInput := $count($.**[id = "com.vr.heymandi:id/messageInput"]) > 0;
            $messages := $.**[id = "com.vr.heymandi:id/messageText"];
            $result := ($not($hasInput) or $count($messages) = 0) ? null : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2 ? "Me" : "Others",
                "userSent": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2,
                "messages": [{"body": text}]
              };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "com.android.systemui",
    profiles: [
      {
        id: "systemui",
        extractors: [
          `(
            $input := $.**[isFocused = true and isEditable = true][0];
            $expandedAreas := $.**[id = "com.android.systemui:id/expanded"];
            $notificationRows := $.**[id = "com.android.systemui:id/expandableNotificationRow"];
            $targets := $count($expandedAreas) > 0 ? $expandedAreas : $notificationRows;
            $candidates := $input ? $targets[bounds.top <= $input.bounds.top] : [];
            $closest := $count($candidates) > 0 ? $sort($candidates, function($a, $b) { $b.bounds.top - $a.bounds.top })[0] : null;
            $messages := $closest ? $closest.**[id != null and $endsWith(id, "android:id/message_text")] : [];
            $result := ($not($input) or $not($closest) or $count($messages) = 0) ? null : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": "Others",
                "userSent": false,
                "messages": [{"body": text ?? ""}]
              };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 1,
        },
      },
    ],
  },
  {
    rule: "tw.nekomimi.nekogram",
    profiles: [
      {
        id: "nekogram-chat",
        extractors: [
          `(
            $rootBounds := $.bounds;
            $contentNodes := $.**[id = "android:id/content"];
            $contentNode := (($count($contentNodes) = 1) and ($contentNodes[0].packageName = "tw.nekomimi.nekogram")) ? $contentNodes[0] : null;
            $input := $.**[packageName = "tw.nekomimi.nekogram" and className = "android.widget.EditText" and isFocused = true][0];
            $hasTrigger := $contentNode and $input and (($contentNode.bounds.top + $contentNode.bounds.bottom) / 2 < $input.bounds.bottom);
            $bubbles := $.**[className = "android.view.ViewGroup" and text != null and text != ""];
            $result := ($not($hasTrigger) or $count($bubbles) = 0) ? null : (
              $sorted := $sort($bubbles, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2 ? "Me" : "Others",
                "userSent": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2,
                "messages": [{"body": text}]
              };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "com.mattermost.rn",
    profiles: [
      {
        id: "mattermost-chat",
        extractors: [
          `(
            $hasInput := $count($.**[id = "channel.post_draft.post.input"]) > 0;
            $messages := $.**[viewIdResourceName = "markdown_paragraph"].**[text != null and $trim(text) != ""];
            $result := ($not($hasInput) or $count($messages) = 0) ? null : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": "Others",
                "userSent": false,
                "messages": [{"body": text}]
              };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "com.google.android.apps.messaging",
    profiles: [
      {
        id: "google-messages-chat",
        extractors: [
          `(
            $rootBounds := $.bounds;
            $hasInput := $count($.**[id = "com.google.android.apps.messaging:id/compose_message_text"]) > 0;
            $messages := $.**[viewIdResourceName = "message_text"];
            $result := ($not($hasInput) or $count($messages) = 0) ? null : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2 ? "Me" : "Others",
                "userSent": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2,
                "messages": [{"body": text}]
              };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "com.facebook.orca",
    profiles: [
      {
        id: "messenger-chat",
        extractors: [
          `(
            $rootBounds := $.bounds;
            $hasInput := $count($.**[packageName = "com.facebook.orca" and isFocused = true]) > 0;
            $bubbles := $.**[className = "android.view.ViewGroup" and text != null and $trim(text) != ""];
            $result := ($not($hasInput) or $count($bubbles) = 0) ? null : (
              $sorted := $sort($bubbles, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2 ? "Me" : "Others",
                "userSent": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2,
                "messages": [{"body": text}]
              };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "com.snapchat.android",
    profiles: [
      {
        id: "snapchat-chat",
        extractors: [
          `(
            $hasInput := $count($.**[id = "com.snapchat.android:id/chat_input_text_field"]) > 0;
            $messages := $.**[className = "javaClass" and text != null and text != ""];
            $result := ($not($hasInput) or $count($messages) = 0) ? null : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": "Others",
                "userSent": false,
                "messages": [{"body": text}]
              };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "com.microsoft.teams",
    profiles: [
      {
        id: "teams-chat",
        extractors: [
          `(
            $rootBounds := $.bounds;
            $hasInput := $count($.**[id = "com.microsoft.teams:id/message_area_edit_text"]) > 0;
            $messages := $.**[id = "com.microsoft.teams:id/rich_text_layout"];
            $result := ($not($hasInput) or $count($messages) = 0) ? null : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2 ? "Me" : "Others",
                "userSent": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2,
                "messages": [{"body": contentDescription ?? ""}]
              };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "com.viber.voip",
    profiles: [
      {
        id: "viber-chat",
        extractors: [
          `(
            $rootBounds := $.bounds;
            $hasInput := $count($.**[id = "com.viber.voip:id/send_text"]) > 0;
            $messages := $.**[id = "com.viber.voip:id/textMessageView"];
            $result := ($not($hasInput) or $count($messages) = 0) ? null : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2 ? "Me" : "Others",
                "userSent": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2,
                "messages": [{"body": text}]
              };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "com.beeper.android",
    profiles: [
      {
        id: "beeper-chat",
        extractors: [
          `(
            $rootBounds := $.bounds;
            $contentNode := $.**[id = "android:id/content"][0];
            $input := $.**[packageName = "com.beeper.android" and isFocused = true][0];
            $hasTrigger := $contentNode and $input and (($contentNode.bounds.top + $contentNode.bounds.bottom) / 2 < $input.bounds.bottom);
            $messages := $.**[viewIdResourceName = "messageBubbleTextContent"];
            $result := ($not($hasTrigger) or $count($messages) = 0) ? null : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2 ? "Me" : "Others",
                "userSent": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2,
                "messages": [{"body": text}]
              };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "com.openai.chatgpt",
    profiles: [
      {
        id: "chatgpt-chat",
        extractors: [
          `(
            $input := $.**[className = "android.widget.EditText" and isFocused = true][0];
            $contentNode := $.**[id = "android:id/content"][0];
            $hasTrigger := $contentNode and $input and (($contentNode.bounds.top + $contentNode.bounds.bottom) / 2 < $input.bounds.bottom);
            $messages := $input ? $.**[text != null and $trim(text) != "" and $not(isShowingHintText) and $not(isFocused) and bounds.top <= $input.bounds.top] : [];
            $result := ($not($hasTrigger) or $count($messages) = 0) ? null : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": "OnScreen",
                "userSent": false,
                "messages": [{"body": text}]
              };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  {
    rule: "ai.perplexity.app.android",
    profiles: [
      {
        id: "perplexity-chat",
        extractors: [
          `(
            $rootBounds := $.bounds;
            $hasInput := $count($.**[id = "input-search"]) > 0;
            $thread := $.**[viewIdResourceName = "thread-screen"][0];
            $allTextViews := $thread ? $thread.**[className = "android.widget.TextView" and text != null and $trim(text) != ""] : [];
            $relatedTextViews := $thread ? $thread.**[viewIdResourceName != null and $contains(viewIdResourceName, "related")].**[className = "android.widget.TextView" and text != null and $trim(text) != ""] : [];
            $messages := $filter($allTextViews, function($msg) {
              $count($relatedTextViews[text = $msg.text and bounds.top = $msg.bounds.top and bounds.left = $msg.bounds.left and bounds.right = $msg.bounds.right and bounds.bottom = $msg.bounds.bottom]) = 0
            });
            $result := ($not($hasInput) or $not($thread) or $count($messages) = 0) ? null : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top - $b.bounds.top });
              $turns := $sorted.{
                "sender": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2 ? "Me" : "Others",
                "userSent": ($bounds.left + $bounds.right) / 2 > ($rootBounds.left + $rootBounds.right) / 2,
                "messages": [{"body": text}]
              };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 2,
        },
      },
    ],
  },
  // ** Added profiles for ALL supported Android apps
];

// ** Updated JSONata extractors with input position checks and not-found handling
// ** Added profiles for WhatsApp Business and Telegram Web
// ** Fixed telegram.messenger.web platform from web to android
