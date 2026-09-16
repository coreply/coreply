package app.coreply.coreplyapp.data

import android.content.Context
import kotlin.math.max
import org.asyncstorage.shared_storage.Entry as SharedEntry
import org.asyncstorage.shared_storage.SharedStorage
import org.asyncstorage.storage.StorageRegistry
import org.json.JSONArray
import org.json.JSONObject

class ExpoTroubleshootingStorage(context: Context) {
    companion object {
        private const val STORAGE_NAME = "coreply.troubleshooting"
        private const val SUGGESTION_FETCH_LOGS_KEY = "suggestionFetchLogs"
        private const val MAX_LOG_COUNT = 10
    }

    private val storage: SharedStorage =
        StorageRegistry.getStorage(context, STORAGE_NAME)

    suspend fun appendSuggestionFetchLog(log: JSONObject) {
        val existingLogs = storage.getValues(listOf(SUGGESTION_FETCH_LOGS_KEY))
            .firstOrNull()
            ?.value
            ?.let(::parseLogs)
            ?: JSONArray()
        existingLogs.put(log)

        val trimmedLogs = JSONArray()
        val startIndex = max(0, existingLogs.length() - MAX_LOG_COUNT)
        for (index in startIndex until existingLogs.length()) {
            trimmedLogs.put(existingLogs.getJSONObject(index))
        }

        storage.setValues(
            listOf(
                SharedEntry(SUGGESTION_FETCH_LOGS_KEY, trimmedLogs.toString()),
            ),
        )
    }

    private fun parseLogs(value: String): JSONArray? {
        return runCatching { JSONArray(value) }.getOrNull()
    }
}
