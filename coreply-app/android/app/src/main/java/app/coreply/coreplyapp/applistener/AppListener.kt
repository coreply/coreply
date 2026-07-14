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
import app.coreply.coreplyapp.R
import app.coreply.coreplyapp.data.ExpoSettingsStorage
import app.coreply.coreplyapp.data.PreferencesManager
import app.coreply.coreplyapp.suggestions.SuggestionStorage
import app.coreply.coreplyapp.ui.Overlay
import app.coreply.coreplyapp.ui.OverlayContentType
import app.coreply.coreplyapp.ui.viewmodel.OverlayViewModel
import app.coreply.coreplyapp.ui.viewmodel.RefreshType
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
import org.json.JSONArray
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
    private lateinit var overlay: Overlay
    private lateinit var overlayViewModel: OverlayViewModel
    private val pixelCalculator: PixelCalculator = PixelCalculator(this)
    private lateinit var preferencesManager: PreferencesManager
    private lateinit var expoSettingsStorage: ExpoSettingsStorage
    private lateinit var webView: WebView
    private val suggestionStorage = SuggestionStorage()
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val measureWindowFlow = MutableSharedFlow<AccessibilityNodeInfo>(
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

    private lateinit var brownfieldListenerId: String;

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
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
        sendReset()
    }

    private fun setAccessibilityEnabled(enabled: Boolean) {
        BrownfieldState.getOrCreate("accessibilityEnabled")
        BrownfieldState.set("accessibilityEnabled", enabled)
    }

    private fun refreshOverlay(root: AccessibilityNodeInfo): Boolean {
        var isSupportedApp = false
        val previousInputNodeStillHere = overlayViewModel.refresh(RefreshType.NORMAL, false)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            overlayViewModel.updateInputMethod(inputMethod)
        }

        val (supportedAppProperty, inputWidget) = if (previousInputNodeStillHere) {
            Pair(
                overlayViewModel.uiState.value.currentApp,
                overlayViewModel.uiState.value.currentInput
            )
        } else {
            detectSupportedApp(root, preferencesManager.selectedAppsState.value)
        }

        if (supportedAppProperty != null && inputWidget != null) {
            isSupportedApp = true
            val info = serviceInfo
            info.notificationTimeout = 0
            info.eventTypes =
                AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                        AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                        AccessibilityEvent.TYPE_VIEW_CLICKED or
                        AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED or
                        AccessibilityEvent.TYPE_VIEW_FOCUSED or
                        AccessibilityEvent.TYPE_VIEW_SCROLLED
            serviceInfo = info

            overlayViewModel.enable(
                supportedAppProperty,
                inputWidget,
                root,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) inputMethod else null,
            )

            measureWindowFlow.tryEmit(inputWidget)
            getMessagesFlow.tryEmit(root)
        }

        if (!isSupportedApp && overlayViewModel.uiState.value.isRunning) {
            val info = serviceInfo
            info.notificationTimeout = 2000
            info.eventTypes =
                AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                        AccessibilityEvent.TYPE_VIEW_CLICKED or
                        AccessibilityEvent.TYPE_VIEW_FOCUSED or
                        AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED
            serviceInfo = info
            overlayViewModel.disable()
            sendReset()
        }

        return isSupportedApp
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        val info = serviceInfo
        info.eventTypes =
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                    AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                    AccessibilityEvent.TYPE_VIEW_CLICKED or
                    AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED or
                    AccessibilityEvent.TYPE_VIEW_FOCUSED or
                    AccessibilityEvent.TYPE_VIEW_SCROLLED
        info.flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or AccessibilityServiceInfo.FLAG_INPUT_METHOD_EDITOR
        } else {
            AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
        }
        serviceInfo = info
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
        sendReset()
        disableSelf()
    }

    private fun refreshSuggestionFromStorage() {
        if (!::overlayViewModel.isInitialized) {
            return
        }
        val suggestion =
            suggestionStorage.getSuggestion(overlayViewModel.uiState.value.currentTyping)
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
                    overlayViewModel.refresh(RefreshType.CHAR_LOCATION, true)
                } catch (e: Exception) {
                    Log.e("CoWA", "Error in measureWindow background operation", e)
                }
            }
        }
        serviceScope.launch {
            getMessagesFlow.debounce(500.milliseconds).collect {
                try {
                    getMessagesInternal()
                } catch (e: Exception) {
                    Log.e("CoWA", "Error in getMessages background operation", e)
                }
            }
        }
    }

    private fun getMessagesInternal() {
        overlayViewModel.refresh(RefreshType.TEXT_SIZE, false, pixelCalculator.spToPx(16f))
        val messages = overlayViewModel.refreshMessageListNode()
        sendMessages(messages)
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

                "clearSuggestion" -> {
                    clearSuggestionStorage()
                }

                "error" -> {
                    val payload = json.getJSONObject("payload")
                    overlayViewModel.updateSuggestionError(payload.optString("message"))
                }
            }
        } catch (e: Exception) {
            Log.e("CoWA", "Failed to parse wrapper message", e)
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

    private fun sendMessages(messages: List<app.coreply.coreplyapp.utils.ChatMessage>) {
        val pkgName = overlayViewModel.uiState.value.currentApp?.pkgName ?: return
        val serializedMessages = JSONArray().apply {
            messages.forEach { message ->
                put(JSONObject().apply {
                    put("sender", message.sender)
                    put("message", message.message)
                })
            }
        }
        sendWrapperMessage(JSONObject().apply {
            put("type", "ingestMessages")
            put("payload", JSONObject().apply {
                put("messages", serializedMessages)
            })
        })
    }

    private fun sendTypingUpdate() {
        val uiState = overlayViewModel.uiState.value
        refreshSuggestionFromStorage()
        sendWrapperMessage(JSONObject().apply {
            put("type", "updateTyping")
            put("payload", JSONObject().apply {
                put("currentTyping", uiState.currentTyping)
            })
        })
    }

    private fun sendReset() {
        clearSuggestionStorage()
        sendWrapperMessage(JSONObject().apply {
            put("type", "reset")
        })
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::brownfieldListenerId.isInitialized) {
            BrownfieldMessaging.removeListener(brownfieldListenerId)
        }
        setAccessibilityEnabled(false)
        overlayViewModel.disable()
        sendReset()
        serviceScope.cancel()
    }
}
