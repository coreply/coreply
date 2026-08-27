package app.coreply.coreplyapp.suggestions

import app.coreply.coreplyapp.utils.SuggestionUpdateListener

class SuggestionStorage(var listener: SuggestionUpdateListener? = null) {
    private var fullSuggestion: String? = null

    fun addSuggestion(fullSuggestion: String): Boolean {
        val candidate = fullSuggestion.trimEnd()
        if (candidate.isBlank() || candidate == this.fullSuggestion) {
            return false
        }
        this.fullSuggestion = candidate
        return true
    }

    fun getSuggestion(currentTyping: String): String? {
        val suggestion = fullSuggestion ?: return null
        if (suggestion.startsWith(currentTyping) && suggestion.length > currentTyping.length) {
            return suggestion.substring(currentTyping.length)
        }
        fullSuggestion = null
        return null
    }

    fun clear() {
        fullSuggestion = null
    }

    fun clearSuggestion() {
        clear()
    }

    fun setSuggestionUpdateListener(listener: SuggestionUpdateListener) {
        this.listener = listener
    }

    fun updateSuggestion(typingInfo: TypingInfo, newSuggestion: String) {
        if (newSuggestion.startsWith(typingInfo.currentTyping) && addSuggestion(newSuggestion)) {
            listener?.onSuggestionUpdated()
        }
    }
}
