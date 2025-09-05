package app.coreply.coreplyapp.utils

import com.aallam.openai.api.chat.ChatRole


class ChatMessage {
    // Contains properties: sender, message, timestr and override the toString method
    var sender: String = ""
    var message: String = ""
    var timestr: String = ""

    // Constructor for ChatMessage
    constructor(sender: String, message: String, timestr: String) {
        this.sender = sender
        this.message = message
        this.timestr = timestr
    }

    fun getRole(): ChatRole {
        return if (sender == "Me") ChatRole.Assistant else ChatRole.User
    }

    override fun toString(): String {
        return "$sender:$message"
    }

    fun toCoreply2String(): String {
        var str = ""
        if (sender == "Me") {
            str += "Message I sent:\n"
        } else {
            str += "Message I received:\n"
        }
        str += message + "\n"
        return str
    }

    fun toFIMString(): String {
        var str = ""
        if (sender == "Me") {
            str += "send_message(\""
        } else {
            str += "mock_received(\""
        }
        str += message + "\")\n"
        return str
    }

    override fun equals(other: Any?): Boolean {
        return (other is ChatMessage) && (other.sender == sender) && (other.message == message) && (other.timestr == timestr)
    }
}