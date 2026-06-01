package app.coreply.coreplyapp.utils

import android.icu.text.BreakIterator
import java.util.Locale

/**
 * Utility for tokenizing text consistently across the app
 */
object TokenizerUtil {
    val PUNCTUATIONS = listOf(
        "!", "\"", ")", ",", ".", ":",
        ";", "?", "]", "~", "，", "。", "：", "；", "？", "）", "】", "！", "、", "」",
    )

    /**
     * Tokenize text using BreakIterator and merge trailing punctuation
     */
    fun tokenizeText(input: String): List<String> {
        if (input.isBlank()) return emptyList()

        val breakIterator = BreakIterator.getWordInstance(Locale.ROOT)
        breakIterator.setText(input)
        val tokens = mutableListOf<String>()
        var start = breakIterator.first()
        var end = breakIterator.next()

        while (end != BreakIterator.DONE) {
            val word = input.substring(start, end)
            if (word.isNotEmpty()) {
                tokens.add(word)
            }
            start = end
            end = breakIterator.next()
        }

        // Merge trailing punctuation with previous token
        if (tokens.isNotEmpty()) {
            val lastToken = tokens.last()
            if (tokens.size >= 2 && lastToken.length == 1 && PUNCTUATIONS.contains(lastToken)) {
                tokens.removeAt(tokens.size - 1)
                tokens[tokens.size - 1] = tokens[tokens.size - 1] + lastToken
            }
        }

        return tokens
    }
}


