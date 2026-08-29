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

const buildWhatsAppChatExtractor = (packageName: string) => `(
  $packageId := "${packageName}";
  $rootBounds := $.bounds;
  $hasInput := $count($.**[id = $packageId & ":id/entry"]) > 0;
  $rows := $.**[
    viewIdResourceName = $packageId & ":id/conversation_text_row" and
    $count(children[
      (id = $packageId & ":id/message_text" or id = $packageId & ":id/caption") and
      isVisibleToUser = true
    ]) > 0
  ];
  $result := ($not($hasInput) or $count($rows) = 0) ? null : (
    $sorted := $sort($rows, function($a, $b) {
      $a.bounds.top > $b.bounds.top or
      ($a.bounds.top = $b.bounds.top and $a.bounds.left > $b.bounds.left)
    });
    $turns := [$map($sorted, function($row) {(
      $messageNode := $row.children[
        (id = $packageId & ":id/message_text" or id = $packageId & ":id/caption") and
        isVisibleToUser = true
      ][0];
      $quoteNode := $row.**[id = $packageId & ":id/quoted_text" and isVisibleToUser = true][0];
      $timeNode := $row.**[id = $packageId & ":id/date"][0];
      $nameNode := $row.**[id = $packageId & ":id/name_in_group_tv" and isVisibleToUser = true][0];
       $userSent := $exists($row.**[id = $packageId & ":id/status"][0]) or
         (($messageNode.bounds.left + $messageNode.bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2);
      {
        "sender": $userSent ? "Me" : ($exists($nameNode.text) ? $nameNode.text : "Others"),
        "userSent": $userSent,
        "messages": [{
          "body": $messageNode.text,
          "time": $exists($timeNode.text) ? $timeNode.text : "",
          "quote": $exists($quoteNode.text) ? $quoteNode.text : ""
        }]
      }
    )})];
    {
      "type": "chat",
      "label": "messages",
      "snapshotFrequency": "active",
      "turns": $turns
    }
  );
  $result
)`;

// ** Fixed JSONata syntax: replaced custom shorthand with standard $.** for recursive descent
export const profileGroups: ProfileGroup[] = [
  {
    rule: "com.whatsapp",
    profiles: [
      {
        id: "whatsapp-chat",
        extractors: [buildWhatsAppChatExtractor("com.whatsapp")],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 1,
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
            $input := $.**[packageName = "org.telegram.messenger" and className = "android.widget.EditText" and isFocused = true][0];
            $hasTrigger := $exists($input) and (($rootBounds.top + $rootBounds.bottom) / 2 < $input.bounds.bottom);
            $bubbles := $.**[
              packageName = "org.telegram.messenger" and
              className = "android.view.ViewGroup" and
              text != null and
              $trim(text) != "" and
              bounds.bottom <= $input.bounds.top
            ];
             $result := ($not($hasTrigger) or $count($bubbles) = 0) ? null : (
               $sorted := $sort($bubbles, function($a, $b) { $a.bounds.top > $b.bounds.top });
               $turns := $sorted.{
                 "sender": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2) ? "Me" : "Others",
                 "userSent": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2),
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
          sameProfile: 1,
        },
      },
    ],
  },
  {
    rule: "com.whatsapp.w4b",
    profiles: [
      {
        id: "whatsapp-business-chat",
        extractors: [buildWhatsAppChatExtractor("com.whatsapp.w4b")],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 1,
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
            $input := $.**[packageName = "org.telegram.messenger.web" and className = "android.widget.EditText" and isFocused = true][0];
            $hasTrigger := $exists($input) and (($rootBounds.top + $rootBounds.bottom) / 2 < $input.bounds.bottom);
             $bubbles := $.**[
               packageName = "org.telegram.messenger.web" and
               className = "android.view.ViewGroup" and
               text != null and
               $trim(text) != "" and
               bounds.bottom <= $input.bounds.top
             ];
             $result := ($not($hasTrigger) or $count($bubbles) = 0) ? null : (
               $sorted := $sort($bubbles, function($a, $b) { $a.bounds.top > $b.bounds.top });
               $turns := $sorted.{
                 "sender": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2) ? "Me" : "Others",
                 "userSent": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2),
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
          sameProfile: 1,
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
               $sorted := $sort($messages, function($a, $b) { $a.bounds.top > $b.bounds.top });
               $turns := $sorted.{
                 "sender": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2) ? "Me" : "Others",
                 "userSent": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2),
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
          sameProfile: 1,
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
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top > $b.bounds.top });
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
          sameProfile: 1,
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
               $sorted := $sort($messages, function($a, $b) { $a.bounds.top > $b.bounds.top });
               $turns := $sorted.{
                 "sender": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2) ? "Me" : "Others",
                 "userSent": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2),
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
          sameProfile: 1,
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
               $sorted := $sort($messageNodes, function($a, $b) { $a.bounds.top > $b.bounds.top });
               $turns := $sorted.{
                 "sender": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2) ? "Me" : "Others",
                 "userSent": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2),
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
               $sorted := $sort($messages, function($a, $b) { $a.bounds.top > $b.bounds.top });
               $turns := $sorted.{
                 "sender": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2) ? "Me" : "Others",
                 "userSent": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2),
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
          sameProfile: 1,
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
               $sorted := $sort($messages, function($a, $b) { $a.bounds.top > $b.bounds.top });
               $turns := $sorted[].{
                 "sender": (((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2)) ? "Me" : "Others",
                 "userSent": (((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2)),
                 "messages": [{"body": text}]
               };
              {"type": "chat", "label": "messages", "snapshotFrequency": "active", "turns": $turns}
            );
            $result
          )`,
          `(
            $profilePage := $.**[id = "com.tinder:id/user_rec_sparks_profile"][];
            $isProfilePage := $count($profilePage) = 1;
            $extractNestedText := function($node) {(
               {"text": $node.text, "children": $map($node.children[$count(children) > 0 or text != null], $extractNestedText)[]}
            )};
            $screenText := $extractNestedText($profilePage[0]);
             $result := $isProfilePage ? (
               $merge([{"type": "screen", "label": "user_profile", "snapshotFrequency": "frequent"}, $screenText])
             ) : null;
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: {
            messages: 1,
            user_profile: 1,
          },
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
               $sorted := $sort($messages, function($a, $b) { $a.bounds.top > $b.bounds.top });
               $turns := $sorted.{
                 "sender": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2) ? "Me" : "Others",
                 "userSent": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2),
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
          sameProfile: 1,
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
            $closest := $count($candidates) > 0 ? $sort($candidates, function($a, $b) { $a.bounds.top < $b.bounds.top })[0] : null;
            $messages := $closest ? $closest.**[id != null and $contains(id, "android:id/message_text")] : [];
            $result := ($not($input) or $not($closest) or $count($messages) = 0) ? null : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top > $b.bounds.top });
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
               $sorted := $sort($bubbles, function($a, $b) { $a.bounds.top > $b.bounds.top });
               $turns := $sorted.{
                 "sender": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2) ? "Me" : "Others",
                 "userSent": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2),
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
          sameProfile: 1,
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
            $messageRows := $.**[
              $exists(children[viewIdResourceName = "markdown_paragraph"])
            ];
            $messages := $distinct(
              $messageRows.children[
                className = "android.widget.TextView" and
                text != null and
                $trim(text) != "" and
                $not(id = "post_header.display_name") and
                $not(id = "post_header.date_time") and
                $not(id = "post_footer.reply_count")
              ]
            );
            $result := ($not($hasInput) or $count($messages) = 0) ? null : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top > $b.bounds.top });
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
          sameProfile: 1,
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
               $sorted := $sort($messages, function($a, $b) { $a.bounds.top > $b.bounds.top });
               $turns := $sorted.{
                 "sender": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2) ? "Me" : "Others",
                 "userSent": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2),
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
          sameProfile: 1,
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
                $sorted := $sort($bubbles, function($a, $b) { $a.bounds.top > $b.bounds.top });
                $messagesWithSender := [$map($sorted, function($bubble) {
                  {
                    "sender": (($bubble.bounds.left + $bubble.bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2) ? "Me" : "Others",
                    "userSent": (($bubble.bounds.left + $bubble.bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2),
                    "body": $substringAfter($bubble.text, ", ")
                  }
                })];
                $groupTurns := function($remaining, $current, $acc) {
                  $count($remaining) = 0 ?
                    ($current ? $append($acc, $current) : $acc)
                  : (
                    $msg := $remaining[0];
                    $nextCurrent := $current = null ? {
                      "sender": $msg.sender,
                      "userSent": $msg.userSent,
                      "messages": [{"body": $msg.body}]
                    } : (
                      ($current.sender = $msg.sender and $current.userSent = $msg.userSent) ? {
                        "sender": $current.sender,
                        "userSent": $current.userSent,
                        "messages": $append($current.messages, {"body": $msg.body})
                      } : {
                        "sender": $msg.sender,
                        "userSent": $msg.userSent,
                        "messages": [{"body": $msg.body}]
                      }
                    );
                    $nextAcc := $current != null and ($current.sender != $msg.sender or $current.userSent != $msg.userSent) ? $append($acc, $current) : $acc;
                    $groupTurns($remaining[[1..$count($remaining)-1]], $nextCurrent, $nextAcc)
                  )
                };
                $turns := $groupTurns($messagesWithSender, null, []);
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
    rule: "com.snapchat.android",
    profiles: [
      {
        id: "snapchat-chat",
        extractors: [
          `(
            $hasInput := $count($.**[id = "com.snapchat.android:id/chat_input_text_field"]) > 0;
            $messages := $.**[className = "javaClass" and text != null and text != ""];
            $result := ($not($hasInput) or $count($messages) = 0) ? null : (
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top > $b.bounds.top });
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
          sameProfile: 1,
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
               $sorted := $sort($messages, function($a, $b) { $a.bounds.top > $b.bounds.top });
               $turns := $sorted.{
                 "sender": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2) ? "Me" : "Others",
                 "userSent": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2),
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
          sameProfile: 1,
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
               $sorted := $sort($messages, function($a, $b) { $a.bounds.top > $b.bounds.top });
               $turns := $sorted.{
                 "sender": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2) ? "Me" : "Others",
                 "userSent": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2),
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
          sameProfile: 1,
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
               $sorted := $sort($messages, function($a, $b) { $a.bounds.top > $b.bounds.top });
               $turns := $sorted.{
                 "sender": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2) ? "Me" : "Others",
                 "userSent": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2),
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
          sameProfile: 1,
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
              $sorted := $sort($messages, function($a, $b) { $a.bounds.top > $b.bounds.top });
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
          sameProfile: 1,
        },
      },
    ],
  },
  {
    rule: "ai.perplexity.app.android",
    profiles: [
      {
        id: "perplexity-home-search",
        extractors: [
          `(
            $input := $.**[id = "input-search" and isFocused = true][0];
            $isHomeScreen := $count($.**[id = "home-screen"]) > 0;
            $result := ($not($input) or $not($isHomeScreen)) ? null : {
              "type": "screen",
              "label": "search",
              "snapshotFrequency": "active",
              "text": "Perplexity search composer"
            };
            $result
          )`,
        ],
        platform: "android",
        dropRule: {
          differentProfile: 0,
          sameProfile: 1,
        },
      },
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
               $sorted := $sort($messages, function($a, $b) { $a.bounds.top > $b.bounds.top });
               $turns := $sorted.{
                 "sender": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2) ? "Me" : "Others",
                 "userSent": ((bounds.left + bounds.right) / 2) > (($rootBounds.left + $rootBounds.right) / 2),
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
          sameProfile: 1,
        },
      },
    ],
  },
  // ** Added profiles for ALL supported Android apps
];

// ** Dynamically generates a generic profile for any selected app without predefined extractors.
// ** A single extractor builds a nested screen-context tree from all visible text; snapshotFrequency
// ** is "active" when an EditText is focused, otherwise "frequent".
export function generateGenericProfile(
  packageName: string,
  platform: "android" | "web",
): Profile {
  const extractor = `(
    $extract := function($node) {(
      {"text": $node.text, "children": $map($node.children[$count(children) > 0 or text != null], $extract)[]}
    )};
    $tree := $extract($);
    $hasText := $exists($tree.text) or $count($tree.**[text != null]) > 0;
    $input := $.**[className = "android.widget.EditText" and isFocused = true][0];
    $result := $hasText ? {
      "type": "screen",
      "label": "screen",
      "snapshotFrequency": $exists($input) ? "active" : "frequent",
      "text": $tree.text,
      "children": $tree.children[]
    } : null;
    $result
  )`;
  return {
    id: `generic-${packageName}`,
    extractors: [extractor],
    platform: platform,
    dropRule: {
      differentProfile: 0,
      sameProfile: 2,
    },
  };
}

// ** Updated JSONata extractors with input position checks and not-found handling
// ** Added profiles for WhatsApp Business and Telegram Web
// ** Fixed telegram.messenger.web platform from web to android
