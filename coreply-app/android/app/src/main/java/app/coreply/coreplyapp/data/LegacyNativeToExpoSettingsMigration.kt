package app.coreply.coreplyapp.data

import android.content.Context
import org.asyncstorage.shared_storage.Entry
import org.asyncstorage.shared_storage.SharedStorage
import org.asyncstorage.storage.StorageRegistry
import org.json.JSONObject

class LegacyNativeToExpoSettingsMigration(context: Context) {
	companion object {
		private const val MIGRATION_STORAGE_NAME = "coreply.migrations"
		private const val MIGRATION_DONE_KEY = "legacy_native_to_expo_v1_done"
	}

	private val preferencesManager = PreferencesManager.getInstance(context)
	private val expoSettingsStorage = ExpoSettingsStorage(context)
	private val migrationStorage: SharedStorage =
		StorageRegistry.getStorage(context, MIGRATION_STORAGE_NAME)

	suspend fun migrateIfNeeded() {
		if (isMigrationDone()) {
			return
		}

		val hasExistingCoreSettings = expoSettingsStorage.hasExistingCoreSettings()
		val hasExistingSelectedApps = expoSettingsStorage.hasExistingSelectedApps()

		if (hasExistingCoreSettings && hasExistingSelectedApps) {
			markMigrationDone()
			return
		}

		preferencesManager.loadPreferences()

		if (!hasExistingCoreSettings) {
			val providerId = resolveProviderId()
			expoSettingsStorage.saveCoreSettings(
				providerId = providerId,
				providerSettings = buildProviderSettings(providerId),
				generationSettings = buildGenerationSettings(providerId),
				globalSettings = buildGlobalSettings(),
			)
		}

		if (!hasExistingSelectedApps) {
			expoSettingsStorage.saveSelectedApps(preferencesManager.selectedAppsState.value)
		}

		markMigrationDone()
	}

	private fun resolveProviderId(): String {
		val configType = preferencesManager.configTypeState.value
		val customApiUrl = preferencesManager.customApiUrlState.value

		return when {
			configType == "advanced" -> "advanced"
			customApiUrl.endsWith("/fim") || customApiUrl.endsWith("/fim/") -> "fim"
			else -> "openaiCompatible"
		}
	}

	private fun buildProviderSettings(providerId: String): JSONObject {
		return JSONObject().apply {
			when (providerId) {
				"advanced" -> {
					put("requestUrl", preferencesManager.customApiUrlState.value)
					put("authorizationBearer", preferencesManager.customApiKeyState.value)
				}

				"fim", "openaiCompatible" -> {
					put("baseURL", preferencesManager.customApiUrlState.value)
					put("apiKey", preferencesManager.customApiKeyState.value)
				}
			}
		}
	}

	private fun buildGenerationSettings(providerId: String): JSONObject {
		return JSONObject().apply {
			when (providerId) {
				"advanced" -> {
					put("bodyTemplate", preferencesManager.advancedConfigBodyState.value)
					put(
						"suggestionTemplate",
						preferencesManager.suggestionContentTemplateState.value,
					)
				}

				"fim" -> {
					put("model", preferencesManager.customModelNameState.value)
					put("temperature", preferencesManager.temperatureState.value.toDouble())
				}

				else -> {
					put("model", preferencesManager.customModelNameState.value)
					put("system", preferencesManager.customSystemPromptState.value)
					put("temperature", preferencesManager.temperatureState.value.toDouble())
					put("topP", preferencesManager.topPState.value.toDouble())
				}
			}
		}
	}

	private fun buildGlobalSettings(): JSONObject {
		return JSONObject().apply {
			put("showErrors", preferencesManager.showErrorsState.value)
			put("typingRegexEnabled", preferencesManager.typingRegexEnabledState.value)
			put("typingRegexPattern", preferencesManager.typingRegexPatternState.value)
			put("debounceMs", preferencesManager.customDebounceState.value)
			put(
				"suggestionPresentationType",
				mapSuggestionPresentationType(preferencesManager.suggestionPresentationTypeState.value),
			)
		}
	}

	private fun mapSuggestionPresentationType(type: SuggestionPresentationType): String {
		return when (type) {
			SuggestionPresentationType.BUBBLE -> "overlay"
			SuggestionPresentationType.INLINE -> "inline"
			SuggestionPresentationType.BOTH -> "both"
		}
	}

	private suspend fun isMigrationDone(): Boolean {
		return migrationStorage.getValues(listOf(MIGRATION_DONE_KEY)).firstOrNull()?.value == "true"
	}

	private suspend fun markMigrationDone() {
		migrationStorage.setValues(listOf(Entry(MIGRATION_DONE_KEY, "true")))
	}
}