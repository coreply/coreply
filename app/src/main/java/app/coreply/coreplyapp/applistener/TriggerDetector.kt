package app.coreply.coreplyapp.applistener

import android.graphics.Rect
import android.util.Log
import android.view.accessibility.AccessibilityNodeInfo


fun detectSupportedApp(
    rootNode: AccessibilityNodeInfo,
    selectedApps: Set<String>
): Pair<SupportedAppProperty?, AccessibilityNodeInfo?> {
    val inputNode = try {
        rootNode.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
    } catch (e: IllegalStateException){
        e.printStackTrace()
        null
    }

//    iterNode(rootNode!!)
    if (inputNode != null) {
        val inputNodeId = inputNode.viewIdResourceName ?: ""
        val inputNodePackage = inputNode.packageName ?: ""
        val app = SupportedApps.supportedApps.firstOrNull { supportedAppProperty -> supportedAppProperty.pkgName == inputNodePackage }
        app?.let {
            if (selectedApps.contains(app.pkgName) && app.inputJudger(
                    rootNode,
                    inputNode,
                    inputNodeId,
                    inputNodePackage.toString()
                )
            ) {
                return Pair(
                    app,
                    inputNode
                )
            } else{
                return Pair(null, null)
            }
        }
        if (selectedApps.contains(inputNodePackage) && inputNode.className.contains("android.widget.EditText")) {
            return Pair(
                SupportedAppProperty(
                    inputNodePackage.toString(),
                    { _, _, id, _ -> true },
                    arrayOf<String>(),
                    {
                        onScreenContentProcessor(it)
                    }), inputNode
            )

        }

    }
    return Pair(null, null)
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

fun telegramDetector(
    node: AccessibilityNodeInfo,
    tgPkgName: String = "org.telegram.messenger"
): Pair<Boolean, AccessibilityNodeInfo?> {
    val contentNodes = node.findAccessibilityNodeInfosByViewId("android:id/content")
    if (contentNodes != null && contentNodes.size == 1) {
        val contentNode = contentNodes[0]
        if (contentNode.packageName == tgPkgName) {
            val inputWidget = node.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
            if (inputWidget != null && inputWidget.packageName == tgPkgName && inputWidget.className == "android.widget.EditText") {
                // Verify the content node is above the input widget
                if (isContentNodeAboveInput(contentNode, inputWidget)) {
                    return Pair(true, inputWidget)
                }
            }
        }
    }
    return Pair(false, null)
}

fun beeperDetector(node: AccessibilityNodeInfo): Boolean {
    return isContentNodeAboveInput(
        node.findAccessibilityNodeInfosByViewId("android:id/content").firstOrNull(), node.findFocus(
            AccessibilityNodeInfo.FOCUS_INPUT
        )
    )

}

fun iterNode(node: AccessibilityNodeInfo) {
    Log.v(
        "CoWA",
        "iterNode: node=${node.className}, text=${node.text}, contentDescription=${node.contentDescription}, viewId=${node.viewIdResourceName}, rect=${
            Rect().also {
                node.getBoundsInScreen(
                    it
                )
            }
        }"
    )
    for (i in 0 until node.childCount) {
        val child = node.getChild(i)
        if (child != null) {
            iterNode(child)
        }
    }
}