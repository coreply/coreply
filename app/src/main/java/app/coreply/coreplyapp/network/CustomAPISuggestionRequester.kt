package app.coreply.coreplyapp.network

import app.coreply.coreplyapp.data.PreferencesManager
import com.aallam.openai.api.chat.ChatCompletionRequest
import com.aallam.openai.api.chat.ChatMessage
import com.aallam.openai.api.chat.ChatRole
import com.aallam.openai.api.core.RequestOptions
import com.aallam.openai.api.model.ModelId
import com.aallam.openai.client.OpenAI
import com.aallam.openai.client.OpenAIConfig
import com.aallam.openai.client.OpenAIHost

object CustomAPISuggestionRequester : SuggestionRequester {
    override suspend fun requestSuggestionsFromServer(
        typingInfo: TypingInfo, preferencesManager: PreferencesManager
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
            // Headers for Openrouter
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