package app.coreply.coreplyapp.suggestions

import app.coreply.coreplyapp.utils.SuggestionUpdateListener
import java.util.concurrent.ConcurrentHashMap
import kotlin.text.startsWith
import kotlin.text.substring

class SuggestionStorage(var listener: SuggestionUpdateListener) {
    private val _suggestionHistory = ConcurrentHashMap<String, String>()
    private val PUNCTUATIONS = listOf(
        "!", "\"", ")", ",", ".", ":",
        ";", "?", "]", "~", "，", "。", "：", "；", "？", "）", "】", "！", "、", "」",
    )
    private val PUNCTUATIONS_REGEX = "(?=[!\")\\],.:;?~，。：；？）】！、」])".toRegex()

    fun splitAndKeepPunctuations(text: String): List<String> {
        val parts = text.split(PUNCTUATIONS_REGEX).filter { it.isNotEmpty() }

        if (parts.size < 2) return parts

        // Check if the last part is just punctuation
        else {
            val lastPart = parts.last()
            if (lastPart.length == 1 && PUNCTUATIONS.contains(lastPart)) {
                // Merge the last punctuation with the second-to-last part
                val modifiedParts = parts.dropLast(2).toMutableList()
                modifiedParts.add(parts[parts.size - 2] + lastPart)
                return modifiedParts
            }
        }
        return parts
    }


    // Remove all punctuations from the text, remove whitespaces, and lower all characters
    fun getKeyFromText(text: String): String {
        var key = text.trim()
        for (punctuation in PUNCTUATIONS) {
            key = key.replace(punctuation, "")
        }
        key = key.replace(" ", "")
        key = key.lowercase()
        if (!text.isBlank() && PUNCTUATIONS.contains(text.last().toString())) {
            key += "-"

        }
        return key
    }

    fun String.replaceWhiteSpaces(): String {
        return this.replace("\\s+".toRegex(), " ")
    }

    fun String?.removeMessageISent(): String {
        //Log.v("CallAI", "Response: $this")
        if (this == null) return ""
        else if (this.startsWith("Message I sent: ")) {
            return this.substring("Message I sent: ".length)
        } else if (this.startsWith("Message I received: ")) {
            return this.substring("Message I received: ".length)
        }
        return this
    }

    fun getSuggestion(toBeCompleted: String): String? {
        if (toBeCompleted.isBlank()) {
            if (_suggestionHistory.containsKey("")) {
                return _suggestionHistory[""]!!
            }
        }
        for (i in 0..toBeCompleted.length) {
            val target: String = getKeyFromText(toBeCompleted.substring(0, i))
            if (_suggestionHistory.containsKey(target)) {
                val starting = toBeCompleted.substring(i)
                val suggestion = _suggestionHistory[target]!!
                if (starting.isEmpty() || (suggestion.startsWith(starting) &&
                            suggestion.length > starting.length)
                ) {
                    return suggestion.substring(starting.length)
                }
            }
        }
        return null;
    }

    fun clearSuggestion() {
        _suggestionHistory.clear()
    }

    fun setSuggestionUpdateListener(listener: SuggestionUpdateListener) {
        this.listener = listener
    }

    fun addSuggestionWithoutReplacement(key: String, suggestion: String) {
        if (!_suggestionHistory.containsKey(key)) {
            _suggestionHistory[key] = suggestion
        }
    }

    fun updateSuggestion(typingInfo: TypingInfo, newSuggestion: String) {
        if (newSuggestion.replaceWhiteSpaces().removeMessageISent().lowercase()
                .startsWith(
                    typingInfo.currentTyping.replaceWhiteSpaces().removeMessageISent().lowercase()
                )
        ) {
            val frontTrimmedSuggestion = newSuggestion.replaceWhiteSpaces().removeMessageISent()
                .substring(
                    typingInfo.currentTyping.replaceWhiteSpaces().removeMessageISent().length
                )
            val splittedText = splitAndKeepPunctuations(frontTrimmedSuggestion)
//            Log.v("CallAI", "Splitted text: $splittedText")
            for (i in 0..splittedText.size - 2) {
//                Log.v("CallAI", getKeyFromText(typingInfo.currentTyping + splittedText.subList(0, i + 1).joinToString("")))
                addSuggestionWithoutReplacement(
                    getKeyFromText(
                        typingInfo.currentTyping + splittedText.subList(
                            0,
                            i + 1
                        ).joinToString("")
                    ), splittedText[i + 1]
                )
            }
            addSuggestionWithoutReplacement(
                getKeyFromText(typingInfo.currentTyping),
                if (splittedText.isNotEmpty()) splittedText[0] else ""
            )
            listener.onSuggestionUpdated()
        }
    }
}