/**
 * coreply
 *
 * Copyright (C) 2024 coreply
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

package app.coreply.coreplyapp.ui

import android.icu.text.BreakIterator
import java.util.Locale

/**
 * Represents the type of content displayed in the overlay
 */
enum class OverlayContentType {
    SUGGESTION,
    ERROR
}

/**
 * Represents content to be displayed in the overlay
 * with pre-tokenized text and type information
 */
sealed class OverlayContent {
    abstract val fullText: String
    abstract val tokens: List<String>
    abstract val type: OverlayContentType

    /**
     * Get the first token for short insertion
     */
    fun getFirstToken(): String {
        return if (tokens.isNotEmpty()) {
            var firstToken = tokens[0]
            if (firstToken.isBlank() && tokens.size > 1) {
                firstToken += tokens[1]
            }
            firstToken
        } else {
            ""
        }
    }

    /**
     * Suggestion content with pre-tokenized text
     */
    data class Suggestion(
        override val fullText: String,
        override val tokens: List<String>
    ) : OverlayContent() {
        override val type = OverlayContentType.SUGGESTION

        companion object {
            /**
             * Create a suggestion with automatic tokenization
             */
            fun create(text: String): Suggestion {
                return Suggestion(
                    fullText = text,
                    tokens = TokenizerUtil.tokenizeText(text.trimEnd())
                )
            }
        }
    }

    /**
     * Error content (typically not tokenized as it's displayed as-is)
     */
    data class Error(
        override val fullText: String,
        val errorCode: String? = null
    ) : OverlayContent() {
        override val tokens = listOf(fullText)
        override val type = OverlayContentType.ERROR
    }

    companion object {
        /**
         * Empty content when there's nothing to display
         */
        val Empty = Suggestion("", emptyList())
    }
}

/**
 * Utility for tokenizing text consistently across the app
 */
object TokenizerUtil {
    private val PUNCTUATIONS = listOf(
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

