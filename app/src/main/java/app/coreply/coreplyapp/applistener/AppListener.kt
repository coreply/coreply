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
import android.util.Log
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Toast
import app.coreply.coreplyapp.R
import app.coreply.coreplyapp.data.PreferencesManager
import app.coreply.coreplyapp.ui.Overlay
import app.coreply.coreplyapp.ui.viewmodel.OverlayViewModel
import app.coreply.coreplyapp.ui.viewmodel.RefreshType
import app.coreply.coreplyapp.utils.PixelCalculator
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.launch

/**
 * Created on 10/13/16.
 */
@OptIn(kotlinx.coroutines.FlowPreview::class)
open class AppListener : AccessibilityService() {
    private lateinit var overlay: Overlay
    private lateinit var overlayViewModel: OverlayViewModel
    private val pixelCalculator: PixelCalculator = PixelCalculator(this)
    private val preferencesManager: PreferencesManager = PreferencesManager.getInstance(this)


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
        overlay.removeOverlays()
    }


    private fun refreshOverlay(event: AccessibilityEvent, root: AccessibilityNodeInfo): Boolean {
        var isSupportedApp = false
        var previousInputNodeStillHere = false
        previousInputNodeStillHere = overlayViewModel.refresh(RefreshType.NORMAL, false)
        val (supportedAppProperty, inputWidget) = if (previousInputNodeStillHere) Pair(
            overlayViewModel.uiState.value.currentApp,
            overlayViewModel.uiState.value.currentInput
        ) else detectSupportedApp(root, preferencesManager.selectedAppsState.value)
        if (supportedAppProperty != null && inputWidget != null) {
            isSupportedApp = true
            val info = this.serviceInfo
            info.notificationTimeout = 0
            info.eventTypes =
                AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or AccessibilityEvent.TYPE_VIEW_CLICKED or AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED or AccessibilityEvent.TYPE_VIEW_FOCUSED or AccessibilityEvent.TYPE_VIEW_SCROLLED
            this.serviceInfo = info
            // Update state instead of direct overlay calls
            overlayViewModel.enable(supportedAppProperty, inputWidget, root)

            measureWindowFlow.tryEmit(inputWidget)
            getMessagesFlow.tryEmit(root)

        }
        if (!isSupportedApp) {
            if (overlayViewModel.uiState.value.isRunning) {
                val info = this.serviceInfo
                info.notificationTimeout = 2000
                info.eventTypes =
                    AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or AccessibilityEvent.TYPE_VIEW_CLICKED or AccessibilityEvent.TYPE_VIEW_FOCUSED
                this.serviceInfo = info

                // Update state instead of direct overlay calls
                overlayViewModel.disable()
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
        Toast.makeText(
            applicationContext,
            getString(R.string.app_accessibility_started),
            Toast.LENGTH_SHORT
        )
            .show()
        val appContext = applicationContext

        overlay = Overlay(
            appContext,
            getSystemService(WINDOW_SERVICE) as WindowManager,
        )
        overlayViewModel = overlay.viewModel

        // Initialize throttled flows for heavy operations
        initializeThrottledFlows()
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
                        overlayViewModel.refresh(RefreshType.CHAR_LOCATION, true)

                    } catch (e: Exception) {
                        Log.e("CoWA", "Error in measureWindow background operation", e)
                    }
                }
        }
        serviceScope.launch {
            getMessagesFlow
                .debounce(500)
                .collect { rootNode ->
                    try {
                        getMessagesInternal()
                    } catch (e: Exception) {
                        Log.e("CoWA", "Error in getMessages background operation", e)
                    }
                }
        }
    }


    /**
     * Internal implementation of getMessages that runs on background thread
     */
    private fun getMessagesInternal() {
        overlayViewModel.refresh(RefreshType.TEXT_SIZE, false, pixelCalculator.spToPx(18f))
        overlayViewModel.refreshMessageListNode()
    }


    override fun onDestroy() {
        super.onDestroy()
        overlayViewModel.disable()
        // Cancel all background operations
        serviceScope.cancel()
    }

}
