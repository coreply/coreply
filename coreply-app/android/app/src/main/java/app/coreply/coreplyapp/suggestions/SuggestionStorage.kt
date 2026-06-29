package app.coreply.coreplyapp.suggestions

import app.coreply.coreplyapp.utils.SuggestionUpdateListener
import java.util.concurrent.CopyOnWriteArrayList

class SuggestionStorage(var listener: SuggestionUpdateListener? = null) {
    private val suggestions = CopyOnWriteArrayList<String>()

    fun addSuggestion(fullSuggestion: String): Boolean {
        val candidate = fullSuggestion.trimEnd()
        if (candidate.isBlank() || suggestions.contains(candidate)) {
            return false
        }
        suggestions.add(candidate)
        return true
    }

    fun getSuggestion(currentTyping: String): String? {
        for (suggestion in suggestions) {
            if (suggestion.startsWith(currentTyping) && suggestion.length > currentTyping.length) {
                return suggestion.substring(currentTyping.length)
            }
        }
        return null
    }

    fun clear() {
        suggestions.clear()
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
