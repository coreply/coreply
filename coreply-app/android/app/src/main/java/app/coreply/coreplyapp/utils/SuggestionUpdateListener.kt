package app.coreply.coreplyapp.utils

import app.coreply.coreplyapp.suggestions.TypingInfo

interface SuggestionUpdateListener {
    fun onSuggestionUpdated()
    fun onSuggestionError(typingInfo: TypingInfo, errorMessage: String)
}