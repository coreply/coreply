package app.coreply.coreplyapp.data

import android.content.Context
import org.asyncstorage.shared_storage.Entry as SharedEntry
import org.asyncstorage.shared_storage.SharedStorage
import org.asyncstorage.storage.StorageRegistry
import org.json.JSONArray
import org.json.JSONObject
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class CoreplyStorageManager(context: Context) {
	companion object {
		private const val COREPLY_SETTINGS_STORAGE_NAME = "coreply.settings"
		private const val SELECTED_APPS_STORAGE_KEY = "selectedApps"
		private const val PROFILES_STORAGE_KEY = "profiles"
		private const val LOGS_STORAGE_NAME = "coreply.troubleshooting"
		private const val LOGS_STORAGE_KEY = "suggestionFetchLogs"
		private const val MAX_LOG_COUNT = 10
	}

	private val coreSettingsStorage: SharedStorage =
		StorageRegistry.getStorage(context, COREPLY_SETTINGS_STORAGE_NAME)
	private val logsStorage: SharedStorage = StorageRegistry.getStorage(context, LOGS_STORAGE_NAME)
	private val logMutex = Mutex()

	suspend fun hasExistingCoreSettings(): Boolean {
		val values = getCoreValues("providerId", "globalSettings")
		return !values["providerId"].isNullOrBlank() || !values["globalSettings"].isNullOrBlank()
	}

	suspend fun hasExistingSelectedApps(): Boolean {
		return !getCoreValues(SELECTED_APPS_STORAGE_KEY)[SELECTED_APPS_STORAGE_KEY].isNullOrBlank()
	}

	suspend fun saveCoreSettings(
		providerId: String,
		providerConfig: JSONObject,
		globalSettings: JSONObject,
	) {
		coreSettingsStorage.setValues(
			listOf(
				SharedEntry("providerId", providerId),
				SharedEntry("$providerId.providerConfig", providerConfig.toString()),
				SharedEntry("globalSettings", globalSettings.toString()),
			),
		)
	}

	suspend fun saveSelectedApps(selectedApps: Set<String>) {
		coreSettingsStorage.setValues(
			listOf(
				SharedEntry(
					SELECTED_APPS_STORAGE_KEY,
					JSONArray(selectedApps.sorted()).toString(),
				),
			),
		)
	}

	suspend fun getStoredCoreplySettings(): JSONObject? {
		val providerId = getCoreValues("providerId")["providerId"]?.takeUnless {
			it.isBlank()
		} ?: return null
		val values = getCoreValues(
			"globalSettings",
			SELECTED_APPS_STORAGE_KEY,
			PROFILES_STORAGE_KEY,
		)
		val globalSettings = parseJsonObject(values["globalSettings"]) ?: return null
		val selectedApps = parseJsonArray(values[SELECTED_APPS_STORAGE_KEY]) ?: JSONArray()
		val profiles = parseJsonArray(values[PROFILES_STORAGE_KEY]) ?: JSONArray()
		val providerIds = mutableSetOf(providerId)
		for (index in 0 until profiles.length()) {
			val profileProviderId = profiles.optJSONObject(index)?.optString("providerId")
			if (!profileProviderId.isNullOrBlank() && profileProviderId != "null") providerIds.add(profileProviderId)
		}
		val configValues = getCoreValues(*providerIds.map { "$it.providerConfig" }.toTypedArray())
		val providerConfigs = JSONObject()
		for (id in providerIds) {
			providerConfigs.put(id, parseJsonObject(configValues["$id.providerConfig"]) ?: JSONObject())
		}

		return JSONObject().apply {
			put("providerId", providerId)
			put("providerConfigs", providerConfigs)
			put("globalSettings", globalSettings)
			put("selectedApps", selectedApps)
			put("profiles", profiles)
		}
	}

	suspend fun appendSuggestionFetchLog(log: JSONObject) = logMutex.withLock {
		val value = logsStorage.getValues(listOf(LOGS_STORAGE_KEY)).firstOrNull()?.value
		val logs = parseJsonArray(value) ?: JSONArray()
		logs.put(log)
		val trimmed = JSONArray()
		for (index in maxOf(0, logs.length() - MAX_LOG_COUNT) until logs.length()) {
			trimmed.put(logs.getJSONObject(index))
		}
		logsStorage.setValues(listOf(SharedEntry(LOGS_STORAGE_KEY, trimmed.toString())))
	}

	private suspend fun getCoreValues(vararg keys: String): Map<String, String?> {
		return coreSettingsStorage.getValues(keys.toList()).associate { entry -> entry.key to entry.value }
	}

	private fun parseJsonObject(value: String?): JSONObject? {
		if (value.isNullOrBlank()) {
			return null
		}

		return runCatching { JSONObject(value) }.getOrNull()
	}

	private fun parseJsonArray(value: String?): JSONArray? {
		if (value.isNullOrBlank()) {
			return null
		}

		return runCatching { JSONArray(value) }.getOrNull()
	}
}
