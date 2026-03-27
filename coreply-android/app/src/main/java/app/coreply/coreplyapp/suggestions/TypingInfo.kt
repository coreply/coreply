package app.coreply.coreplyapp.suggestions

import app.coreply.coreplyapp.utils.ChatContents
import app.coreply.coreplyapp.utils.TokenizerUtil
import app.coreply.coreplyapp.utils.toTemplateMap

data class TypingInfo(val pastMessages: ChatContents, val currentTyping: String, val pkgName: String = "") {
    private val tokens: List<String> = TokenizerUtil.tokenizeText(currentTyping)

    val currentTypingEndsWithSeparator: Boolean
        get() {
            if (currentTyping.isEmpty()) return false
            val lastChar = currentTyping.last().toString()
            return lastChar == " " || TokenizerUtil.PUNCTUATIONS.contains(lastChar)
        }

    val currentTypingLastToken: String
        get() = tokens.lastOrNull().orEmpty()

    val currentTypingTrimmed: String
        get() = if (tokens.isNotEmpty()) {
            tokens.dropLast(1).joinToString("")
        } else {
            ""
        }

    /**
     * Unified context map for both request body templates and suggestion templates.
     * String fields are maps with raw/jsonEscaped/regexLiteral/regexLiteralEscaped variants.
     *
     * For request body templates (JSON), use: {{currentTyping.jsonEscaped}}
     * For suggestion templates (raw text), use: {{currentTyping.raw}}
     *
     * The "assistantMessage" field should be added by the caller for suggestion templates.
     */
    val contextMap: Map<String, Any?>
        get() {
            val baseMap = mutableMapOf<String, Any?>(
                "pastMessages" to pastMessages.getMessageMapList(),
                "currentTyping" to currentTyping.toTemplateMap(),
                "currentTypingTrimmed" to currentTypingTrimmed.toTemplateMap(),
                "currentTypingLastToken" to currentTypingLastToken.toTemplateMap(),
                "currentTypingEndsWithSeparator" to currentTypingEndsWithSeparator,
                "pkgName" to pkgName.toTemplateMap()
            )

            // Add a dynamic field with dots replaced by underscores, set to true
            if (pkgName.isNotEmpty()) {
                val pkgNameKey = pkgName.replace(".", "_")
                baseMap[pkgNameKey] = true
            }

            return baseMap
        }
}