package app.coreply.coreplyapp.utils

import android.util.Log
import app.coreply.coreplyapp.network.TypingInfo


class ChatContents {
    // Contains a list of ChatMessage objects
    var chatContents: MutableList<ChatMessage> = mutableListOf()

    // Add a ChatMessage object to the list
    fun addChatMessage(chatMessage: ChatMessage) {
        chatContents.add(chatMessage)
    }

    fun clear(){
        chatContents.clear()
    }

    // compare the chatContents list with another ChatContents list and combine them if they have ChatMessage objects in common
    // Returns a boolean, true if needs new suggestions
    fun combineChatContents(other: MutableList<ChatMessage>): Boolean {
        if (chatContents.size == 0 || other.size == 0) {
            chatContents = other
            return true
        } else if (chatContents == other) (
            return false
        )
        else {
            // Append new messages to the chatContents list
            if (other[0] in chatContents) {
                val clearCurrentSuggestions = other.last().sender == "Me" && chatContents.last() == other[other.size-2]
                for (i in other) {
                    if (i !in chatContents) {
                        chatContents.add(i)
                    }
                }
                return clearCurrentSuggestions
            } else if (chatContents[0] in other) {
                // Insert new messages to the top of chatContents list
                for (i in chatContents) {
                    if (i !in other) {
                        other.add(i)
                    }
                }
                chatContents = other
                return false
            } else {
                chatContents = other
                return false
            }
        }
    }

    fun getOpenAIFormat(): MutableList<com.aallam.openai.api.chat.ChatMessage> {
        Log.v("ChatContents", chatContents.toString())
        return chatContents.map {
            com.aallam.openai.api.chat.ChatMessage(
                role = it.getRole(),
                content = it.message
            )
        }.toMutableList()
    }

    fun getCoreplyFormat(typingInfo: TypingInfo): MutableList<com.aallam.openai.api.chat.ChatMessage> {
        var msgBlock: String = ">>"
        val msgList: MutableList<com.aallam.openai.api.chat.ChatMessage> = mutableListOf()
        for (i in 0..chatContents.size - 1) {
            msgBlock += chatContents[i].message + "\n>>"
            if (i == chatContents.size - 1) {
                if (chatContents[i].sender == "Me") {
                    if (!typingInfo.currentTyping.isBlank()) {
                        msgBlock = msgBlock.substring(0, msgBlock.length - 2)
                        msgBlock += "// Next line is a message starting with: ${typingInfo.currentTyping}\n>>"
                    }
                    msgBlock += typingInfo.currentTypingTrimmed
                    msgList.add(
                        com.aallam.openai.api.chat.ChatMessage(
                            role = com.aallam.openai.api.chat.ChatRole.Assistant,
                            content = msgBlock
                        )
                    )
                } else {
                    msgList.add(
                        com.aallam.openai.api.chat.ChatMessage(
                            role = com.aallam.openai.api.chat.ChatRole.User,
                            content = msgBlock
                        )
                    )
                    msgList.add(
                        com.aallam.openai.api.chat.ChatMessage(
                            role = com.aallam.openai.api.chat.ChatRole.Assistant,
                            content = if (!typingInfo.currentTyping.isBlank()) "// Next line is a message starting with: '${typingInfo.currentTyping}'\n>>${typingInfo.currentTypingTrimmed}" else ">>"
                        )
                    )
                }
                msgBlock = ">>"
            } else {
                if (chatContents[i].sender != chatContents[i + 1].sender) {
                    msgList.add(
                        com.aallam.openai.api.chat.ChatMessage(
                            role = chatContents[i].getRole(),
                            content = msgBlock
                        )
                    )
                    msgBlock = ">>"
                }
            }
        }
        return msgList
    }

    fun getCoreply2Format(): String{
        var msgBlock: String = ""
        for (msg in chatContents.takeLast(20)) {
            msgBlock += msg.toCoreply2String()
        }
        return msgBlock
    }

    fun getFIMFormat(): String{
        var msgBlock: String = ""
        for (msg in chatContents.takeLast(20)) {
            msgBlock += msg.toFIMString()
        }
        return msgBlock
    }

    override fun toString(): String {
        var str = ""
        for (i in chatContents) {
            str += i.toString() + "\n"
        }
        return str
    }

}