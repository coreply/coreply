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

package app.coreply.coreplyapp.ui

import android.content.Context
import android.content.ContextWrapper
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.Rect
import android.util.Log
import android.view.Gravity
import android.view.WindowManager
import android.view.accessibility.AccessibilityNodeInfo
import android.os.Bundle
import android.icu.text.BreakIterator
import androidx.compose.ui.platform.ComposeView
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelStore
import androidx.lifecycle.ViewModelStoreOwner
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.lifecycle.setViewTreeViewModelStoreOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import app.coreply.coreplyapp.applistener.AppSupportStatus
import app.coreply.coreplyapp.theme.CoreplyTheme
import app.coreply.coreplyapp.ui.compose.InlineSuggestionOverlay
import app.coreply.coreplyapp.ui.compose.LifeCycleThings
import app.coreply.coreplyapp.ui.compose.TrailingSuggestionOverlay
import app.coreply.coreplyapp.ui.viewmodel.OverlayViewModel
import app.coreply.coreplyapp.utils.PixelCalculator
import kotlin.math.min
import java.util.Locale

/**
 * Created on 1/16/17.
 */

data class SuggestionParts(val inline: String?, val trailing: String?)

class Overlay(
    context: Context?,
    val windowManager: WindowManager,
    private val overlayState: OverlayState
) : ContextWrapper(context), ViewModelStoreOwner {

    private var pixelCalculator: PixelCalculator
    private var mainParams: WindowManager.LayoutParams
    private var trailingParams: WindowManager.LayoutParams
    private var chatEntryRect: Rect = Rect()
    private var inlineComposeView: ComposeView
    private var trailingComposeView: ComposeView
    private var viewModel: OverlayViewModel
    private var STATUSBAR_HEIGHT = 0
    private var DP8 = 0
    private var DP48 = 0
    private var DP20 = 0

    private val dummyPaint: Paint = Paint().apply {
        isAntiAlias = true
        typeface = android.graphics.Typeface.DEFAULT
        textSize = 48f // S
    }

    override val viewModelStore = ViewModelStore()
    private val lifeCycleThings = LifeCycleThings()

    init {
        pixelCalculator = PixelCalculator(this)
        mainParams = WindowManager.LayoutParams()
        trailingParams = WindowManager.LayoutParams()
        DP8 = pixelCalculator.dpToPx(8)
        DP48 = pixelCalculator.dpToPx(48)
        DP20 = pixelCalculator.dpToPx(20)

        // Initialize ViewModel
        viewModel = ViewModelProvider(this)[OverlayViewModel::class.java]

        // Create ComposeViews with click handlers pointing to Overlay methods
        inlineComposeView = ComposeView(this).apply {
            setViewTreeLifecycleOwner(lifeCycleThings)
            setViewTreeSavedStateRegistryOwner(lifeCycleThings)
            setViewTreeViewModelStoreOwner(this@Overlay)
            setContent {
                CoreplyTheme {
                    val uiState = viewModel.uiState
                    if (uiState.inlineText.isNotBlank()) {
                        InlineSuggestionOverlay(
                            text = uiState.inlineText,
                            textSize = uiState.inlineTextSize,
                            showBackground = uiState.showBubbleBackground,
                            onClick = { onInlineClick() },
                            onLongClick = { onInlineLongClick() }
                        )
                    }
                }
            }
        }

        trailingComposeView = ComposeView(this).apply {
            setViewTreeLifecycleOwner(lifeCycleThings)
            setViewTreeSavedStateRegistryOwner(lifeCycleThings)
            setViewTreeViewModelStoreOwner(this@Overlay)
            setContent {
                CoreplyTheme {
                    val uiState = viewModel.uiState
                    if (uiState.trailingText.isNotBlank()) {
                        TrailingSuggestionOverlay(
                            text = uiState.trailingText,
                            onClick = { onTrailingClick() },
                            onLongClick = { onTrailingLongClick() }
                        )
                    }
                }
            }
        }

        // Configure window parameters for inline overlay
        mainParams.type = WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
        mainParams.flags =
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
        mainParams.format = PixelFormat.TRANSLUCENT
        mainParams.gravity = Gravity.TOP or Gravity.START
        mainParams.height = DP48
        mainParams.alpha = 1.0f
        mainParams.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS

        // Credit: https://stackoverflow.com/questions/39671343/how-to-move-a-view-via-windowmanager-updateviewlayout-without-any-animation
        val className = "android.view.WindowManager\$LayoutParams"
        try {
            val layoutParamsClass = Class.forName(className)
            val privateFlags = layoutParamsClass.getField("privateFlags")
            val noAnim = layoutParamsClass.getField("PRIVATE_FLAG_NO_MOVE_ANIMATION")

            var privateFlagsValue = privateFlags.getInt(mainParams)
            val noAnimFlag = noAnim.getInt(mainParams)
            privateFlagsValue = privateFlagsValue or noAnimFlag
            privateFlags.setInt(mainParams, privateFlagsValue)
        } catch (e: Exception) {
            Log.e("EXCEPT", "EXCEPTION: ${e.localizedMessage}")
        }

        // Configure window parameters for trailing overlay
        trailingParams.type = WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
        trailingParams.flags =
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
        trailingParams.format = PixelFormat.TRANSLUCENT
        trailingParams.gravity = Gravity.TOP or Gravity.START
        trailingParams.height = DP20
        trailingParams.alpha = 1.0f
        trailingParams.x = DP8
        trailingParams.layoutInDisplayCutoutMode =WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
    }

    // Update reactive state method to use shared state directly
    fun updateFromState(state: OverlayStateData) {
        if (state.isEnabled && state.running) {
            enable()
            state.rect?.let { setRect(it) }
            state.textSize?.let { updateTextSize(it) }
            updateSuggestion(state.suggestion)
        } else {
            disable()
        }
    }

    // Text action methods now use shared state
    fun onInlineClick() {
        val uiState = viewModel.uiState
        performTextAction(uiState.inlineText)
    }

    fun onInlineLongClick() {
        val uiState = viewModel.uiState
        performFullTextAction(uiState.inlineText)
    }

    fun onTrailingClick() {
        val uiState = viewModel.uiState
        performTextAction(uiState.trailingText)
    }

    fun onTrailingLongClick() {
        val uiState = viewModel.uiState
        performFullTextAction(uiState.trailingText)
    }

    private fun tokenizeText(input: String): List<String> {
        val PUNCTUATIONS = listOf(
            "!", "\"", ")", ",", ".", ":",
            ";", "?", "]", "~", "，", "：", "；", "？", "）", "】", "！", "、", "」",
        )
        val breakIterator = BreakIterator.getWordInstance(Locale.ROOT)
        breakIterator.setText(input)
        val tokens = mutableListOf<String>()
        var start = breakIterator.first()
        var end = breakIterator.next()
        while (end != BreakIterator.DONE) {
            val word = input.substring(start, end)
            if (word.isNotEmpty()) {
                tokens.add(word)
            }
            start = end
            end = breakIterator.next()
        }
        if (tokens.isNotEmpty()) {
            val lastToken = tokens.last()
            if (tokens.size >= 2 && lastToken.length == 1 && PUNCTUATIONS.contains(lastToken)) {
                tokens.removeAt(tokens.size - 1)
                tokens[tokens.size - 1] = tokens[tokens.size - 1] + lastToken
            }
        }
        return tokens
    }

    private fun performTextAction(text: String) {
        val arguments = Bundle()
        val tokenizedString = tokenizeText(text.trimEnd())
        var addText: String = if (tokenizedString.isNotEmpty()) tokenizedString[0] else ""
        if (addText.isBlank() && tokenizedString.size > 1) {
            addText += tokenizedString[1]
        }

        val currentState = overlayState.getCurrentState()
        if (currentState.node?.isShowingHintText == true || currentState.status == AppSupportStatus.HINT_TEXT) {
            arguments.putCharSequence(
                AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                addText
            )
        } else {
            Log.v("CoWA", "Performing text action with addText: ${currentState.node?.text}")
            arguments.putCharSequence(
                AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                currentState.nodeText.replace("Compose Message", "") + addText
            )
        }
        currentState.node?.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)
    }

    private fun performFullTextAction(text: String) {
        val arguments = Bundle()
        val currentState = overlayState.getCurrentState()
        if (currentState.node?.isShowingHintText == true || currentState.status == AppSupportStatus.HINT_TEXT) {
            arguments.putCharSequence(
                AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                text.trimEnd()
            )
        } else {
            arguments.putCharSequence(
                AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                currentState.nodeText.replace("Compose Message", "") + text.trimEnd()
            )
        }
        currentState.node?.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)
    }

    fun setRect(chatEntry: Rect) {
        this.chatEntryRect = chatEntry
    }

    fun setRect(top: Int, bottom: Int, left: Int, right: Int) {
        if (top != -1) chatEntryRect.top = top
        if (bottom != -1) chatEntryRect.bottom = bottom
        if (left != -1) chatEntryRect.left = left
        if (right != -1) chatEntryRect.right = right
    }

    fun update() {
        val currentState = overlayState.getCurrentState()
        if (currentState.running) {
            val uiState = viewModel.uiState

            // Update positioning
            //Log.v("CoWA", "Overlay update: mainParams.y=${mainParams.y}")
            mainParams.y = chatEntryRect.top
            mainParams.height = chatEntryRect.bottom - chatEntryRect.top

            // Update background and positioning based on status
            val showBubbleBackground = uiState.showBubbleBackground
            viewModel.updateBackgroundVisibility(showBubbleBackground)
            val inlineTextWidth = dummyPaint.measureText(uiState.inlineText).toInt()
            val trailingTextWidth = dummyPaint.measureText(uiState.trailingText).toInt()

            if (showBubbleBackground) {
                mainParams.width =
                    min(inlineTextWidth + DP8 * 3, currentState.chatEntryWidth + DP8 * 2)
                mainParams.x = chatEntryRect.right - mainParams.width
            } else {
                mainParams.width = min(inlineTextWidth + DP8, currentState.chatEntryWidth)
                mainParams.x = chatEntryRect.left

            }

            trailingParams.y = chatEntryRect.bottom

            // Show/hide overlays based on content
            if (uiState.inlineText.isBlank()) {
                removeInlineOverlay()
            } else {
                showInlineOverlay()
            }

            if (uiState.trailingText.isBlank()) {
                removeTrailingOverlay()
            } else {
                trailingParams.width = trailingTextWidth + DP20 + DP8
                showTrailingOverlay()
            }

            // Update view layouts if shown
            if (inlineComposeView.isShown) {
                windowManager.updateViewLayout(inlineComposeView, mainParams)
            }
            if (trailingComposeView.isShown) {
                windowManager.updateViewLayout(trailingComposeView, trailingParams)
            }
            Log.v("CoWA", "Overlay updated: y=${chatEntryRect.bottom},")
        }
    }

    fun updateSuggestion(suggestion: String?) {
        MainScope().launch {
            withContext(Dispatchers.Main) {
                val currentState = overlayState.getCurrentState()
                val textWidth = dummyPaint.measureText(suggestion ?: "")
                viewModel.updateSuggestion(
                    suggestion,
                    textWidth,
                    currentState.chatEntryWidth,
                    currentState.status
                )
                lifeCycleThings.refreshLifecycle()
                update()
            }
        }
    }

    fun updateTextSize(textSize: Float?) {
        if (textSize == null || textSize <= 0) return
        dummyPaint.textSize = textSize
        viewModel.updateTextSize(pixelCalculator.pxToSp(textSize))
        lifeCycleThings.refreshLifecycle()
    }

    fun disable() {
        viewModel.disable()
        removeInlineOverlay()
        removeTrailingOverlay()
    }

    fun enable() {
        viewModel.enable()
    }

    fun removeInlineOverlay() {
        if (inlineComposeView.isShown) {
            windowManager.removeView(inlineComposeView)
        }
    }

    fun removeTrailingOverlay() {
        if (trailingComposeView.isShown) {
            windowManager.removeView(trailingComposeView)
        }
    }

    fun showOverlays() {
        showInlineOverlay()
        showTrailingOverlay()
    }

    fun showInlineOverlay() {
        if (!inlineComposeView.isShown) {
            windowManager.addView(inlineComposeView, mainParams)
        }
    }

    fun showTrailingOverlay() {
        if (!trailingComposeView.isShown) {
            windowManager.addView(trailingComposeView, trailingParams)
        }
    }
}
