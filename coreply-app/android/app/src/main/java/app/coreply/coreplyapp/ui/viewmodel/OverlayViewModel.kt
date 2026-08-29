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

import android.accessibilityservice.InputMethod
import android.graphics.Rect
import android.graphics.RectF
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.accessibility.AccessibilityNodeInfo
import androidx.lifecycle.ViewModel
import app.coreply.coreplyapp.applistener.AppSupportStatus
import app.coreply.coreplyapp.ui.OverlayContent
import app.coreply.coreplyapp.ui.OverlayContentType
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlin.math.abs
import kotlin.math.max

data class OverlayUiState(
    val inlineTextSize: Float = 48f,
    val showBubbleBackground: Boolean = false,
    val isRunning: Boolean = false,
    val content: OverlayContent = OverlayContent.Empty,
    val rect: Rect? = null,
    val chatEntryWidth: Int = 0,
    val currentInput: AccessibilityNodeInfo? = null,
    val currentStatus: AppSupportStatus = AppSupportStatus.UNKNOWN,
    val currentTyping: String? = null,
    val currentInputMethod: InputMethod? = null,
)

class OverlayViewModel : ViewModel() {
    private var _uiState = MutableStateFlow(OverlayUiState())
    val uiState: StateFlow<OverlayUiState> = _uiState.asStateFlow()
    var onTypingUpdated: (() -> Unit)? = null

    fun updateContent(content: OverlayContent) {
        if (content.type == OverlayContentType.ERROR) {
            _uiState.update { state ->
                state.copy(
                    content = content,
                    showBubbleBackground = false,
                )
            }
            return
        }

        _uiState.update { state ->
            state.copy(
                content = content,
                showBubbleBackground = _uiState.value.currentStatus == AppSupportStatus.HINT_TEXT,
            )
        }
    }

    fun clearSuggestion() {
        updateContent(OverlayContent.Empty)
    }

    fun updateSuggestion(suggestion: String) {
        if (_uiState.value.isRunning) {
            updateContent(OverlayContent.Suggestion.create(suggestion))
        }
    }

    fun updateSuggestionError(errorMessage: String) {
        if (_uiState.value.isRunning) {
            updateContent(OverlayContent.Error(errorMessage))
        }
    }

    fun disable() {
        _uiState.value.currentInput?.recycle()
        _uiState.update { state ->
            state.copy(
                currentInput = null,
                currentInputMethod = null,
                currentTyping = null,
                currentStatus = AppSupportStatus.UNKNOWN,
                isRunning = false,
                content = OverlayContent.Empty,
            )
        }
    }

    fun refresh(
        root: AccessibilityNodeInfo?,
        defaultTextSizeInPx: Float,
        inputMethod: InputMethod?,
    ): Boolean {
        synchronized(this) {
            return try {
                val prevTyping = _uiState.value.currentTyping
                var input = _uiState.value.currentInput
                var textSize = _uiState.value.inlineTextSize
                var isNewInput = false

                // Step 1: Try existing node via char-location extra data
                var charResult: Pair<Rect, AppSupportStatus>? = null
                if (input != null && input.refresh() && input.isFocused) {
                    charResult = fetchCharLocation(input)
                    if (charResult == null) {
                        input.recycle()
                        input = null
                    } else if (isTelegramOrPerplexityNonEditText(input)) {
                        input.recycle()
                        input = null
                        charResult = null
                    }
                } else if (input != null) {
                    input.recycle()
                    input = null
                }

                // Step 2: Find new node if needed
                if (input == null) {
                    input = root?.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
                    if (input == null) {
                        disable()
                        return false
                    }
                    isNewInput = true
                    textSize = fetchTextSize(input, defaultTextSizeInPx)
                    charResult = fetchCharLocation(input)
                }

                // Step 3: Compute everything into locals
                val (rect, status) = charResult ?: run {
                    val bounds = Rect()
                    input.getBoundsInScreen(bounds)
                    bounds.left += (bounds.width() * 0.25).toInt()
                    bounds.right -= (bounds.width() * 0.25).toInt()
                    Pair(bounds, AppSupportStatus.HINT_TEXT)
                }

                val adjustedRect = adjustRectForApp(input, rect)
                val typing = extractTyping(input, status)
                val showBubble = status == AppSupportStatus.HINT_TEXT

                // Step 4: ONE state update
                _uiState.update { state ->
                    state.copy(
                        currentInput = input,
                        isRunning = true,
                        currentInputMethod = inputMethod,
                        inlineTextSize = textSize,
                        rect = adjustedRect,
                        chatEntryWidth = adjustedRect.right - adjustedRect.left,
                        currentStatus = status,
                        currentTyping = typing,
                        showBubbleBackground = showBubble,
                    )
                }

                // Step 5: Side effects outside state update
                if (typing != prevTyping) {
                    onTypingUpdated?.invoke()
                }

                Log.v(
                    "CoWA",
                    "refresh: isNewInput=$isNewInput, status=$status, typing='$typing', rect=$adjustedRect, textSize=$textSize, input=${describeCurrentInput()}"
                )

                return true
            } catch (e: IllegalStateException) {
                e.printStackTrace()
                disable()
                return false
            }
        }
    }

    private fun fetchTextSize(input: AccessibilityNodeInfo, fallback: Float): Float {
        if (Build.VERSION.SDK_INT < 30) return fallback
        val refreshResult = input.refreshWithExtraData(
            AccessibilityNodeInfo.EXTRA_DATA_RENDERING_INFO_KEY,
            Bundle(),
        )
        if (!refreshResult || input.extraRenderingInfo == null) return fallback
        return input.extraRenderingInfo!!.textSizeInPx
    }

    private fun fetchCharLocation(input: AccessibilityNodeInfo): Pair<Rect, AppSupportStatus>? {
        val rect = Rect()
        val textLength = input.text?.length ?: 0
        val arguments = Bundle().apply {
            putInt(AccessibilityNodeInfo.EXTRA_DATA_TEXT_CHARACTER_LOCATION_ARG_START_INDEX, 0)
            putInt(AccessibilityNodeInfo.EXTRA_DATA_TEXT_CHARACTER_LOCATION_ARG_LENGTH, textLength)
        }
        val refreshResult = input.refreshWithExtraData(
            AccessibilityNodeInfo.EXTRA_DATA_TEXT_CHARACTER_LOCATION_KEY,
            arguments,
        )
        if (!refreshResult) return null

        val rectArray: Array<RectF?>? = if (Build.VERSION.SDK_INT >= 33) {
            input.extras?.getParcelableArray(
                AccessibilityNodeInfo.EXTRA_DATA_TEXT_CHARACTER_LOCATION_KEY,
                RectF::class.java,
            )
        } else {
            @Suppress("DEPRECATION")
            input.extras?.getParcelableArray(
                AccessibilityNodeInfo.EXTRA_DATA_TEXT_CHARACTER_LOCATION_KEY,
            )?.mapNotNull { it as? RectF }?.toTypedArray()
        }

        input.getBoundsInScreen(rect)

        if (rectArray != null && rectArray.any { it != null }) {
            var rtl = false
            for (rectF in rectArray) {
                if (rectF != null) {
                    val distanceToLeft = abs(rectF.left - rect.left)
                    val distanceToRight = abs(rectF.right - rect.right)
                    if (distanceToLeft > distanceToRight) {
                        rtl = true
                    }
                    break
                }
            }
            for (index in rectArray.indices.reversed()) {
                val rectF = rectArray[index]
                if (rectF != null) {
                    if (rtl) {
                        rect.right = rectF.left.toInt()
                    } else {
                        rect.left = rectF.right.toInt()
                    }
                    rect.top = rectF.top.toInt()
                    rect.bottom = rectF.bottom.toInt()
                    break
                }
            }
            return Pair(rect, AppSupportStatus.TYPING)
        } else {
            rect.left += (rect.width() * 0.25).toInt()
            rect.right -= (rect.width() * 0.25).toInt()
            return Pair(rect, AppSupportStatus.HINT_TEXT)
        }
    }

    private fun adjustRectForApp(input: AccessibilityNodeInfo, rect: Rect): Rect {
        if (input.packageName != "com.openai.chatgpt") return rect
        if (input.text?.isNotEmpty() != true) {
            rect.right -= (rect.width() * 0.25).toInt()
            return rect
        }
        val child = input.getChild(0)
        val childRect = Rect()
        val inputRect = Rect()
        child?.getBoundsInScreen(childRect)
        input.getBoundsInScreen(inputRect)
        val offsetX = childRect.left - inputRect.left
        rect.left += offsetX
        rect.right = max(rect.right - offsetX * 3, rect.left + 1)
        return rect
    }

    private fun extractTyping(input: AccessibilityNodeInfo, status: AppSupportStatus): String {
        if (status == AppSupportStatus.HINT_TEXT || input.isShowingHintText == true) {
            return ""
        }
        return input.text?.toString()?.replace("Compose Message", "") ?: ""
    }

    private fun isTelegramOrPerplexityNonEditText(input: AccessibilityNodeInfo): Boolean {
        val pkg = input.packageName ?: return false
        val cls = input.className ?: return false
        return (pkg.contains("telegram") || pkg.contains("perplexity")) &&
                !cls.contains("EditText")
    }

    private fun describeCurrentInput(): String {
        val input = _uiState.value.currentInput ?: return "null"
        return "pkg=${input.packageName}, class=${input.className}, viewId=${input.viewIdResourceName}, text=${input.text}, focused=${input.isFocused}, editable=${input.isEditable}, showingHint=${input.isShowingHintText}"
    }
}
