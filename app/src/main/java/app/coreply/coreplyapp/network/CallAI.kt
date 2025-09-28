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

package app.coreply.coreplyapp.network

import android.content.Context
import android.util.Log
import app.coreply.coreplyapp.data.PreferencesManager
import app.coreply.coreplyapp.utils.ChatContents
import app.coreply.coreplyapp.utils.SuggestionUpdateListener
import com.aallam.openai.api.chat.ChatCompletionRequest
import com.aallam.openai.api.chat.ChatMessage
import com.aallam.openai.api.chat.ChatRole
import com.aallam.openai.api.core.RequestOptions
import com.aallam.openai.api.model.ModelId
import com.aallam.openai.client.OpenAI
import com.aallam.openai.client.OpenAIConfig
import com.aallam.openai.client.OpenAIHost
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.ConcurrentHashMap


class SuggestionStorageClass(private var listener: SuggestionUpdateListener? = null) {
    private val _suggestionHistory = ConcurrentHashMap<String, String>()
    private val PUNCTUATIONS = listOf(
        "!", "\"", ")", ",", ".", ":",
        ";", "?", "]", "~", "，", "。", "：", "；", "？", "）", "】", "！", "、", "」",
    )
    private val PUNCTUATIONS_REGEX = "(?=[!\")\\],.:;?~，。：；？）】！、」])".toRegex()

    fun splitAndKeepPunctuations(text: String): List<String> {
        val parts = text.split(PUNCTUATIONS_REGEX).filter { it.isNotEmpty() }

        if (parts.size < 2) return parts

        // Check if the last part is just punctuation
        else {
            val lastPart = parts.last()
            if (lastPart.length == 1 && PUNCTUATIONS.contains(lastPart)) {
                // Merge the last punctuation with the second-to-last part
                val modifiedParts = parts.dropLast(2).toMutableList()
                modifiedParts.add(parts[parts.size - 2] + lastPart)
                return modifiedParts
            }
        }
        return parts
    }


    // Remove all punctuations from the text, remove whitespaces, and lower all characters
    fun getKeyFromText(text: String): String {
        var key = text.trim()
        for (punctuation in PUNCTUATIONS) {
            key = key.replace(punctuation, "")
        }
        key = key.replace(" ", "")
        key = key.lowercase()
        if (!text.isBlank() && PUNCTUATIONS.contains(text.last().toString())) {
            key += "-"

        }
        return key
    }

    fun String.replaceWhiteSpaces(): String {
        return this.replace("\\s+".toRegex(), " ")
    }
    fun String?.removeMessageISent(): String {
        //Log.v("CallAI", "Response: $this")
        if (this == null) return ""
        else if (this.startsWith("Message I sent: ")) {
            return this.substring("Message I sent: ".length)
        } else if (this.startsWith("Message I received: ")) {
            return this.substring("Message I received: ".length)
        }
        return this
    }

    fun getSuggestion(toBeCompleted: String): String? {
        if (toBeCompleted.isBlank()) {
            if (_suggestionHistory.containsKey("")) {
                return _suggestionHistory[""]!!
            }
        }
        for (i in 0..toBeCompleted.length) {
            val target: String = getKeyFromText(toBeCompleted.substring(0, i))
            if (_suggestionHistory.containsKey(target)) {
                val starting = toBeCompleted.substring(i)
                val suggestion = _suggestionHistory[target]!!
                if (starting.isEmpty() || (suggestion.startsWith(starting) &&
                            suggestion.length > starting.length)
                ) {
                    return suggestion.substring(starting.length)
                }
            }
        }
        return null;
    }

    fun clearSuggestion() {
        _suggestionHistory.clear()
    }

    fun setSuggestionUpdateListener(listener: SuggestionUpdateListener) {
        this.listener = listener
    }

    fun addSuggestionWithoutReplacement(key: String, suggestion: String) {
        if (!_suggestionHistory.containsKey(key)) {
            _suggestionHistory[key] = suggestion
        }
    }

    fun updateSuggestion(typingInfo: TypingInfo, newSuggestion: String) {
        if (newSuggestion.replaceWhiteSpaces().removeMessageISent().lowercase()
                .startsWith(typingInfo.currentTyping.replaceWhiteSpaces().removeMessageISent().lowercase())
        ) {
            val frontTrimmedSuggestion = newSuggestion.replaceWhiteSpaces().removeMessageISent()
                .substring(typingInfo.currentTyping.replaceWhiteSpaces().removeMessageISent().length)
            val splittedText = splitAndKeepPunctuations(frontTrimmedSuggestion)
//            Log.v("CallAI", "Splitted text: $splittedText")
            for (i in 0..splittedText.size - 2) {
//                Log.v("CallAI", getKeyFromText(typingInfo.currentTyping + splittedText.subList(0, i + 1).joinToString("")))
                addSuggestionWithoutReplacement(
                    getKeyFromText(
                        typingInfo.currentTyping + splittedText.subList(
                            0,
                            i + 1
                        ).joinToString("")
                    ), splittedText[i + 1]
                )
            }
            addSuggestionWithoutReplacement(
                getKeyFromText(typingInfo.currentTyping),
                if (splittedText.isNotEmpty()) splittedText[0] else ""
            )
            listener?.onSuggestionUpdated(
                typingInfo,
                frontTrimmedSuggestion
            ) // huh actually the arguments are unused
        }
    }
}

data class TypingInfo(val pastMessages: ChatContents, val currentTyping: String) {
    val currentTypingTrimmed =
        currentTyping.substring(0, currentTyping.length - currentTyping.split(" ").last().length)
            .trimEnd()
}

@OptIn(FlowPreview::class)
open class CallAI(
    open val suggestionStorage: SuggestionStorageClass,
    private val context: Context
) {
    private val coroutineScope = CoroutineScope(Dispatchers.IO)
    private val networkScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val preferencesManager = PreferencesManager.getInstance(context)

    // Flow to handle debouncing of user input
    private val userInputFlow = MutableSharedFlow<TypingInfo>(replay = 1)

    init {
        // Launch a coroutine to collect debounced user input and fetch suggestions
        coroutineScope.launch {
            preferencesManager.loadPreferences()
            userInputFlow // adjust debounce delay as needed
                .debounce(360)
                .collect { typingInfo ->
                    networkScope.launch {
                        fetchSuggestions(typingInfo)
                    }
                }
        }
    }

    fun onUserInputChanged(typingInfo: TypingInfo) {
        // Emit user input to the flow
        coroutineScope.launch {
            userInputFlow.emit(typingInfo)
        }
    }

    private suspend fun fetchSuggestions(typingInfo: TypingInfo) {
        try {
            if (typingInfo.currentTyping.isBlank() && typingInfo.pastMessages.chatContents.isEmpty()) {
                // If no current typing and no past messages, do nothing
                return
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
        }
    }
}