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

import android.graphics.Rect
import android.util.Log
import android.view.accessibility.AccessibilityNodeInfo
import app.coreply.coreplyapp.applistener.AppSupportStatus
import app.coreply.coreplyapp.applistener.SupportedAppProperty
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Centralized state management for overlay functionality.
 * Contains all overlay-related state that needs to be coordinated across components.
 */
data class OverlayStateData(
    val isEnabled: Boolean = false,
    val rect: Rect? = null,
    val node: AccessibilityNodeInfo? = null,
    val status: AppSupportStatus = AppSupportStatus.UNSUPPORTED,
    val content: OverlayContent = OverlayContent.Empty,
    val textSize: Float? = null,
    val currentApp: SupportedAppProperty? = null,
    val running: Boolean = false,
    val chatEntryWidth: Int = 0,
    val nodeText: String = ""
)

class OverlayState {
    private val _state = MutableStateFlow(OverlayStateData())
    val state: StateFlow<OverlayStateData> = _state.asStateFlow()

    fun updateEnabled(enabled: Boolean) {
        _state.value = _state.value.copy(isEnabled = enabled)
    }

    fun updateRect(rect: Rect) {
        _state.value = _state.value.copy(rect = rect, chatEntryWidth = rect.right - rect.left)
    }

    fun updateNode(node: AccessibilityNodeInfo, status: AppSupportStatus) {
        _state.value = _state.value.copy(node = node, status = status, nodeText = node.text?.toString() ?: "")
    }

    fun updateContent(content: OverlayContent) {
        _state.value = _state.value.copy(content = content)
    }

    fun updateTextSize(textSize: Float) {
        _state.value = _state.value.copy(textSize = textSize)
    }

    fun updateCurrentApp(app: SupportedAppProperty?) {
        _state.value = _state.value.copy(currentApp = app)
    }

    fun updateRunning(running: Boolean) {
        _state.value = _state.value.copy(running = running)
    }

    fun updateChatEntryWidth(width: Int) {
        _state.value = _state.value.copy(chatEntryWidth = width)
    }

    fun disable() {
        _state.value = _state.value.copy(
            isEnabled = false,
            running = false,
            content = OverlayContent.Empty
        )
    }

    fun getCurrentState(): OverlayStateData = _state.value
}
