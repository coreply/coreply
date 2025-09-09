package app.coreply.coreplyapp.network

import app.coreply.coreplyapp.data.PreferencesManager

interface SuggestionRequester {
    suspend fun requestSuggestionsFromServer(typingInfo: TypingInfo, preferencesManager: PreferencesManager): String
}