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

import app.coreply.coreplyapp.utils.TokenizerUtil

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


