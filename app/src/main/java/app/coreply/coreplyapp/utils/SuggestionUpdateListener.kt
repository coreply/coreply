package app.coreply.coreplyapp.utils

import app.coreply.coreplyapp.network.TypingInfo

interface SuggestionUpdateListener {
    fun onSuggestionUpdated(typingInfo: TypingInfo,newSuggestion: String)
    fun onSuggestionError(typingInfo: TypingInfo, errorMessage: String)
}