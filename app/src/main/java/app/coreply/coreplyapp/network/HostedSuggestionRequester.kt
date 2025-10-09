package app.coreply.coreplyapp.network

import android.util.Log
import app.coreply.coreplyapp.data.PreferencesManager
import app.coreply.coreplyapp.utils.ChatMessage
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.util.concurrent.TimeUnit

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
    val client = okhttp3.OkHttpClient.Builder().connectTimeout(30, TimeUnit.SECONDS).readTimeout(30,
        TimeUnit.SECONDS).writeTimeout(30, TimeUnit.SECONDS).build()

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
//        Log.v("HostedSuggestionRequester", "Request: $request")
        client.newCall(request).execute().use { response ->
            val responseBody = response.body?.string()
//            Log.v("HostedSuggestionRequester", "Response: $responseBody")
            if (responseBody != null) {
                try {
                    val jsonObject = JSONObject(responseBody)
                    val completion = jsonObject.getString("completion")
                    return (if (typingInfo.currentTypingTrimmed.endsWith(" ")) (completion
                        ?: "").trimEnd().trimEnd('>').trim() else (completion
                        ?: "").trimEnd().trimEnd('>').trimEnd())
                } catch (e: JSONException){
                    val jsonObject = JSONObject(responseBody)
                    val message = jsonObject.getString("message")
                    throw Exception(message)
                }
            }
        }
        return ""
    }
}