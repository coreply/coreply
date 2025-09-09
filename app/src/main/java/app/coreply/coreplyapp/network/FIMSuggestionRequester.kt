package app.coreply.coreplyapp.network

import app.coreply.coreplyapp.data.PreferencesManager
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody

object FIMSuggestionRequester : SuggestionRequester {
    override suspend fun requestSuggestionsFromServer(
        typingInfo: TypingInfo, preferencesManager: PreferencesManager
    ): String {
        var baseUrl = preferencesManager.customApiUrlState.value
        if (!baseUrl.endsWith("/")) {
            baseUrl += "/"
        }
        val modelName = preferencesManager.customModelNameState.value

        val userPrompt =
            "# Mocking a texting conversation. Messages never repeat. send_message() sends a message. mock_received() means receiving a message from others.\n# Start of Chat History\n" +
                    typingInfo.pastMessages.getFIMFormat() + "\n" +
                    "# Craft a new text\nsend_message(\"" + typingInfo.currentTyping.replace(
                "\\s+".toRegex(),
                " "
            )

        val client = okhttp3.OkHttpClient()
        val mediaType = "application/json".toMediaTypeOrNull()
        val requestBody = org.json.JSONObject().apply {
            put("model", modelName)
            put("temperature", preferencesManager.temperatureState.value.toDouble())
            put("top_p", preferencesManager.topPState.value.toDouble())
            put("max_tokens", 100)
            put("stream", false)
            put("stop", "\")")
            put("suffix", "\")")
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

    }
}