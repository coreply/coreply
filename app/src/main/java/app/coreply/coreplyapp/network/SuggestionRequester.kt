package app.coreply.coreplyapp.network

import app.coreply.coreplyapp.data.PreferencesManager
import app.coreply.coreplyapp.suggestions.TypingInfo

interface SuggestionRequester {
    suspend fun requestSuggestionsFromServer(typingInfo: TypingInfo, preferencesManager: PreferencesManager): String
}