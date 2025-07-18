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

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import app.coreply.coreplyapp.applistener.AppSupportStatus

data class OverlayUiState(
    val inlineText: String = "",
    val trailingText: String = "",
    val inlineTextSize: Float = 18f,
    val showBubbleBackground: Boolean = false,
    val isRunning: Boolean = false
)

class OverlayViewModel : ViewModel() {
    
    var uiState by mutableStateOf(OverlayUiState())
        private set

    fun updateTextSize(textSize: Float) {
        uiState = uiState.copy(inlineTextSize = textSize)
    }

    fun updateBackgroundVisibility(showBackground: Boolean) {
        uiState = uiState.copy(showBubbleBackground = showBackground)
    }

    fun updateSuggestion(suggestion: String?, textActualWidth: Float, chatEntryWidth: Int, status: AppSupportStatus) {
        val suggestion = suggestion ?: ""
        
        when {
            status == AppSupportStatus.API_BELOW_33 -> {
                uiState = uiState.copy(
                    inlineText = "",
                    trailingText = suggestion.trimEnd(),
                    showBubbleBackground = false
                )
            }
            textActualWidth > chatEntryWidth -> {
                uiState = uiState.copy(
                    inlineText = suggestion.trimEnd(),
                    trailingText = suggestion.trimEnd(),
                    showBubbleBackground = status == AppSupportStatus.HINT_TEXT
                )
            }
            else -> {
                uiState = uiState.copy(
                    inlineText = suggestion.trimEnd(),
                    trailingText = "",
                    showBubbleBackground = status == AppSupportStatus.HINT_TEXT
                )
            }
        }
    }

    fun enable() {
        uiState = uiState.copy(isRunning = true)
    }

    fun disable() {
        uiState = uiState.copy(
            isRunning = false,
            inlineText = "",
            trailingText = ""
        )
    }
}
