/**
 * coreply
 *
 * Copyright (C) 2024 coreply
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

package app.coreply.coreplyapp.ui.viewmodel

import android.graphics.Rect
import android.graphics.RectF
import android.os.Build
import android.os.Bundle
import android.view.accessibility.AccessibilityNodeInfo
import androidx.lifecycle.ViewModel
import app.coreply.coreplyapp.applistener.AppSupportStatus
import app.coreply.coreplyapp.applistener.SupportedAppProperty
import app.coreply.coreplyapp.suggestions.SuggestionStorage
import app.coreply.coreplyapp.suggestions.TypingInfo
import app.coreply.coreplyapp.ui.OverlayContent
import app.coreply.coreplyapp.ui.OverlayContentType
import app.coreply.coreplyapp.utils.ChatContents
import app.coreply.coreplyapp.utils.ChatMessage
import app.coreply.coreplyapp.utils.SuggestionUpdateListener
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class RefreshType {
    NORMAL,
    CHAR_LOCATION,
    TEXT_SIZE
}

data class OverlayUiState(
    val inlineTextSize: Float = 48f,
    val showBubbleBackground: Boolean = false,
    val isRunning: Boolean = false,
    val content: OverlayContent = OverlayContent.Empty,
    val rect: Rect? = null,
    val chatEntryWidth: Int = 0,
    var currentInput: AccessibilityNodeInfo? = null,
    var currentMessageListNode: AccessibilityNodeInfo? = null,
    var currentApp: SupportedAppProperty? = null,
    var currentChatContents: ChatContents = ChatContents(),
    var currentStatus: AppSupportStatus = AppSupportStatus.UNKNOWN,
    var currentTyping: String = "-",
    var messageListProcessor: (AccessibilityNodeInfo) -> MutableList<ChatMessage> = { mutableListOf() },
)

class OverlayViewModel() : ViewModel(), SuggestionUpdateListener {

    private var _uiState = MutableStateFlow(OverlayUiState())
    val uiState: StateFlow<OverlayUiState> = _uiState.asStateFlow()
    private val coroutineScope = CoroutineScope(Dispatchers.IO)
    private var userInputFlow: MutableSharedFlow<TypingInfo>? = null
    private var suggestionStorage: SuggestionStorage? = null

    fun updateTextSize(textSize: Float) {
        _uiState.update { state -> state.copy(inlineTextSize = textSize) }
    }

    fun updateBackgroundVisibility(showBackground: Boolean) {
        _uiState.update { state -> state.copy(showBubbleBackground = showBackground) }
    }

    fun updateContent(
        content: OverlayContent,
    ) {
        // For errors, always show as trailing bubble
        if (content.type == OverlayContentType.ERROR) {
            _uiState.update { state ->
                state.copy(
                    content = content,
                    showBubbleBackground = false
                )
            }
            return
        }
        _uiState.update { state ->
            state.copy(
                content = content,
                showBubbleBackground = _uiState.value.currentStatus == AppSupportStatus.HINT_TEXT
            )
        }
    }

    fun updateRect(rect: Rect) {
        _uiState.update { state ->
            state.copy(
                rect = rect,
                chatEntryWidth = rect.right - rect.left
            )
        }
    }

    fun enable(
        currentApp: SupportedAppProperty,
        currentInput: AccessibilityNodeInfo,
        currentMessageListNode: AccessibilityNodeInfo,
    ) {
        _uiState.update { state ->
            state.copy(
                isRunning = true,
                currentApp = currentApp,
                currentInput = currentInput,
                currentMessageListNode = currentMessageListNode,
                messageListProcessor = currentApp.messageListProcessor
            )
        }
    }

    fun supplyExtras(
        userInputFlow: MutableSharedFlow<TypingInfo>,
        suggestionStorage: SuggestionStorage
    ) {
        this.userInputFlow = userInputFlow
        this.suggestionStorage = suggestionStorage
    }

    fun disable() {
        suggestionStorage?.clearSuggestion()
        _uiState.update { state ->
            state.copy(
                currentTyping = "-",
                isRunning = false,
                content = OverlayContent.Empty,
            )
        }
    }


    fun refresh(
        refreshType: RefreshType,
        refreshText: Boolean,
        defaultTextSizeInPx: Float = 0.0f
    ): Boolean {
        synchronized(lock = this) {
            return when (refreshType) {
                RefreshType.NORMAL -> refreshInputNode(refreshText)
                RefreshType.CHAR_LOCATION -> refreshInputNodeWithCharLocation(
                    refreshText
                )

                RefreshType.TEXT_SIZE -> {
                    refreshInputNodeWithTextSize(defaultTextSizeInPx)
                    true
                }
            }
        }

    }

    fun refreshInputNode(refreshText: Boolean = false): Boolean {
        val refreshResult = _uiState.value.currentInput?.refresh() ?: false
        if (!refreshResult) {
            reset()
        } else if (refreshText) {
            refreshText()
        }
        return refreshResult
    }

    fun refreshInputNodeWithCharLocation(refreshText: Boolean = true): Boolean {
        val rect = Rect()
        var status: AppSupportStatus
        // Use EXTRA_DATA_TEXT_CHARACTER_LOCATION_KEY to get the cursor position
        val arguments = Bundle()
        arguments.putInt(
            AccessibilityNodeInfo.EXTRA_DATA_TEXT_CHARACTER_LOCATION_ARG_START_INDEX,
            0
        )
        arguments.putInt(
            AccessibilityNodeInfo.EXTRA_DATA_TEXT_CHARACTER_LOCATION_ARG_LENGTH,
            _uiState.value.currentInput?.text?.length ?: 0
        )

        val refreshResult = _uiState.value.currentInput?.refreshWithExtraData(
            AccessibilityNodeInfo.EXTRA_DATA_TEXT_CHARACTER_LOCATION_KEY,
            arguments
        ) ?: false
        if (!refreshResult) {
            reset()
        } else {
            val rectArray: Array<RectF?>? = if (Build.VERSION.SDK_INT >= 33) {
                uiState.value.currentInput?.extras?.getParcelableArray(
                    AccessibilityNodeInfo.EXTRA_DATA_TEXT_CHARACTER_LOCATION_KEY,
                    RectF::class.java
                )
            } else {
                @Suppress("DEPRECATION")
                uiState.value.currentInput?.extras?.getParcelableArray(
                    AccessibilityNodeInfo.EXTRA_DATA_TEXT_CHARACTER_LOCATION_KEY,
                )?.mapNotNull { it as? RectF }?.toTypedArray()
            }

            uiState.value.currentInput?.getBoundsInScreen(rect)
            // For loop in reverse order to get the last cursor position
            if (rectArray != null && rectArray.any { it != null }) {
                status = AppSupportStatus.TYPING
                var rtl = false
                for (rectF in rectArray) {
                    if (rectF != null) {
                        // Check if is RTL by comparing the distance to left and right edges
                        val distanceToLeft = Math.abs(rectF.left - rect.left)
                        val distanceToRight = Math.abs(rectF.right - rect.right)
                        if (distanceToLeft > distanceToRight) {
                            rtl = true
                        }
                        break
                    }
                }
                for (i in rectArray.indices.reversed()) {
                    val rectF = rectArray[i]
                    if (rectF != null) {
                        if (rtl) {
                            // RTL, align to left edge
                            rect.right = rectF.left.toInt()
                        } else {
                            // LTR, align to right edge
                            rect.left = rectF.right.toInt()
                        }
                        rect.top = rectF.top.toInt()
                        rect.bottom = rectF.bottom.toInt()
                        break
                    }
                }
            } else {
                rect.left += (rect.width() * 0.25).toInt()
                rect.right -= (rect.width() * 0.25).toInt()
                status = AppSupportStatus.HINT_TEXT
            }
            updateStatus(status)
            updateRect(rect)
            if (refreshText) {
                refreshText()
            }
        }
        return refreshResult
    }

    fun refreshInputNodeWithTextSize(
        defaultTextSizeInPx: Float
    ) {
        if (Build.VERSION.SDK_INT >= 30) {
            val refreshResult = (_uiState.value.currentInput?.refreshWithExtraData(
                AccessibilityNodeInfo.EXTRA_DATA_RENDERING_INFO_KEY,
                Bundle()
            ) ?: false)
                    && _uiState.value.currentInput?.extraRenderingInfo != null
            if (!refreshResult) {
                reset()
            } else {
                updateTextSize(
                    _uiState.value.currentInput?.extraRenderingInfo?.textSizeInPx
                        ?: defaultTextSizeInPx
                )
            }
        } else {
            updateTextSize(defaultTextSizeInPx)
        }

    }

    // Returns true if clear current suggestions is needed
    fun refreshMessageListNode() {
        synchronized(lock = this) {
            val refreshResult = _uiState.value.currentMessageListNode?.refresh() ?: false
            if (!refreshResult) {
                reset()
            }
            _uiState.value.currentMessageListNode?.let {
                val chatMessages = _uiState.value.messageListProcessor(it)
                val clearSuggestions: Boolean = _uiState.value.currentChatContents.combineChatContents(chatMessages)
                if (clearSuggestions) {
                    suggestionStorage?.clearSuggestion()
                    if(uiState.value.currentTyping == ""){
                        onEditTextUpdate("")
                    }
                }
            }
        }
    }

    fun updateStatus(newStatus: AppSupportStatus, refreshText: Boolean = true) {
        _uiState.update { state -> state.copy(currentStatus = newStatus) }
        if (refreshText) {
            refreshText()
        }
    }

    fun refreshText() {
        var actualMessage =
            _uiState.value.currentInput?.text?.toString()?.replace("Compose Message", "") ?: ""
        if (_uiState.value.currentStatus == AppSupportStatus.HINT_TEXT || _uiState.value.currentInput?.isShowingHintText ?: true) {
            actualMessage = ""
        }
        if (actualMessage != _uiState.value.currentTyping) {
            _uiState.update { state -> state.copy(currentTyping = actualMessage) }
            onEditTextUpdate(actualMessage)

        }
    }

    fun reset() {
        _uiState.value.currentInput?.recycle()
        _uiState.value.currentMessageListNode?.recycle()
        _uiState.value.currentChatContents.clear()
        suggestionStorage?.clearSuggestion()
    }


    fun toTypingInfo(): TypingInfo {
        return TypingInfo(
            pastMessages = _uiState.value.currentChatContents,
            currentTyping = _uiState.value.currentTyping
        )
    }

    override fun onSuggestionUpdated(
    ) {
        suggestionStorage?.let {
            if (_uiState.value.isRunning) {
                val suggestionText =
                    it.getSuggestion(_uiState.value.currentTyping)
                if (suggestionText != null) {
                    updateContent(OverlayContent.Suggestion.create(suggestionText))
                }
            } else {
                it.clearSuggestion()
            }
        }

    }

    override fun onSuggestionError(
        typingInfo: TypingInfo,
        errorMessage: String
    ) {
        if (_uiState.value.isRunning) {
            updateContent(OverlayContent.Error(errorMessage))
        }
    }

    fun onEditTextUpdate(newText: String) {
        suggestionStorage?.let {
            if (it.getSuggestion(newText) != null) {
                val suggestionText = it.getSuggestion(newText)!!
                updateContent(OverlayContent.Suggestion.create(suggestionText))
            } else {
                updateContent(OverlayContent.Empty)
                coroutineScope.launch { userInputFlow?.emit(toTypingInfo()) }
            }
        }

    }
}
