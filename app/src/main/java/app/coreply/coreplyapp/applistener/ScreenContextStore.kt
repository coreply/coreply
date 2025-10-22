package app.coreply.coreplyapp.applistener

import android.util.Log
import android.view.accessibility.AccessibilityNodeInfo
import app.coreply.coreplyapp.network.TypingInfo
import app.coreply.coreplyapp.utils.ChatContents
import app.coreply.coreplyapp.utils.ChatMessage


class ScreenContextStore private constructor(
    private var _currentInput: AccessibilityNodeInfo? = null,
    private var _currentMessageListNode: AccessibilityNodeInfo? = null,
    private var _currentApp: SupportedAppProperty? = null,
    private var _currentChatContents: ChatContents = ChatContents(),
    private var _messageListProcessor: (AccessibilityNodeInfo) -> MutableList<ChatMessage> = { mutableListOf() }
) {

    companion object {
        fun create(
            currentInput: AccessibilityNodeInfo? = null,
            currentMessageListNode: AccessibilityNodeInfo? = null,
            currentApp: SupportedAppProperty? = null,
            chatContents: ChatContents = ChatContents(),
            messageListProcessor: (AccessibilityNodeInfo) -> MutableList<ChatMessage> = { mutableListOf() }
        ): ScreenContextStore {
            return ScreenContextStore(
                _currentInput = currentInput,
                _currentMessageListNode = currentMessageListNode,
                _currentApp = currentApp,
                _currentChatContents = chatContents,
                _messageListProcessor = messageListProcessor
            )
        }
    }

    val currentInput: AccessibilityNodeInfo?
        get() = _currentInput

    val currentApp: SupportedAppProperty?
        get() = _currentApp


    fun refreshInputNode(): Boolean {
        val startTime = System.currentTimeMillis()
        val refreshResult = _currentInput?.refresh() ?: false
        val endTime = System.currentTimeMillis()
        // Log the time taken to refresh the input node
        Log.d("ScreenContextStore", "Input node refresh time: ${endTime - startTime} ms")
        if (!refreshResult) {
            reset()
        }
        return refreshResult
    }

    fun refreshMessageListNode(): Boolean {
        val refreshResult = _currentMessageListNode?.refresh() ?: false
        if (!refreshResult) {
            reset()
            return false
        }
        val chatMessages = _messageListProcessor(_currentMessageListNode ?: return false)
        _currentChatContents.combineChatContents(chatMessages)
        return true
    }

    fun reset(){
        _currentInput?.recycle()
        _currentMessageListNode?.recycle()
        _currentInput = null
        _currentMessageListNode = null
        _currentApp = null
        _currentChatContents.clear()
    }


    fun toTypingInfo(): TypingInfo {
        return TypingInfo(
            pastMessages = _currentChatContents,
            currentTyping = _currentInput?.text?.toString() ?: ""
        )
    }

}