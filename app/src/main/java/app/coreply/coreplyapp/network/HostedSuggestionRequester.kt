package app.coreply.coreplyapp.network

import app.coreply.coreplyapp.data.PreferencesManager
import app.coreply.coreplyapp.utils.ChatMessage
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

object RequestObject {
    fun getCompletionJsonString(typing: String, pastMessages: List<ChatMessage>): String {
        val jsonObject = JSONObject()
        jsonObject.put("typing", typing)
        jsonObject.put("action", "completion")

        val messagesArray = JSONArray()
        for (message in pastMessages) {
            val messageObject = JSONObject()
            messageObject.put("role", if (message.sender == "Me") "sent" else "received")
            messageObject.put("content", message.message)
            messagesArray.put(messageObject)
        }

        jsonObject.put("messages", messagesArray)
        return jsonObject.toString()
    }
}

object HostedSuggestionRequester : SuggestionRequester {
    val endpoint = "https://coreply.p.nadles.com/completion/"
    val client = okhttp3.OkHttpClient.Builder().build()

    override suspend fun requestSuggestionsFromServer(
        typingInfo: TypingInfo,
        preferencesManager: PreferencesManager
    ): String {
        val requestBody = RequestObject.getCompletionJsonString(
            typingInfo.currentTyping.replace(
                "\\s+".toRegex(),
                " "
            ), typingInfo.pastMessages.chatContents
        )

        val request = Request.Builder()
            .url(endpoint)
            .post(requestBody.toRequestBody("application/json".toMediaType()))
            .header(
                "Authorization",
                "Bearer ${preferencesManager.hostedApiKeyState.value}"
            )
            .build()
        client.newCall(request).execute().use { response ->
            val responseBody = response.body?.string()
            if (responseBody != null) {
                val jsonObject = JSONObject(responseBody)
                val completion = jsonObject.getString("completion")
                return (if (typingInfo.currentTypingTrimmed.endsWith(" ")) (completion
                    ?: "").trimEnd().trimEnd('>').trim() else (completion
                    ?: "").trimEnd().trimEnd('>').trimEnd())
            }
        }
        return ""
    }
}