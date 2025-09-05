package app.coreply.coreplyapp.applistener

import android.graphics.Rect
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

enum class DetectedApp {
    WHATSAPP,
    WHATSAPP_BUSINESS,
    LINE,
    INSTAGRAM,
    SIGNAL,
    HINGE,
    TINDER,
    HEYMANDI,
    GMAIL,
    ANDROID_SYSTEM,
    TELEGRAM,
    MATTER_MOST,
    GOOGLE_MESSAGES,
    FB_MESSENGER,
    SNAPCHAT,
    TEAMS,
    OTHER,
    NOT_DETECTED
}


fun detectSupportedApp(rootNode: AccessibilityNodeInfo?): Pair<SupportedAppProperty?, AccessibilityNodeInfo?> {
    val inputNode = rootNode?.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
//    iterNode(rootNode!!)
    if (inputNode != null) {
        val inputNodeId = inputNode.viewIdResourceName ?: ""
        val inputNodePackage = inputNode.packageName ?: ""
        for (app in SupportedApps.supportedApps){
            if (app.inputJudger(rootNode, inputNode, inputNodeId, inputNodePackage.toString())) {
                return Pair(
                    app,
                    inputNode
                )
            }
        }

    }
    return Pair(null, null)
}

fun makeGeneralDetector(
    targetId: String,
    returnTrigger: Boolean = true
): (AccessibilityNodeInfo, AccessibilityEvent?) -> Pair<Boolean, AccessibilityNodeInfo?> {
    return { node: AccessibilityNodeInfo, event: AccessibilityEvent? ->
        generalDetector(node, targetId, returnTrigger)
    }
}

fun generalDetector(
    node: AccessibilityNodeInfo,
    targetId: String,
    returnTrigger: Boolean = true
): Pair<Boolean, AccessibilityNodeInfo?> {
    val triggerWidgetList =
        node.findAccessibilityNodeInfosByViewId(targetId)
    //iterNode(node)
    if (triggerWidgetList != null && triggerWidgetList.isNotEmpty()) { // Only one trigger widget is supported
        return Pair(true, if (returnTrigger) triggerWidgetList[0] else null)
    } else {
        return Pair(false, null)
    }

}

/**
 * Checks if a content node is above an input widget in screen coordinates
 */
fun isContentNodeAboveInput(
    contentNode: AccessibilityNodeInfo?,
    inputNode: AccessibilityNodeInfo?
): Boolean {
    if (contentNode == null || inputNode == null) {
        return false
    }

    val contentRect = Rect()
    val inputRect = Rect()

    try {
        contentNode.getBoundsInScreen(contentRect)
        inputNode.getBoundsInScreen(inputRect)
        // Check if the content node's bottom is above the input's top

        return (contentRect.top + contentRect.bottom) / 2 < inputRect.bottom
    } catch (e: Exception) {
        Log.e("TriggerDetector", "Error checking node positions: ${e.message}")
        return false
    }
}

fun telegramDetector(node: AccessibilityNodeInfo, tgPkgName: String = "org.telegram.messenger"): Pair<Boolean, AccessibilityNodeInfo?> {
    val contentNodes = node.findAccessibilityNodeInfosByViewId("android:id/content")
    if (contentNodes != null && contentNodes.size == 1) {
        val contentNode = contentNodes[0]
        if (contentNode.packageName == tgPkgName) {
            val inputWidget = node.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
            if (inputWidget != null && inputWidget.packageName == tgPkgName) {
                // Verify the content node is above the input widget
                if (isContentNodeAboveInput(contentNode, inputWidget)) {
                    return Pair(true, inputWidget)
                }
            }
        }
    }
    return Pair(false, null)
}

fun iterNode(node: AccessibilityNodeInfo) {
    Log.v(
        "CoWA",
        "iterNode: node=${node.className}, text=${node.text}, contentDescription=${node.contentDescription}, viewId=${node.viewIdResourceName}"
    )
    for (i in 0 until node.childCount) {
        val child = node.getChild(i)
        if (child != null) {
            iterNode(child)
        }
    }
}