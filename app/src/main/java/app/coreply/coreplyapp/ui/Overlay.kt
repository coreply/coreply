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
import android.os.Bundle
import android.util.Log
import android.view.Gravity
import android.view.WindowManager
import android.view.accessibility.AccessibilityNodeInfo
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.ComposeView
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelStore
import androidx.lifecycle.ViewModelStoreOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.lifecycle.setViewTreeViewModelStoreOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import app.coreply.coreplyapp.applistener.AppSupportStatus
import app.coreply.coreplyapp.data.PreferencesManager
import app.coreply.coreplyapp.data.SuggestionPresentationType
import app.coreply.coreplyapp.suggestions.CallAI
import app.coreply.coreplyapp.suggestions.SuggestionStorage
import app.coreply.coreplyapp.theme.CoreplyTheme
import app.coreply.coreplyapp.ui.compose.InlineSuggestionOverlay
import app.coreply.coreplyapp.ui.compose.LifeCycleThings
import app.coreply.coreplyapp.ui.compose.TrailingSuggestionOverlay
import app.coreply.coreplyapp.ui.viewmodel.OverlayUiState
import app.coreply.coreplyapp.ui.viewmodel.OverlayViewModel
import app.coreply.coreplyapp.utils.PixelCalculator
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import kotlin.math.min

/**
 * Created on 1/16/17.
 */

class Overlay(
    context: Context,
    val windowManager: WindowManager,
) : ContextWrapper(context), ViewModelStoreOwner {

    private var pixelCalculator: PixelCalculator = PixelCalculator(this)
    private var mainParams: WindowManager.LayoutParams = WindowManager.LayoutParams()
    private var trailingParams: WindowManager.LayoutParams = WindowManager.LayoutParams()
    private var inlineComposeView: ComposeView
    private var trailingComposeView: ComposeView
    private var _viewModel: OverlayViewModel
    private var DP8 = pixelCalculator.dpToPx(8)
    private var DP48 = pixelCalculator.dpToPx(48)
    private var DP20 = pixelCalculator.dpToPx(20)

    private val dummyPaint: Paint = Paint().apply {
        isAntiAlias = true
        typeface = android.graphics.Typeface.DEFAULT
        textSize = 48f // S
    }

    override val viewModelStore = ViewModelStore()
    private val lifeCycleThings = LifeCycleThings()
    private val preferencesManager: PreferencesManager = PreferencesManager.getInstance(context)

    val viewModel: OverlayViewModel
        get() = _viewModel

    init {
        _viewModel = ViewModelProvider(this)[OverlayViewModel::class.java]
        MainScope().launch {
            preferencesManager.loadPreferences()
            _viewModel.uiState.collect { uiState ->
                updateFromState(uiState)
            }
        }
        val suggestionStorage = SuggestionStorage(_viewModel)
        val ai = CallAI(suggestionStorage, preferencesManager)
        _viewModel.supplyExtras(ai.userInputFlow, suggestionStorage)


        // Create ComposeViews with click handlers pointing to Overlay methods
        inlineComposeView = ComposeView(this).apply {
            setViewTreeLifecycleOwner(lifeCycleThings)
            setViewTreeSavedStateRegistryOwner(lifeCycleThings)
            setViewTreeViewModelStoreOwner(this@Overlay)
            setContent {
                CoreplyTheme {
                    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
                    if (getInlineText().isNotBlank()) {
                        InlineSuggestionOverlay(
                            text = uiState.content.fullText.trimEnd(),
                            textSize = pixelCalculator.pxToSp(uiState.inlineTextSize),
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
                    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
                    if (getBubbleText().isNotBlank()) {
                        TrailingSuggestionOverlay(
                            text = uiState.content.fullText.trimEnd(),
                            onClick = { onTrailingClick() },
                            onLongClick = { onTrailingLongClick() },
                            isError = uiState.content.type == OverlayContentType.ERROR
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
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            mainParams.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
        } else if (android.os.Build.VERSION.SDK_INT >= 28) {
            mainParams.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }

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
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            trailingParams.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
        } else if (android.os.Build.VERSION.SDK_INT >= 28) {
            trailingParams.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }
    }

    // Update reactive state method to use shared state directly
    fun updateFromState(state: OverlayUiState) {
        if (state.isRunning) {
            update()
        } else {
            removeOverlays()
        }
    }

    // Text action methods now use shared state and pre-tokenized content
    fun onInlineClick() {
        val uiState = viewModel.uiState.value
        performTextAction(uiState.content)
    }

    fun onInlineLongClick() {
        val uiState = viewModel.uiState.value
        performFullTextAction(uiState.content)
    }

    fun onTrailingClick() {
        val uiState = viewModel.uiState.value
        performTextAction(uiState.content)
    }

    fun onTrailingLongClick() {
        val uiState = viewModel.uiState.value
        performFullTextAction(uiState.content)
    }

    private fun performTextAction(content: OverlayContent) {
        val arguments = Bundle()
        val addText = content.getFirstToken()

        val currentState = viewModel.uiState.value
        if (currentState.currentInput?.isShowingHintText == true || currentState.currentStatus == AppSupportStatus.HINT_TEXT) {
            arguments.putCharSequence(
                AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                addText
            )
        } else {
            Log.v("CoWA", "Performing text action with addText: ${currentState.currentInput?.text}")
            arguments.putCharSequence(
                AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                currentState.currentTyping.replace("Compose Message", "") + addText
            )
        }
        currentState.currentInput?.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)
    }

    private fun performFullTextAction(content: OverlayContent) {
        val arguments = Bundle()
        val currentState = viewModel.uiState.value
        if (currentState.currentInput?.isShowingHintText == true || currentState.currentStatus == AppSupportStatus.HINT_TEXT) {
            arguments.putCharSequence(
                AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                content.fullText.trimEnd()
            )
        } else {
            arguments.putCharSequence(
                AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                currentState.currentTyping.replace(
                    "Compose Message",
                    ""
                ) + content.fullText.trimEnd()
            )
        }
        currentState.currentInput?.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)
    }

    fun getInlineText(): String {
        val content = viewModel.uiState.value.content
        return if (preferencesManager.suggestionPresentationTypeState.value == SuggestionPresentationType.BUBBLE || content.type == OverlayContentType.ERROR) ""
        else content.fullText.trimEnd()
    }

    fun getBubbleText(): String {
        val content = viewModel.uiState.value.content
        dummyPaint.textSize = viewModel.uiState.value.inlineTextSize
        val textWidth = dummyPaint.measureText(content.fullText.trimEnd())
        return when {
            preferencesManager.suggestionPresentationTypeState.value == SuggestionPresentationType.INLINE -> ""
            preferencesManager.suggestionPresentationTypeState.value == SuggestionPresentationType.BUBBLE -> content.fullText.trimEnd()
            textWidth > viewModel.uiState.value.chatEntryWidth -> content.fullText.trimEnd()
            else -> ""
        }
    }


    fun update() {
        val uiState = viewModel.uiState.value
        if (uiState.isRunning) {
            uiState.rect?.let { chatEntryRect ->
                // Update positioning
                //Log.v("CoWA", "Overlay update: mainParams.y=${mainParams.y}")
                mainParams.y = chatEntryRect.top
                mainParams.height = chatEntryRect.bottom - chatEntryRect.top

                // Update background and positioning based on status
                val showBubbleBackground = uiState.showBubbleBackground
                viewModel.updateBackgroundVisibility(showBubbleBackground)

                val inlineText = getInlineText()
                val bubbleText = getBubbleText()
                val inlineTextWidth = dummyPaint.measureText(inlineText).toInt()
                val trailingTextWidth = dummyPaint.measureText(bubbleText).toInt()

                if (showBubbleBackground) {
                    mainParams.width =
                        min(inlineTextWidth + DP8 * 3, uiState.chatEntryWidth + DP8 * 2)
                    mainParams.x = chatEntryRect.right - mainParams.width
                } else {
                    mainParams.width = min(inlineTextWidth + DP8, uiState.chatEntryWidth)
                    mainParams.x = chatEntryRect.left

                }

                trailingParams.y = chatEntryRect.bottom

                // Show/hide overlays based on content and preferences
                if (inlineText.isBlank()) {
                    removeInlineOverlay()
                } else {
                    showInlineOverlay()
                }

                if (bubbleText.isBlank()) {
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
    }

    fun removeOverlays() {
        removeInlineOverlay()
        removeTrailingOverlay()
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
