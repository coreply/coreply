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

package app.coreply.coreplyapp.applistener

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.graphics.Rect
import android.graphics.RectF
import android.os.Bundle
import android.util.Log
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Toast
import app.coreply.coreplyapp.R
import app.coreply.coreplyapp.network.CallAI
import app.coreply.coreplyapp.network.SuggestionStorageClass
import app.coreply.coreplyapp.network.TypingInfo
import app.coreply.coreplyapp.ui.Overlay
import app.coreply.coreplyapp.ui.OverlayState
import app.coreply.coreplyapp.utils.ChatContents
import app.coreply.coreplyapp.utils.PixelCalculator
import app.coreply.coreplyapp.utils.SuggestionUpdateListener
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Created on 10/13/16.
 */
@OptIn(kotlinx.coroutines.FlowPreview::class)
open class AppListener : AccessibilityService(), SuggestionUpdateListener {
    private var overlay: Overlay? = null
    private var overlayState: OverlayState? = null
    private var pixelCalculator: PixelCalculator? = null
    private var currentApp: SupportedAppProperty? = null
    private var currentExcludeList = arrayOf<String>()
    private var running = false
    private var currentText: String? = null
    private val conversationList = ChatContents()
    open val ai by lazy { CallAI(SuggestionStorageClass(this), this) }

    // Coroutine scope for background operations
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    // Flow channels for throttling heavy operations
    private val measureWindowFlow = MutableSharedFlow<AccessibilityNodeInfo>(
        replay = 0,
        extraBufferCapacity = 1,
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )

    private val getMessagesFlow = MutableSharedFlow<AccessibilityNodeInfo>(
        replay = 0,
        extraBufferCapacity = 1,
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )

    // Results storage for latest operations
    private var latestMeasureWindowResult: AppSupportStatus = AppSupportStatus.SUPPORTED_UNKOWN
    private var latestGetMessagesResult: Boolean = false

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        Log.v("CoWA", "event triggered")
        if (event != null && event.getPackageName() != null) {
            if (event.packageName.startsWith("app.coreply")) return
            Log.v("CoWA", event.getPackageName().toString())
        }
        if (event != null && event.getClassName() != null) {
            Log.v("CoWA", event.getClassName().toString())
        }
        if (event == null || event.getPackageName() == null || event.getClassName() == null) {
            Log.v("CoWA", "Either event or package name or class name is null")
            return
        }
        val root1 = rootInActiveWindow
        if (root1 == null) {
            Log.v("CoWA", "root is null")
        } else {
            refreshOverlay(event, root1)
        }
    }


    override fun onInterrupt() {
        overlay!!.disable()
    }

    // Updated methods to emit state instead of direct calls
    private fun measureWindow(node: AccessibilityNodeInfo): AppSupportStatus {
        val rect = Rect()
        var status: AppSupportStatus = AppSupportStatus.SUPPORTED_UNKOWN
        node.getBoundsInScreen(rect)

        // Use EXTRA_DATA_TEXT_CHARACTER_LOCATION_KEY to get the cursor position
        val arguments = Bundle()
        arguments.putInt(
            AccessibilityNodeInfo.EXTRA_DATA_TEXT_CHARACTER_LOCATION_ARG_START_INDEX,
            0
        )
        arguments.putInt(
            AccessibilityNodeInfo.EXTRA_DATA_TEXT_CHARACTER_LOCATION_ARG_LENGTH,
            node.text?.length ?: 0
        )

        if (node.refreshWithExtraData(
                AccessibilityNodeInfo.EXTRA_DATA_TEXT_CHARACTER_LOCATION_KEY,
                arguments
            )
        ) {
            if (android.os.Build.VERSION.SDK_INT >= 33) {
                val rectArray: Array<RectF?>? = node.extras.getParcelableArray(
                    AccessibilityNodeInfo.EXTRA_DATA_TEXT_CHARACTER_LOCATION_KEY,
                    RectF::class.java
                )
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
                    rect.left += (rect.width() * 0.5).toInt()
                    status = AppSupportStatus.HINT_TEXT
                }
            } else {
                status = AppSupportStatus.API_BELOW_33
            }
        } else {
            Log.v("CoWA", "Failed to refresh cursor position")
        }

        // Update state instead of direct overlay calls
        overlayState?.updateRect(rect)
        overlayState?.updateNode(node, status)

        if (node.refreshWithExtraData(
                AccessibilityNodeInfo.EXTRA_DATA_RENDERING_INFO_KEY,
                arguments
            )
        ) {
            overlayState?.updateTextSize(node.extraRenderingInfo?.textSizeInPx ?: 18f)
        }

        return status
    }

    private fun onEditTextUpdate(node: AccessibilityNodeInfo, status: AppSupportStatus) {
        var actualMessage = node.text?.toString()?.replace("Compose Message", "") ?: ""
        if (status == AppSupportStatus.HINT_TEXT || node.isShowingHintText) {
            actualMessage = ""
        }

        if (actualMessage == currentText) {
            return
        }
        currentText = actualMessage

        // Update state instead of direct overlay calls
        overlayState?.updateNode(node, status)

        if (ai.suggestionStorage.getSuggestion(actualMessage) != null) {
            overlayState?.updateSuggestion(ai.suggestionStorage.getSuggestion(actualMessage))
        } else {
            overlayState?.updateSuggestion("")
            ai.onUserInputChanged(TypingInfo(conversationList, actualMessage))
        }
    }

    private fun refreshOverlay(event: AccessibilityEvent, root: AccessibilityNodeInfo): Boolean {
        var isSupportedApp = false
        val (supportedAppProperty, inputWidget) = detectSupportedApp(root)
        if (supportedAppProperty != null && inputWidget != null) {
//            var (detected: Boolean, inputWidget: AccessibilityNodeInfo?) =
//                supportedAppProperty.triggerDetector(root, event)
//            if (inputWidget == null) {
////                Log.v("CoWA", "Input widget is null for ${supportedAppProperty.pkgName}")
//                inputWidget = supportedAppProperty.textInputFinder?.invoke(root)
////                Log.v("CoWA", "Input widget found: $inputWidget, detected: $detected")
//            }
            if (true) {//(detected && inputWidget != null) { // Only one trigger widget is supported
                isSupportedApp = true
                val info = this.serviceInfo
                info.notificationTimeout = 0
                info.eventTypes =
                    AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or AccessibilityEvent.TYPE_VIEW_CLICKED or AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED or AccessibilityEvent.TYPE_VIEW_FOCUSED or AccessibilityEvent.TYPE_VIEW_SCROLLED
                this.serviceInfo = info
                currentApp = supportedAppProperty
                currentExcludeList = supportedAppProperty.excludeWidgets
                running = true

                // Update state instead of direct overlay calls
                overlayState?.updateEnabled(true)
                overlayState?.updateRunning(true)
                overlayState?.updateCurrentApp(supportedAppProperty)

                // Use throttled version to offload heavy operations
                measureWindowThrottled(inputWidget)
                getMessagesThrottled(root)
                //onEditTextUpdate(inputWidget, status)
//                var actualMessage =
//                    inputWidget.text?.toString()?.replace("Compose Message", "") ?: ""
//                if (actualMessage == "Message") {
//                    actualMessage = ""
//                }
//                if (actualMessage != currentText) {
//                    // Use throttled version to offload heavy operations
//                    getMessagesThrottled(root)
//                    onEditTextUpdate(inputWidget, status)
//                }                 //break
            }
        }
        if (!isSupportedApp) {
            if (running) {
                val info = this.serviceInfo
                info.notificationTimeout = 2000
                info.eventTypes =
                    AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or AccessibilityEvent.TYPE_VIEW_CLICKED or AccessibilityEvent.TYPE_VIEW_FOCUSED
                this.serviceInfo = info

                // Update state instead of direct overlay calls
                overlayState?.disable()
                autoDetect = false
                running = false
                ai.suggestionStorage.clearSuggestion()
                conversationList.clear()
                currentText = null
            }
        }
        return isSupportedApp
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        val info = this.serviceInfo
        info.eventTypes =
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or AccessibilityEvent.TYPE_VIEW_CLICKED or AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED or AccessibilityEvent.TYPE_VIEW_FOCUSED or AccessibilityEvent.TYPE_VIEW_SCROLLED
        info.flags =
            AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
        this.serviceInfo = info
        Toast.makeText(applicationContext, getString(R.string.app_accessibility_started), Toast.LENGTH_SHORT)
            .show()
        val appContext = applicationContext

        // Initialize state management
        overlayState = OverlayState()

        if (overlay == null) {
            overlay = Overlay(
                appContext,
                getSystemService(WINDOW_SERVICE) as WindowManager,
                overlayState!!
            )
            overlay!!.disable()
        } else {
            overlay!!.disable()
        }
        pixelCalculator = PixelCalculator(appContext)

        // Set up reactive state observation
        setupStateObservation()

        // Initialize throttled flows for heavy operations
        initializeThrottledFlows()
    }

    /**
     * Set up observation of state changes to update overlay reactively
     */
    private fun setupStateObservation() {
        serviceScope.launch {
            overlayState?.state?.collectLatest { state ->
                try {
                    //Log.v("CoWA", "Overlay state updated: $state")
                    withContext(Dispatchers.Main) {
                        overlay?.updateFromState(state)
                    }
                } catch (e: Exception) {
                    Log.e("CoWA", "Error updating overlay from state", e)
                }
            }
        }
    }

    /**
     * Initialize throttled flows for heavy operations with proper debouncing
     * Ensures the latest event is always processed while throttling intermediate events
     */
    private fun initializeThrottledFlows() {
        serviceScope.launch {
            measureWindowFlow
                .collect { node ->
                    try {
                        val result = measureWindowInternal(node)
                        // Switch back to main thread for UI updates
                        withContext(Dispatchers.Main) {
                            latestMeasureWindowResult = result
                        }
                    } catch (e: Exception) {
                        Log.e("CoWA", "Error in measureWindow background operation", e)
                    }
                }
        }
        serviceScope.launch {
            getMessagesFlow
                .collect { rootNode ->
                    try {
                        val result = getMessagesInternal(rootNode)
                        // Switch back to main thread for result handling
                        if (result) {
                            ai.suggestionStorage.clearSuggestion()
                            overlayState?.updateSuggestion("")
                        }
                    } catch (e: Exception) {
                        Log.e("CoWA", "Error in getMessages background operation", e)
                    }
                }
        }
    }

    /**
     * Internal implementation of measureWindow that runs on background thread
     */
    private suspend fun measureWindowInternal(node: AccessibilityNodeInfo): AppSupportStatus {
        val rect = Rect()
        var status: AppSupportStatus = AppSupportStatus.SUPPORTED_UNKOWN

        // This operation can be heavy, so we run it on background thread
        node.getBoundsInScreen(rect)

        // Use EXTRA_DATA_TEXT_CHARACTER_LOCATION_KEY to get the cursor position
        val arguments = Bundle()
        arguments.putInt(
            AccessibilityNodeInfo.EXTRA_DATA_TEXT_CHARACTER_LOCATION_ARG_START_INDEX,
            0
        )
        arguments.putInt(
            AccessibilityNodeInfo.EXTRA_DATA_TEXT_CHARACTER_LOCATION_ARG_LENGTH,
            node.text?.length ?: 0
        )

        if (node.refreshWithExtraData(
                AccessibilityNodeInfo.EXTRA_DATA_TEXT_CHARACTER_LOCATION_KEY,
                arguments
            )
        ) {
            if (android.os.Build.VERSION.SDK_INT >= 33) {
                val rectArray: Array<RectF?>? = node.extras.getParcelableArray(
                    AccessibilityNodeInfo.EXTRA_DATA_TEXT_CHARACTER_LOCATION_KEY,
                    RectF::class.java
                )
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
            } else {
                status = AppSupportStatus.API_BELOW_33
            }
        } else {
            Log.v("CoWA", "Failed to refresh cursor position")
        }
        Log.v("CoWA", "Measured rect: $rect, status: $status")

        // Update shared state instead of direct overlay calls

        overlayState?.updateRect(rect)
        overlayState?.updateNode(node, status)


        if (node.refreshWithExtraData(
                AccessibilityNodeInfo.EXTRA_DATA_RENDERING_INFO_KEY,
                arguments
            )
        ) {
            //Log.v("CoWA", "Text size in px: ${node.extraRenderingInfo?.textSizeInPx}")

            overlayState?.updateTextSize(node.extraRenderingInfo?.textSizeInPx ?: 36f)

        }
        onEditTextUpdate(node, status)

        return status
    }

    /**
     * Internal implementation of getMessages that runs on background thread
     */
    private suspend fun getMessagesInternal(rootInActiveWindow: AccessibilityNodeInfo): Boolean =
        // This is the heavy operation that processes message list
        if (currentApp == null) {
            false
        } else {
            conversationList.combineChatContents(
                currentApp!!.messageListProcessor(rootInActiveWindow)
            )
        }


    /**
     * Lightweight version of measureWindow that triggers background processing
     * and returns cached result for immediate use
     */
    private fun measureWindowThrottled(node: AccessibilityNodeInfo): AppSupportStatus {
        // Emit to flow for background processing
        measureWindowFlow.tryEmit(node)
        // Return cached result for immediate response
        return latestMeasureWindowResult
    }

    /**
     * Lightweight version of getMessages that triggers background processing
     * and returns cached result for immediate use
     */
    private fun getMessagesThrottled(rootInActiveWindow: AccessibilityNodeInfo) {
        // Emit to flow for background processing
        getMessagesFlow.tryEmit(rootInActiveWindow)
    }


    override fun onDestroy() {
        super.onDestroy()
        if (overlay != null) overlay!!.disable()
        // Cancel all background operations
        serviceScope.cancel()
    }

    override fun onSuggestionUpdated(typingInfo: TypingInfo, newSuggestion: String) {
        if (running) {
            overlayState?.updateSuggestion(ai.suggestionStorage.getSuggestion(currentText!!))
        } else {
            ai.suggestionStorage.clearSuggestion()
        }
    }

    companion object {
        var autoDetect: Boolean = false
    }
}
