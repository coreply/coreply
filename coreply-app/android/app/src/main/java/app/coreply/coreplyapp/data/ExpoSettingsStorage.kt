package app.coreply.coreplyapp.data

import android.content.Context
import org.asyncstorage.shared_storage.Entry as SharedEntry
import org.asyncstorage.shared_storage.SharedStorage
import org.asyncstorage.storage.StorageRegistry
import org.json.JSONArray
import org.json.JSONObject

class ExpoSettingsStorage(context: Context) {
	companion object {
		private const val COREPLY_SETTINGS_STORAGE_NAME = "coreply.settings"
		private const val SELECTED_APPS_STORAGE_KEY = "selectedApps"
	}

	private val coreSettingsStorage: SharedStorage =
		StorageRegistry.getStorage(context, COREPLY_SETTINGS_STORAGE_NAME)

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
			"$providerId.providerConfig",
			"globalSettings",
			SELECTED_APPS_STORAGE_KEY,
		)
		val globalSettings = parseJsonObject(values["globalSettings"]) ?: return null
		val selectedApps = parseJsonArray(values[SELECTED_APPS_STORAGE_KEY]) ?: JSONArray()

		return JSONObject().apply {
			put("providerId", providerId)
			put(
				"providerConfig",
				parseJsonObject(values["$providerId.providerConfig"]) ?: JSONObject(),
			)
			put("globalSettings", globalSettings)
			put("selectedApps", selectedApps)
		}
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
