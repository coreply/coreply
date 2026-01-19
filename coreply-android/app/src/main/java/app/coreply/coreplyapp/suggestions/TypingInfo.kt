package app.coreply.coreplyapp.suggestions

import app.coreply.coreplyapp.utils.ChatContents

data class TypingInfo(val pastMessages: ChatContents, val currentTyping: String) {
    val currentTypingTrimmed =
        currentTyping.substring(0, currentTyping.length - currentTyping.split(" ").last().length)
            .trimEnd()
}