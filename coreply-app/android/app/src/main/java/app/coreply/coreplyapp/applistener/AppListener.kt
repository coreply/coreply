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
import android.os.Build
import android.util.Log
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.widget.Toast
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import app.coreply.coreplyapp.BuildConfig
import app.coreply.coreplyapp.R
import app.coreply.coreplyapp.data.ExpoSettingsStorage
import app.coreply.coreplyapp.data.PreferencesManager
import app.coreply.coreplyapp.suggestions.SuggestionStorage
import app.coreply.coreplyapp.ui.Overlay
import app.coreply.coreplyapp.ui.OverlayContentType
import app.coreply.coreplyapp.ui.viewmodel.OverlayViewModel
import app.coreply.coreplyapp.utils.PixelCalculator
import app.coreply.coreplymodule.CoreplyDisableRequests
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.launch
import org.json.JSONObject
import expo.modules.brownfield.BrownfieldMessaging
import expo.modules.brownfield.BrownfieldState
import kotlin.time.Duration.Companion.milliseconds

private class LocalWebViewClient(private val assetLoader: WebViewAssetLoader) :
    WebViewClientCompat() {
    override fun shouldInterceptRequest(
        view: WebView?,
        request: WebResourceRequest
    ): WebResourceResponse? {
        return assetLoader.shouldInterceptRequest(request.url)
    }
}

@OptIn(FlowPreview::class)
open class AppListener : AccessibilityService() {
    companion object {
        private const val LOG_TAG = "CoWA"
        private const val LOG_CHUNK_SIZE = 4000
    }

    private lateinit var overlay: Overlay
    private lateinit var overlayViewModel: OverlayViewModel
    private val pixelCalculator: PixelCalculator = PixelCalculator(this)
    private lateinit var preferencesManager: PreferencesManager
    private lateinit var expoSettingsStorage: ExpoSettingsStorage
    private lateinit var webView: WebView
    private val suggestionStorage = SuggestionStorage()
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val measureWindowFlow = MutableSharedFlow<Unit>(
        replay = 0,
        extraBufferCapacity = 1,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )
    private val getMessagesFlow = MutableSharedFlow<AccessibilityNodeInfo>(
        replay = 0,
        extraBufferCapacity = 1,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )
    private var wrapperReady = false
    private var javaScriptReplyProxy: JavaScriptReplyProxy? = null

    // ** Added collectionMode field with default value "minimal"
    private var collectionMode: String = "minimal"

    private lateinit var brownfieldListenerId: String

    private fun describeNode(node: AccessibilityNodeInfo?): String {
        if (node == null) {
            return "null"
        }
        return "pkg=${node.packageName}, class=${node.className}, viewId=${node.viewIdResourceName}, text=${node.text}, focused=${node.isFocused}, editable=${node.isEditable}, showingHint=${node.isShowingHintText}"
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        Log.v("CoWA", "there is an accessibility event: $event")
        if (event?.packageName?.startsWith("app.coreply") == true) {
            return
        }
        if (event == null || event.packageName == null || event.className == null) {
            return
        }
        val root = rootInActiveWindow ?: return

        refreshOverlay(root)
    }

    override fun onInterrupt() {
        setAccessibilityEnabled(false)
        overlay.removeOverlays()
        clearSuggestionStorage()
    }

    private fun setAccessibilityEnabled(enabled: Boolean) {
        BrownfieldState.getOrCreate("accessibilityEnabled")
        BrownfieldState.set("accessibilityEnabled", enabled)
    }

    private fun refreshOverlay(root: AccessibilityNodeInfo): Boolean {
        val rootPackageName = root.packageName
        val isSupportedApp = rootPackageName != null &&
                preferencesManager.selectedAppsState.value.contains(rootPackageName)

        Log.v(
            LOG_TAG,
            "refreshOverlay: rootPackage=$rootPackageName, isSupportedApp=$isSupportedApp, collectionMode=$collectionMode, isRunning=${overlayViewModel.uiState.value.isRunning}"
        )

        if (isSupportedApp) {
            getMessagesFlow.tryEmit(root)
            if (collectionMode == "active") {
                measureWindowFlow.tryEmit(Unit)
            }
        } else if (overlayViewModel.uiState.value.isRunning) {
            overlayViewModel.disable()
        }

        return isSupportedApp
    }

    private fun updateServiceInfoForCollectionMode() {
        Log.d(LOG_TAG, "Updating service info for collection mode: $collectionMode")
        val info = serviceInfo
        info.notificationTimeout = if (collectionMode == "minimal") 2000 else 0
        info.eventTypes = when (collectionMode) {
            "minimal" ->
                AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                        AccessibilityEvent.TYPE_VIEW_CLICKED or
                        AccessibilityEvent.TYPE_VIEW_FOCUSED or
                        AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED

            "frequent", "active" ->
                AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                        AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                        AccessibilityEvent.TYPE_VIEW_CLICKED or
                        AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED or
                        AccessibilityEvent.TYPE_VIEW_FOCUSED or
                        AccessibilityEvent.TYPE_VIEW_SCROLLED

            else ->
                AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                        AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                        AccessibilityEvent.TYPE_VIEW_CLICKED or
                        AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED or
                        AccessibilityEvent.TYPE_VIEW_FOCUSED or
                        AccessibilityEvent.TYPE_VIEW_SCROLLED
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            info.flags =
                AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or AccessibilityServiceInfo.FLAG_INPUT_METHOD_EDITOR or AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
        } else {
            info.flags =
                AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
        }
        serviceInfo = info
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        // ** Initialize service info with default collection mode (minimal)
        updateServiceInfoForCollectionMode()
        Toast.makeText(
            applicationContext,
            getString(R.string.accessibility_started),
            Toast.LENGTH_SHORT
        ).show()

        val appContext = applicationContext
        preferencesManager = PreferencesManager.getInstance(appContext)
        expoSettingsStorage = ExpoSettingsStorage(appContext)
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(appContext))
            .build()
        webView = WebView(appContext)
        webView.webViewClient = LocalWebViewClient(assetLoader)
        webView.settings.javaScriptEnabled = true
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(
                webView,
                "coreplyBridgeObject",
                setOf("*")
            ) { _, msg, _, _, replyProxy ->
                javaScriptReplyProxy = javaScriptReplyProxy ?: replyProxy
                handleWrapperMessage(msg)
            }
        } else {
            Log.w("CoWA", "WebMessageListener is not supported on this device.")
        }
        webView.loadUrl("https://appassets.androidplatform.net/assets/wrapper/index.html")

        overlay = Overlay(appContext, getSystemService(WINDOW_SERVICE) as WindowManager)
        overlayViewModel = overlay.viewModel
        overlayViewModel.onTypingUpdated = ::sendTypingUpdate

        initializeThrottledFlows()
        MainScope().launch {
            preferencesManager.loadPreferences()
            sendSettings()
        }
        observeDisableRequests()
        setAccessibilityEnabled(true)
        brownfieldListenerId = BrownfieldMessaging.addListener { event ->
            when (event["type"] as? String) {
                "disableService" -> serviceScope.launch(Dispatchers.Main) {
                    disableListener()
                }

                "settingsUpdated" -> {
                    val payload = event["data"]
                    val settings = JSONObject(payload as MutableMap<*, *>)
                    serviceScope.launch(Dispatchers.Main) {
                        sendSettings(settings)
                    }
                }
            }
        }

    }

    private fun observeDisableRequests() {
        serviceScope.launch {
            preferencesManager.disableSelfRequests.collect {
                disableListener()
            }
        }
        serviceScope.launch {
            CoreplyDisableRequests.flow.collect {
                val wasEnabled = preferencesManager.masterSwitchState.value
                preferencesManager.updateMasterSwitch(false)
                if (!wasEnabled) {
                    disableListener()
                }
            }
        }
    }

    private fun disableListener() {
        setAccessibilityEnabled(false)
        overlay.removeOverlays()
        overlayViewModel.disable()
        clearSuggestionStorage()
        disableSelf()
    }

    private fun refreshSuggestionFromStorage() {
        if (!::overlayViewModel.isInitialized) {
            return
        }
        val currentTyping = overlayViewModel.uiState.value.currentTyping ?: return
        val suggestion = suggestionStorage.getSuggestion(currentTyping)
        if (suggestion != null) {
            overlayViewModel.updateSuggestion(suggestion)
        } else if (overlayViewModel.uiState.value.content.type != OverlayContentType.ERROR) {
            overlayViewModel.clearSuggestion()
        }
    }

    private fun clearSuggestionStorage() {
        suggestionStorage.clear()
        if (::overlayViewModel.isInitialized) {
            overlayViewModel.clearSuggestion()
        }
    }

    private fun initializeThrottledFlows() {
        serviceScope.launch {
            measureWindowFlow.collect {
                try {
                    val root = rootInActiveWindow
                    val im = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) inputMethod else null
                    overlayViewModel.refresh(root, pixelCalculator.spToPx(16f), im)
                } catch (e: Exception) {
                    Log.e("CoWA", "Error in measureWindow background operation", e)
                }
            }
        }
        serviceScope.launch {
            // ** Repurposed this flow to send snapshot directly instead of using getMessagesInternal
            getMessagesFlow.debounce(500.milliseconds).collect {
                try {
                    val startTime = System.currentTimeMillis()
                    val nodeSnapshot = it.serializeToJson()
                    val snapshot = JSONObject().apply {
                        put("platform", "android")
                        put("snapshot", nodeSnapshot)
                    }
                    logLargeDebug("Snapshot JSON", snapshot.toString())
                    sendWrapperMessage(JSONObject().apply {
                        put("type", "snapshotUpdated")
                        put("payload", JSONObject().apply {
                            put("snapshot", snapshot)
                        })
                    })
                    val endTime = System.currentTimeMillis()
                    Log.d(LOG_TAG, "Snapshot serialization took ${endTime - startTime} ms")
                } catch (e: Exception) {
                    Log.e(LOG_TAG, "Error in snapshot background operation", e)
                }
            }
        }
    }

    private fun logLargeDebug(prefix: String, message: String) {
        if (!BuildConfig.DEBUG) {
            return
        }
        var start = 0
        var chunkIndex = 0
        while (start < message.length) {
            val end = minOf(start + LOG_CHUNK_SIZE, message.length)
            val chunk = message.substring(start, end)
            if (chunkIndex == 0) {
                Log.d(LOG_TAG, "$prefix: $chunk")
            } else {
                Log.d(LOG_TAG, chunk)
            }
            start = end
            chunkIndex += 1
        }
    }

    private fun handleWrapperMessage(message: WebMessageCompat) {
        val data = message.data ?: return
        try {
            val json = JSONObject(data)
            when (json.optString("type")) {
                "init" -> {
                    wrapperReady = true
                    serviceScope.launch {
                        sendSettings()
                        sendTypingUpdate()
                    }
                }

                "updateSuggestion" -> {
                    val payload = json.getJSONObject("payload")
                    suggestionStorage.addSuggestion(payload.optString("fullSuggestion"))
                    refreshSuggestionFromStorage()
                }

                "error" -> {
                    val payload = json.getJSONObject("payload")
                    overlayViewModel.updateSuggestionError(payload.optString("message"))
                }

                "collectionModeUpdated" -> {
                    val payload = json.getJSONObject("payload")
                    collectionMode = payload.optString("collectionMode", "minimal")
                    Log.d(LOG_TAG, "Wrapper updated collectionMode to $collectionMode")
                    if (collectionMode == "minimal") {
                        clearSuggestionStorage()
                    }
                    updateServiceInfoForCollectionMode()
                    if (collectionMode == "active") {
                        measureWindowFlow.tryEmit(Unit)
                    } else {
                        if (overlayViewModel.uiState.value.isRunning) {
                            overlayViewModel.disable()
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(LOG_TAG, "Failed to parse wrapper message", e)
        }
    }

    private fun sendWrapperMessage(message: JSONObject) {
        if (!::webView.isInitialized || !wrapperReady && message.optString("type") != "settings") {
            return
        }
        javaScriptReplyProxy?.postMessage(message.toString())
    }

    private fun sendSettings(payload: JSONObject) {
        sendWrapperMessage(JSONObject().apply {
            put("type", "settings")
            put("payload", payload)
        })
    }

    private suspend fun sendSettings() {
        if (!::expoSettingsStorage.isInitialized) {
            return
        }
        val payload = expoSettingsStorage.getStoredCoreplySettings() ?: return
        sendSettings(payload)
    }

    private fun sendTypingUpdate() {
        val uiState = overlayViewModel.uiState.value
        refreshSuggestionFromStorage()
        Log.v(
            LOG_TAG,
            "sendTypingUpdate: currentTyping=${uiState.currentTyping}, currentStatus=${uiState.currentStatus}, currentInput=${
                describeNode(
                    uiState.currentInput
                )
            }"
        )
        sendWrapperMessage(JSONObject().apply {
            put("type", "updateTyping")
            put("payload", JSONObject().apply {
                put("currentTyping", uiState.currentTyping ?: "")
            })
        })
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::brownfieldListenerId.isInitialized) {
            BrownfieldMessaging.removeListener(brownfieldListenerId)
        }
        setAccessibilityEnabled(false)
        overlayViewModel.disable()
        clearSuggestionStorage()
        serviceScope.cancel()
    }
}
