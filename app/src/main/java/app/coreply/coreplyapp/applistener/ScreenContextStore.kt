package app.coreply.coreplyapp.applistener

import android.view.accessibility.AccessibilityNodeInfo



class ScreenContextStore {
    private var currentInputNode: AccessibilityNodeInfo? = null
    private var currentMessageListNode: AccessibilityNodeInfo? = null
    private var currentMessageNodes: List<AccessibilityNodeInfo> = emptyList()
}