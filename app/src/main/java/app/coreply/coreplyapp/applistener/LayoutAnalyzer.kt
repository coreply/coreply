package app.coreply.coreplyapp.applistener

import android.graphics.Rect
import android.util.Log
import android.view.accessibility.AccessibilityNodeInfo
import app.coreply.coreplyapp.utils.ChatMessage
import java.util.ArrayList

fun generalTextInputFinder(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
    return node.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
}

val nodeComparator: Comparator<AccessibilityNodeInfo> =
    Comparator { o1: AccessibilityNodeInfo?, o2: AccessibilityNodeInfo? ->
        val rect1 = Rect()
        val rect2 = Rect()
        o1!!.getBoundsInScreen(rect1)
        o2!!.getBoundsInScreen(rect2)
        rect1.top - rect2.top
    }

fun generalMessageListProcessor(
    node: AccessibilityNodeInfo,
    messageWidgets: ArrayList<String>
): MutableList<ChatMessage> {
    val chatWidgets: MutableList<AccessibilityNodeInfo> = ArrayList<AccessibilityNodeInfo>()
    val chatMessages: MutableList<ChatMessage> = ArrayList<ChatMessage>()

    for (messageWidget in messageWidgets) {
        chatWidgets.addAll(node.findAccessibilityNodeInfosByViewId(messageWidget))
    }
    chatWidgets.sortWith(nodeComparator)

    val rootRect = Rect()
    node.getBoundsInScreen(rootRect)
    for (chatNodeInfo in chatWidgets) {
        val bounds = Rect()
        chatNodeInfo.getBoundsInScreen(bounds)
        val isMe = (bounds.left + bounds.right) / 2 > (rootRect.left + rootRect.right) / 2
        val message_text = chatNodeInfo.text?.toString() ?: ""
        chatMessages.add(ChatMessage(if (isMe) "Me" else "Others", message_text, ""))
    }

    //Log.v("CoWA", conversationList.toString())
    return chatMessages
}

/**
 * Recursively finds all nodes with the specified ID.
 *
 * @param rootNode The node to start searching from
 * @param targetId The ID to search for, e.g. "android:id/message_text"
 * @return List of nodes matching the target ID
 */
fun findNodesByCriteria(
    rootNode: AccessibilityNodeInfo?,
    nodeChecker: (AccessibilityNodeInfo) -> Boolean
): MutableList<AccessibilityNodeInfo> {
    val results = mutableListOf<AccessibilityNodeInfo>()
    if (rootNode == null) return results
    try {
        if (nodeChecker(rootNode)) {
            results.add(rootNode)

        }
    } catch (e: Exception) {
        Log.e("findNodesWithId", "Error accessing viewIdResourceName: ${e.message}")
    }

    // Recursively search through child nodes
    for (i in 0 until rootNode.childCount) {
        try {
            val childNode = rootNode.getChild(i)
            if (childNode != null) {
                results.addAll(findNodesByCriteria(childNode, nodeChecker))
            }
        } catch (e: Exception) {
            Log.e("findNodesWithId", "Error accessing child node: ${e.message}")
        }
    }

    return results
}

fun notificationMessageListProcessor(node: AccessibilityNodeInfo): MutableList<ChatMessage> {
    val textInputNode = node.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
    if (textInputNode == null) {
        return mutableListOf()
    }
    var targetAreas = node.findAccessibilityNodeInfosByViewId("com.android.systemui:id/expanded")
    if (targetAreas.isEmpty()) {
        targetAreas =
            node.findAccessibilityNodeInfosByViewId("com.android.systemui:id/expandableNotificationRow")
    }

    // Get the rect of the text input node
    val textInputRect = Rect()
    textInputNode.getBoundsInScreen(textInputRect)

    // Find the target area that is above the text input but closest to it
    var closestTarget: AccessibilityNodeInfo? = null
    var minDistance = Int.MAX_VALUE

    for (targetArea in targetAreas) {
        val targetRect = Rect()
        targetArea.getBoundsInScreen(targetRect)

        // Check if the target is above the text input
        if (targetRect.top <= textInputRect.top) {
            // Calculate the vertical distance between the bottom of target and top of input
            val distance = textInputRect.top - targetRect.top

            // Update closest target if this one is closer
            if (distance < minDistance) {
                minDistance = distance
                closestTarget = targetArea
            }
        }
    }

    // Process the closest target for chat messages
    // For now, return empty list if no suitable target is found
    return if (closestTarget != null) {
        val chatMessages: MutableList<ChatMessage> = ArrayList<ChatMessage>()
        val chatWidgets = findNodesByCriteria(closestTarget, {
            val nodeId = it.viewIdResourceName
            nodeId != null && nodeId.endsWith("android:id/message_text")
        })
        chatWidgets.sortWith(nodeComparator)

        val rootRect = Rect()
        node.getBoundsInScreen(rootRect)
        for (chatNodeInfo in chatWidgets) {
            val bounds = Rect()
            chatNodeInfo.getBoundsInScreen(bounds)
            val message_text = chatNodeInfo.text?.toString() ?: ""
            chatMessages.add(ChatMessage("Others", message_text, ""))
        }

        //Log.v("CoWA", conversationList.toString())
        chatMessages
    } else {
        mutableListOf()
    }
}

fun telegramMessageListProcessor(node: AccessibilityNodeInfo): MutableList<ChatMessage> {
    val chatMessages: MutableList<ChatMessage> = ArrayList<ChatMessage>()
    val contentNodes = node.findAccessibilityNodeInfosByViewId("android:id/content")
    if (contentNodes != null && contentNodes.size == 1) {

        val chatWidgets: MutableList<AccessibilityNodeInfo> = findNodesByCriteria(
            node,
            { (it.className == "android.view.ViewGroup" && it.text != null && it.text.isNotBlank()) })

        chatWidgets.sortWith(nodeComparator)

        val rootRect = Rect()
        node.getBoundsInScreen(rootRect)
        for (chatNodeInfo in chatWidgets) {
            val bounds = Rect()
            chatNodeInfo.getBoundsInScreen(bounds)
            val isMe = (bounds.left + bounds.right) / 2 > (rootRect.left + rootRect.right) / 2
            val message_text = chatNodeInfo.text?.toString() ?: ""
            chatMessages.add(ChatMessage(if (isMe) "Me" else "Others", message_text, ""))
        }
    }
    //Log.v("CoWA", conversationList.toString())
    return chatMessages
}

fun mattermostMessageListProcessor(node: AccessibilityNodeInfo): MutableList<ChatMessage> {
    val chatMessages: MutableList<ChatMessage> = ArrayList<ChatMessage>()
    val chatWidgetsParents: MutableList<AccessibilityNodeInfo> = findNodesByCriteria(
        node,
        { (it.className == "android.view.ViewGroup" && it.viewIdResourceName == "markdown_paragraph") })

    val chatWidgets: MutableList<AccessibilityNodeInfo> = ArrayList<AccessibilityNodeInfo>()

    chatWidgets.addAll(chatWidgetsParents.map { findNodesByCriteria(it, { it.text.isNotBlank() }) }
        .flatten())
    chatWidgets.sortWith(nodeComparator)

    for (chatNodeInfo in chatWidgets) {
        val message_text = chatNodeInfo.text?.toString() ?: ""
        chatMessages.add(ChatMessage("Others", message_text, ""))
    }
    //Log.v("CoWA", conversationList.toString())
    return chatMessages
}

fun googleMessageListProcessor(node: AccessibilityNodeInfo): MutableList<ChatMessage> {
    val chatMessages: MutableList<ChatMessage> = ArrayList<ChatMessage>()
    val chatWidgets: MutableList<AccessibilityNodeInfo> = findNodesByCriteria(
        node,
        { it.viewIdResourceName == "message_text" })
    chatWidgets.sortWith(nodeComparator)

    val rootRect = Rect()
    node.getBoundsInScreen(rootRect)
    for (chatNodeInfo in chatWidgets) {
        val bounds = Rect()
        chatNodeInfo.getBoundsInScreen(bounds)
        val isMe = (bounds.left + bounds.right) / 2 > (rootRect.left + rootRect.right) / 2
        val message_text = chatNodeInfo.text?.toString() ?: ""
        chatMessages.add(ChatMessage(if (isMe) "Me" else "Others", message_text, ""))
    }
    //Log.v("CoWA", conversationList.toString())
    return chatMessages
}

fun scMessageListProcessor(node: AccessibilityNodeInfo): MutableList<ChatMessage> {
    val chatMessages: MutableList<ChatMessage> = ArrayList<ChatMessage>()

    val chatWidgets: MutableList<AccessibilityNodeInfo> = findNodesByCriteria(
        node,
        { (it.text != null && it.text.isNotBlank() && it.className == "javaClass") })

    chatWidgets.sortWith(nodeComparator)
    for (chatNodeInfo in chatWidgets) {
        val message_text = chatNodeInfo.text?.toString() ?: ""
        chatMessages.add(ChatMessage("Others", message_text, ""))

    }
    //Log.v("CoWA", conversationList.toString())
    return chatMessages
}

fun teamsMessageListProcessor(
    node: AccessibilityNodeInfo,
    messageWidgets: ArrayList<String>
): MutableList<ChatMessage> {
    val chatWidgets: MutableList<AccessibilityNodeInfo> = ArrayList<AccessibilityNodeInfo>()
    val chatMessages: MutableList<ChatMessage> = ArrayList<ChatMessage>()

    for (messageWidget in messageWidgets) {
        chatWidgets.addAll(node.findAccessibilityNodeInfosByViewId(messageWidget))
    }
    chatWidgets.sortWith(nodeComparator)

    val rootRect = Rect()
    node.getBoundsInScreen(rootRect)
    for (chatNodeInfo in chatWidgets) {
        val bounds = Rect()
        chatNodeInfo.getBoundsInScreen(bounds)
        val isMe = (bounds.left + bounds.right) / 2 > (rootRect.left + rootRect.right) / 2
        val message_text = chatNodeInfo.contentDescription?.toString() ?: ""
        chatMessages.add(ChatMessage(if (isMe) "Me" else "Others", message_text, ""))
    }

    //Log.v("CoWA", conversationList.toString())
    return chatMessages
}
