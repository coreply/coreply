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

import android.content.Context
import app.coreply.coreplyapp.data.PreferencesManager
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


@OptIn(FlowPreview::class)
open class CallAI(
    open val suggestionStorage: SuggestionStorage,
    context: Context
) {
    private val coroutineScope = CoroutineScope(Dispatchers.IO)
    private val networkScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val preferencesManager = PreferencesManager.getInstance(context)

    // Flow to handle debouncing of user input
    private val _userInputFlow = MutableSharedFlow<TypingInfo>(replay = 1)
    val userInputFlow: MutableSharedFlow<TypingInfo>
        get() = _userInputFlow

    init {
        // Launch a coroutine to collect debounced user input and fetch suggestions
        coroutineScope.launch {
            preferencesManager.loadPreferences()
            _userInputFlow // adjust debounce delay as needed
                .debounce(360)
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
            var suggestions =
                requestSuggestionsFromServer(typingInfo)
            suggestions = suggestions.replace("\n", " ")
            if (suggestions.startsWith(" ")) {
                suggestions = " " + suggestions.trim()
            }
            suggestionStorage.updateSuggestion(typingInfo, suggestions.trimEnd())
        } catch (e: Exception) {
            // Handle exceptions such as network errors
            e.printStackTrace()
            if(preferencesManager.showErrorsState.value){
                val errorMessage = e.toString()
                suggestionStorage.listener.onSuggestionError(typingInfo, errorMessage)
            }

        }
    }

    open suspend fun requestSuggestionsFromServer(
        typingInfo: TypingInfo
    ): String {
        var baseUrl = preferencesManager.customApiUrlState.value
        if (!baseUrl.endsWith("/")) {
            baseUrl += "/"
        }
        val host = OpenAIHost(
            baseUrl = baseUrl,
        )
        val config = OpenAIConfig(
            host = host,
            token = preferencesManager.customApiKeyState.value,
        )

        val modelName = preferencesManager.customModelNameState.value

        val openAI = OpenAI(config)

        if (baseUrl.contains("/fim/")) {
            val userPrompt = "# Mocking a texting conversation. Messages never repeat. send_message() sends a message. mock_received() means receiving a message from others.\n# Start of Chat History\n" +
                    typingInfo.pastMessages.getFIMFormat() + "\n" +
                    "# Craft a new text\nsend_message(\"" + typingInfo.currentTyping.replace("\\s+".toRegex(), " ")

            val client = okhttp3.OkHttpClient()
            val mediaType = "application/json".toMediaTypeOrNull()
            val requestBody = org.json.JSONObject().apply {
                put("model", modelName)
                put("temperature", preferencesManager.temperatureState.value.toDouble())
                put("top_p", preferencesManager.topPState.value.toDouble())
                put("max_tokens", 100)
                put("stream", false)
                put("stop", "\")")
                put("prompt", userPrompt)
            }.toString().toRequestBody(mediaType)

            val request = okhttp3.Request.Builder()
                .url("${baseUrl}completions") // Replace with actual endpoint
                .post(requestBody)
                .addHeader("Authorization", "Bearer ${preferencesManager.customApiKeyState.value}")
                .addHeader("Content-Type", "application/json")
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() ?: ""
            //Log.v("CallAI", "Response: $responseBody")
            val jsonResponse = org.json.JSONObject(responseBody)
            val choices = jsonResponse.getJSONArray("choices")
            val message = choices.getJSONObject(0).getJSONObject("message")
            val completionText = message.getString("content")
            return (typingInfo.currentTyping.replace("\\s+".toRegex(), " ") + completionText).trim()
        } else{
            var userPrompt = "Given this chat history\n" +
                    typingInfo.pastMessages.getCoreply2Format() + "\nIn addition to the message I sent,\n" +
                    "What else should I send? Or start a new topic?"
            if (typingInfo.currentTyping.isNotBlank()) {
                userPrompt += "The reply should start with '${
                    typingInfo.currentTyping.replace(
                        "\\s+".toRegex(),
                        " "
                    )
                }'\n"
            }
            val request = ChatCompletionRequest(
                temperature = preferencesManager.temperatureState.value.toDouble(),
                model = ModelId(modelName),
                topP = preferencesManager.topPState.value.toDouble(),
                maxTokens = 1000,
                messages = listOf(
                    ChatMessage(
                        role = ChatRole.System,
                        content = preferencesManager.customSystemPromptState.value.takeIf { it.isNotBlank() }
                            ?: "You are an AI texting assistant. You will be given a list of text messages between the user (indicated by 'Message I sent:'), and other people (indicated by their names or simply 'Message I received:'). You may also receive a screenshot of the conversation. Your job is to suggest the next message the user should send. Match the tone and style of the conversation. The user may request the message start or end with a certain prefix (both could be parts of a longer word) . The user may quote a specific message. In this case, make sure your suggestions are about the quoted message.\nOutput the suggested text only. Do not output anything else. Do not surround output with quotation marks"
                    ),
                    ChatMessage(
                        role = ChatRole.User,
                        content = userPrompt
                    ),


                    ),
            )
            //Log.v("CallAI", "Requesting suggestions with prompt: $userPrompt")
            val response = openAI.chatCompletion(
                request,
                RequestOptions(
                    headers = mapOf(
                        "HTTP-Referer" to "https://coreply.app",
                        "X-Title" to "Coreply: Autocomplete for Texting"
                    )
                )
            )
            //Log.v("CallAI", "Response: ${response.choices.first().message.content?.trim()}")
            return response.choices.first().message.content?.trim() ?: ""
        }

    }
}