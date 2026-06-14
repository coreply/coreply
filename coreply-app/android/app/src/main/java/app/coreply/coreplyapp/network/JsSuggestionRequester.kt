package app.coreply.coreplyapp.network

import android.webkit.WebView
import app.coreply.coreplyapp.data.PreferencesManager
import app.coreply.coreplyapp.suggestions.TypingInfo
import java.lang.ref.WeakReference

object JsSuggestionRequester : SuggestionRequester {
    private val _webView: WeakReference<WebView>? = null
    override suspend fun requestSuggestionsFromServer(
        typingInfo: TypingInfo,
        preferencesManager: PreferencesManager
    ): String {
         return ""
    }

}