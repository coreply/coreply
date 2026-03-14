package app.coreply.coreplyapp.utils

import org.json.JSONObject

/**
 * Extension function to JSON escape a string.
 * Uses JSONObject.quote() which is well-tested, then strips the outer quotes.
 */
fun String.jsonEscape(): String {
    // Use JSONObject.quote() which is well-tested, then strip the outer quotes
    val quoted = JSONObject.quote(this)
    return quoted.substring(1, quoted.length - 1)
}

/**
 * Convert a string to a template map with multiple escape variants.
 * Returns null if the string is empty.
 *
 * The map contains:
 * - "raw": the original unescaped string
 * - "jsonEscaped": JSON-escaped string (for embedding in JSON)
 * - "regexEscaped": regex-escaped string (for use in regex patterns)
 * - "regexJsonEscaped": first regex-escaped, then JSON-escaped
 */
fun String.toTemplateMap(): Map<String, String>? {
    if (isEmpty()) {
        return null
    }
    val regexEscaped = Regex.escape(this)
    return mapOf(
        "raw" to this,
        "jsonEscaped" to this.jsonEscape(),
        "regexEscaped" to regexEscaped,
        "regexJsonEscaped" to regexEscaped.jsonEscape()
    )
}
