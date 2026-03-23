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

package app.coreply.coreplyapp.suggestions

import app.coreply.coreplyapp.data.PreferencesManager
import app.coreply.coreplyapp.network.CustomAPISuggestionRequester
import app.coreply.coreplyapp.network.FIMSuggestionRequester
import app.coreply.coreplyapp.network.HostedSuggestionRequester
import app.coreply.coreplyapp.network.SuggestionRequester
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.launch


@OptIn(FlowPreview::class)
open class CallAI(
    open val suggestionStorage: SuggestionStorage,
    private val preferencesManager: PreferencesManager
) {
    private val coroutineScope = CoroutineScope(Dispatchers.IO)
    private val networkScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // Flow to handle debouncing of user input
    private val _userInputFlow = MutableSharedFlow<TypingInfo>(replay = 1)
    val userInputFlow: MutableSharedFlow<TypingInfo>
        get() = _userInputFlow

    init {
        // Launch a coroutine to collect debounced user input and fetch suggestions
        coroutineScope.launch {
            _userInputFlow
                .debounce { preferencesManager.customDebounceState.value.toLong() }
                .collect { typingInfo ->
                    networkScope.launch {
                        fetchSuggestions(typingInfo)
                    }
                }
        }
    }


    private suspend fun fetchSuggestions(typingInfo: TypingInfo) {
        try {
            if (typingInfo.currentTyping.isBlank() && typingInfo.pastMessages.chatContents.isEmpty()) {
                // If no current typing and no past messages, do nothing
                return
            }

            // Check regex filter
            if (preferencesManager.typingRegexEnabledState.value) {
                val pattern = preferencesManager.typingRegexPatternState.value
                if (pattern.isNotEmpty()) {
                    val regex = try {
                        Regex(pattern)
                    } catch (e: Exception) {
                        null
                    }
                    if (regex != null && !regex.containsMatchIn(typingInfo.currentTyping)) {
                        return
                    }
                }
            }
            val baseURL = preferencesManager.customApiUrlState.value
            val apiType = preferencesManager.apiTypeState.value
            val suggestionRequester: SuggestionRequester = if (apiType=="hosted") {
                HostedSuggestionRequester
            } else {
                if (baseURL.endsWith("/fim") || baseURL.endsWith("/fim/")) {
                    FIMSuggestionRequester
                } else {
                    CustomAPISuggestionRequester
                }
            }
            var suggestions =
                suggestionRequester.requestSuggestionsFromServer(typingInfo, preferencesManager)
            suggestions = suggestions.replace("\n", " ")
            if (suggestions.startsWith(" ")) {
                suggestions = " " + suggestions.trim()
            }
            suggestionStorage.updateSuggestion(typingInfo, suggestions.trimEnd())
        } catch (e: Exception) {
            // Handle exceptions such as network errors
            e.printStackTrace()
            if (preferencesManager.showErrorsState.value) {
                val errorMessage = e.toString()
                suggestionStorage.listener.onSuggestionError(typingInfo, errorMessage)
            }

        }
    }
}