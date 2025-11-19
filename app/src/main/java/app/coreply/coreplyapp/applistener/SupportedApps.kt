package app.coreply.coreplyapp.applistener

import android.view.accessibility.AccessibilityNodeInfo

/**
 * Created on 1/16/17.
 */
object SupportedApps {
    val supportedApps: Array<SupportedAppProperty> = arrayOf(

        SupportedAppProperty(
            "com.whatsapp.w4b",
            { _, _, id, _ -> id == "com.whatsapp.w4b:id/entry" },
            arrayOf<String>("com.whatsapp.w4b/menuitem_delete"),
            { node: AccessibilityNodeInfo ->
                generalMessageListProcessor(
                    node,
                    arrayListOf("com.whatsapp.w4b:id/message_text", "com.whatsapp.w4b:id/caption")
                )
            }
        ),
        SupportedAppProperty(
            "jp.naver.line.android",
            { _, _, id, _ -> id == "jp.naver.line.android:id/chat_ui_message_edit" },
            arrayOf<String>(),
            { node: AccessibilityNodeInfo ->
                generalMessageListProcessor(
                    node,
                    arrayListOf("jp.naver.line.android:id/chat_ui_message_text")
                )
            }
        ),

        SupportedAppProperty(
            "com.instagram.android",
            { _, _, id, _ -> id == "com.instagram.android:id/row_thread_composer_edittext" },
            arrayOf<String>(),
            { node: AccessibilityNodeInfo ->
                generalMessageListProcessor(
                    node,
                    arrayListOf("com.instagram.android:id/direct_text_message_text_view")
                )
            }
        ),

        SupportedAppProperty(
            "org.thoughtcrime.securesms",
            { _, _, id, _ -> id == "org.thoughtcrime.securesms:id/embedded_text_editor" },
            arrayOf<String>(),
            { node: AccessibilityNodeInfo ->
                generalMessageListProcessor(
                    node,
                    arrayListOf("org.thoughtcrime.securesms:id/conversation_item_body")
                )
            }
        ),

        SupportedAppProperty(
            "co.hinge.app",
            { _, _, id, _ -> id == "co.hinge.app:id/messageComposition" },
            arrayOf<String>(),
            { node: AccessibilityNodeInfo ->
                generalMessageListProcessor(
                    node,
                    arrayListOf("co.hinge.app:id/chatBubble")
                )
            }
        ),
        SupportedAppProperty(
            "com.tinder",
            { _, _, id, _ -> id == "com.tinder:id/textMessageInput" },
            arrayOf<String>(),
            { node: AccessibilityNodeInfo ->
                generalMessageListProcessor(
                    node,
                    arrayListOf("com.tinder:id/chatTextMessageContent")
                )
            }
        ),
        SupportedAppProperty(
            "com.vr.heymandi",
            { _, _, id, _ -> id == "com.vr.heymandi:id/messageInput" },
            arrayOf<String>(),
            { node: AccessibilityNodeInfo ->
                generalMessageListProcessor(
                    node,
                    arrayListOf("com.vr.heymandi:id/messageText")
                )
            }
        ),
        SupportedAppProperty(
            "com.google.android.gm",
            { _, _, id, _ -> id == "com.google.android.gm:id/inline_reply_compose_edit_text" },
            arrayOf<String>(),
            { node: AccessibilityNodeInfo ->
                generalMessageListProcessor(
                    node,
                    arrayListOf(
                        "com.google.android.gm:id/subject_and_folder_view",
                        "com.google.android.gm:id/email_snippet"
                    )
                )
            }
        ),
        SupportedAppProperty(
            "com.android.systemui",
            { root, _, id, pkg ->
                root.findAccessibilityNodeInfosByViewId("com.android.systemui:id/expandableNotificationRow")
                    .isNotEmpty() || root.findAccessibilityNodeInfosByViewId("com.android.systemui:id/expanded")
                    .isNotEmpty()
            },
            arrayOf<String>(),
            { node: AccessibilityNodeInfo ->
                notificationMessageListProcessor(node)
            }
        ),
        SupportedAppProperty(
            "com.whatsapp",
            { _, _, id, _ -> id == "com.whatsapp:id/entry" },
            arrayOf<String>("com.whatsapp:id/menuitem_delete"),
            { node: AccessibilityNodeInfo ->
                generalMessageListProcessor(
                    node,
                    arrayListOf("com.whatsapp:id/message_text", "com.whatsapp:id/caption")
                )
            }
        ),
        SupportedAppProperty(
            "org.telegram.messenger",
            { root, focus, id, pkg -> pkg == "org.telegram.messenger" && telegramDetector(root).first },
            arrayOf<String>(),
            {
                telegramMessageListProcessor(it)
            }
        ),
        SupportedAppProperty(
            "org.telegram.messenger.web",
            { root, focus, id, pkg ->
                pkg == "org.telegram.messenger.web" && telegramDetector(
                    root,
                    "org.telegram.messenger.web"
                ).first
            },
            arrayOf<String>(),
            {
                telegramMessageListProcessor(it)
            }
        ),
        SupportedAppProperty(
            "tw.nekomimi.nekogram",
            { root, focus, id, pkg ->
                pkg == "tw.nekomimi.nekogram" && telegramDetector(
                    root,
                    "tw.nekomimi.nekogram"
                ).first
            },
            arrayOf<String>(),
            {
                telegramMessageListProcessor(it)
            }
        ),
        SupportedAppProperty(
            "com.mattermost.rn",
            { _, _, id, _ -> id == "channel.post_draft.post.input" },
            arrayOf<String>(),
            {
                mattermostMessageListProcessor(it)
            }
        ),

        SupportedAppProperty(
            "com.google.android.apps.messaging",
            { _, _, id, _ -> id == "com.google.android.apps.messaging:id/compose_message_text" },
            arrayOf<String>(),
            {
                googleMessageListProcessor(it)
            }
        ),
        SupportedAppProperty(
            "com.facebook.orca",
            { root, focus, id, pkg -> pkg == "com.facebook.orca" },
            arrayOf<String>(),
            {
                telegramMessageListProcessor(it)
            }
        ),
        SupportedAppProperty(
            "com.snapchat.android:id",
            { root, focus, id, pkg -> id == "com.snapchat.android:id/chat_input_text_field" },
            arrayOf<String>(),
            {
                scMessageListProcessor(it)
            }
        ),

        SupportedAppProperty(
            "com.microsoft.teams:id",
            { _, _, id, _ -> id == "com.microsoft.teams:id/message_area_edit_text" },
            arrayOf<String>(),
            { node: AccessibilityNodeInfo ->
                teamsMessageListProcessor(
                    node,
                    arrayListOf("com.microsoft.teams:id/rich_text_layout")
                )
            }
        ),
        SupportedAppProperty(
            "com.viber.voip",
            { _, _, id, _ -> id == "com.viber.voip:id/send_text" },
            arrayOf<String>(),
            { node: AccessibilityNodeInfo ->
                generalMessageListProcessor(
                    node,
                    arrayListOf("com.viber.voip:id/textMessageView")
                )
            }
        ),
        SupportedAppProperty(
            pkgName = "com.discord",
            inputJudger = { _, _, id, _ -> id == "com.discord:id/chat_input_edit_text" },
            excludeWidgets = arrayOf<String>(),
            messageListProcessor = { node: AccessibilityNodeInfo ->
                generalMessageListProcessor(
                    node = node,
                    messageWidgets = arrayListOf("com.discord:id/accessories_view"),
                    getChild = { msgNode: AccessibilityNodeInfo ->
                        if (msgNode.childCount > 0) msgNode.getChild(
                            0
                        ) else msgNode
                    }
                )
            }
        ),
        SupportedAppProperty(
            pkgName = "com.beeper.android",
            inputJudger = { root, focus, id, pkgName -> pkgName == "com.beeper.android" && beeperDetector(root) },
            excludeWidgets = arrayOf<String>(),
            messageListProcessor = { node: AccessibilityNodeInfo ->
                beeperMessageListProcessor(node)
            }
        )
    )
}
