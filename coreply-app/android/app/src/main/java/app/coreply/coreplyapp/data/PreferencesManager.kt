package app.coreply.coreplyapp.data

import android.content.Context
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import app.coreply.coreplyapp.applistener.SupportedApps
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import org.asyncstorage.shared_storage.Entry
import org.asyncstorage.shared_storage.SharedStorage
import org.asyncstorage.storage.StorageRegistry
import org.json.JSONArray


class PreferencesManager private constructor(context: Context) {
	companion object {
		@Volatile
		private var INSTANCE: PreferencesManager? = null

		fun getInstance(context: Context): PreferencesManager {
			return INSTANCE ?: synchronized(this) {
				val instance = PreferencesManager(context.applicationContext)
				INSTANCE = instance
				instance
			}
		}

		const val MASTER_SWITCH = "master_switch"
		const val API_TYPE = "api_type"
		const val PROVIDER_MODE = "provider_mode"
		const val PROVIDER_ID = "provider_id"
		const val CUSTOM_API_URL = "customApiUrl"
		const val CUSTOM_API_KEY = "customApiKey"
		const val CUSTOM_MODEL_NAME = "customModelName"
		const val CUSTOM_SYSTEM_PROMPT = "customSystemPrompt"
		const val TEMPERATURE = "temperature_float"
		const val TOP_P = "topp_float"
		const val SUGGESTION_PRESENTATION_TYPE = "suggestion_presentation_type"
		const val SHOW_ERRORS = "show_errors"
		const val SELECTED_APPS = "selected_apps_set"
		const val CONFIG_TYPE = "config_type"
		const val ADVANCED_CONFIG_BODY = "advanced_config_body"
		const val TYPING_REGEX_PATTERN = "typing_regex_pattern"
		const val TYPING_REGEX_ENABLED = "typing_regex_enabled"
		const val CUSTOM_DEBOUNCE_MS = "custom_debounce_ms"
		const val SUGGESTION_CONTENT_TEMPLATE = "suggestion_content_template"

		private const val DEFAULT_MASTER_SWITCH = true
		private const val DEFAULT_API_TYPE = "custom"
		private const val DEFAULT_PROVIDER_MODE = "simple"
		private const val DEFAULT_PROVIDER_ID = "openai-compatible"
		private const val DEFAULT_API_URL = "https://api.openai.com/v1/"
		private const val DEFAULT_API_KEY = ""
		private const val DEFAULT_MODEL_NAME = "gpt-4.1-mini"
		private const val DEFAULT_SYSTEM_PROMPT =
			"You are an AI texting assistant. You will be given a list of text messages between the user (indicated by 'Message I sent:'), and other people (indicated by their names or simply 'Message I received:'). You may also receive a screenshot of the conversation. Your job is to suggest the next message the user should send. Match the tone and style of the conversation. The user may request the message start or end with a certain prefix (both could be parts of a longer word) . The user may quote a specific message. In this case, make sure your suggestions are about the quoted message.\nOutput the suggested text only. Do not output anything else. Do not surround output with quotation marks"
		private const val DEFAULT_TEMPERATURE = 0.3f
		private val DEFAULT_SELECTED_APPS = SupportedApps.supportedApps.map { it.pkgName }.toSet()
		private const val DEFAULT_TOP_P = 1.0f
		private const val DEFAULT_SUGGESTION_PRESENTATION_TYPE = 2
		private const val DEFAULT_SHOW_ERRORS = true
		private const val DEFAULT_CONFIG_TYPE = "simple"
		private var DEFAULT_ADVANCED_CONFIG_BODY = """
			{
			  "model": "gpt-4o-mini",
			  "temperature": 0.7,
			  "top_p": 1.0,
			  "messages": [
			    {
			      "role": "system",
			      "content": "You are an AI texting assistant. Generate a suggested reply based on the conversation history and current typing. Output only the suggested text without quotation marks or extra formatting."
			    },
			    {
			      "role": "user",
			      "content": "Chat history:\n{{#pastMessages}}{{#messages}}{{#sent}}Me: {{/sent}}{{#received}}Them: {{/received}}{{content.jsonEscaped}}\n{{/messages}}{{/pastMessages}}{{#currentTyping}}Current typing: {{currentTyping.jsonEscaped}}{{/currentTyping}}{{^currentTyping}}Suggest a reply.{{/currentTyping}}"
			    }
			  ],
			  "max_tokens": 50,
			  "stream": false
			}
		""".trimIndent()
		private const val DEFAULT_TYPING_REGEX_PATTERN = "^.*[\\s.!?,;:]$"
		private const val DEFAULT_TYPING_REGEX_ENABLED = false
		private const val DEFAULT_CUSTOM_DEBOUNCE_MS = 350
		private const val DEFAULT_SUGGESTION_CONTENT_TEMPLATE = "{{assistantMessage}}"
	}

	private val storage: SharedStorage = StorageRegistry.getStorage(context, "coreply-preferences")

	val masterSwitchState: MutableState<Boolean> = mutableStateOf(DEFAULT_MASTER_SWITCH)
	private val _disableSelfRequests = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
	val disableSelfRequests: SharedFlow<Unit> = _disableSelfRequests.asSharedFlow()
	val apiTypeState: MutableState<String> = mutableStateOf(DEFAULT_API_TYPE)
	val providerModeState: MutableState<String> = mutableStateOf(DEFAULT_PROVIDER_MODE)
	val providerIdState: MutableState<String> = mutableStateOf(DEFAULT_PROVIDER_ID)
	val customApiUrlState: MutableState<String> = mutableStateOf(DEFAULT_API_URL)
	val customApiKeyState: MutableState<String> = mutableStateOf(DEFAULT_API_KEY)
	val customModelNameState: MutableState<String> = mutableStateOf(DEFAULT_MODEL_NAME)
	val customSystemPromptState: MutableState<String> = mutableStateOf(DEFAULT_SYSTEM_PROMPT)
	val temperatureState: MutableState<Float> = mutableStateOf(DEFAULT_TEMPERATURE)
	val topPState: MutableState<Float> = mutableStateOf(DEFAULT_TOP_P)
	val selectedAppsState: MutableState<Set<String>> = mutableStateOf(DEFAULT_SELECTED_APPS)
	val suggestionPresentationTypeState: MutableState<SuggestionPresentationType> = mutableStateOf(SuggestionPresentationType.BOTH)
	val showErrorsState: MutableState<Boolean> = mutableStateOf(DEFAULT_SHOW_ERRORS)
	val configTypeState: MutableState<String> = mutableStateOf(DEFAULT_CONFIG_TYPE)
	val advancedConfigBodyState: MutableState<String> = mutableStateOf(DEFAULT_ADVANCED_CONFIG_BODY)
	val typingRegexPatternState: MutableState<String> = mutableStateOf(DEFAULT_TYPING_REGEX_PATTERN)
	val typingRegexEnabledState: MutableState<Boolean> = mutableStateOf(DEFAULT_TYPING_REGEX_ENABLED)
	val customDebounceState: MutableState<Int> = mutableStateOf(DEFAULT_CUSTOM_DEBOUNCE_MS)
	val suggestionContentTemplateState: MutableState<String> = mutableStateOf(DEFAULT_SUGGESTION_CONTENT_TEMPLATE)

	data class PreferenceUpdate(
		val masterSwitch: Boolean? = null,
		val apiType: String? = null,
		val providerMode: String? = null,
		val providerId: String? = null,
		val customApiUrl: String? = null,
		val customApiKey: String? = null,
		val customModelName: String? = null,
		val customSystemPrompt: String? = null,
		val temperature: Float? = null,
		val selectedApps: Set<String>? = null,
		val topP: Float? = null,
		val suggestionPresentationType: SuggestionPresentationType? = null,
		val showErrors: Boolean? = null,
		val configType: String? = null,
		val advancedConfigBody: String? = null,
		val typingRegexPattern: String? = null,
		val typingRegexEnabled: Boolean? = null,
		val customDebounceMs: Int? = null,
		val suggestionContentTemplate: String? = null,
	)

	private suspend fun getValues(vararg keys: String): Map<String, String?> {
		return storage.getValues(keys.toList()).associate { entry -> entry.key to entry.value }
	}

	private suspend fun setValues(entries: List<Entry>) {
		storage.setValues(entries)
	}

	private fun parseBoolean(value: String?, default: Boolean): Boolean {
		return value?.toBooleanStrictOrNull() ?: default
	}

	private fun parseFloat(value: String?, default: Float): Float {
		return value?.toFloatOrNull() ?: default
	}

	private fun parseInt(value: String?, default: Int): Int {
		return value?.toIntOrNull() ?: default
	}

	private fun parseStringSet(value: String?, default: Set<String>): Set<String> {
		if (value.isNullOrBlank()) {
			return default
		}
		return runCatching {
			val array = JSONArray(value)
			buildSet {
				for (index in 0 until array.length()) {
					add(array.getString(index))
				}
			}
		}.getOrDefault(default)
	}

	private fun encodeStringSet(values: Set<String>): String {
		return JSONArray(values.toList()).toString()
	}

	suspend fun updatePreferences(updates: PreferenceUpdate) {
		val entries = mutableListOf<Entry>()
		updates.masterSwitch?.let { entries += Entry(MASTER_SWITCH, it.toString()) }
		updates.apiType?.let { entries += Entry(API_TYPE, it) }
		updates.providerMode?.let { entries += Entry(PROVIDER_MODE, it) }
		updates.providerId?.let { entries += Entry(PROVIDER_ID, it) }
		updates.customApiUrl?.let { entries += Entry(CUSTOM_API_URL, it) }
		updates.customApiKey?.let { entries += Entry(CUSTOM_API_KEY, it) }
		updates.customModelName?.let { entries += Entry(CUSTOM_MODEL_NAME, it) }
		updates.customSystemPrompt?.let { entries += Entry(CUSTOM_SYSTEM_PROMPT, it) }
		updates.temperature?.let { entries += Entry(TEMPERATURE, it.toString()) }
		updates.topP?.let { entries += Entry(TOP_P, it.toString()) }
		updates.suggestionPresentationType?.let { entries += Entry(SUGGESTION_PRESENTATION_TYPE, it.value.toString()) }
		updates.showErrors?.let { entries += Entry(SHOW_ERRORS, it.toString()) }
		updates.selectedApps?.let { entries += Entry(SELECTED_APPS, encodeStringSet(it)) }
		updates.configType?.let { entries += Entry(CONFIG_TYPE, it) }
		updates.advancedConfigBody?.let { entries += Entry(ADVANCED_CONFIG_BODY, it) }
		updates.typingRegexPattern?.let { entries += Entry(TYPING_REGEX_PATTERN, it) }
		updates.typingRegexEnabled?.let { entries += Entry(TYPING_REGEX_ENABLED, it.toString()) }
		updates.customDebounceMs?.let { entries += Entry(CUSTOM_DEBOUNCE_MS, it.toString()) }
		updates.suggestionContentTemplate?.let { entries += Entry(SUGGESTION_CONTENT_TEMPLATE, it) }
		if (entries.isNotEmpty()) {
			setValues(entries)
		}
	}

	suspend fun loadPreferences() {
		val values = getValues(
			MASTER_SWITCH,
			API_TYPE,
			PROVIDER_MODE,
			PROVIDER_ID,
			CUSTOM_API_URL,
			CUSTOM_API_KEY,
			CUSTOM_MODEL_NAME,
			CUSTOM_SYSTEM_PROMPT,
			TEMPERATURE,
			TOP_P,
			SELECTED_APPS,
			SUGGESTION_PRESENTATION_TYPE,
			SHOW_ERRORS,
			CONFIG_TYPE,
			ADVANCED_CONFIG_BODY,
			TYPING_REGEX_PATTERN,
			TYPING_REGEX_ENABLED,
			CUSTOM_DEBOUNCE_MS,
			SUGGESTION_CONTENT_TEMPLATE,
		)

		masterSwitchState.value = parseBoolean(values[MASTER_SWITCH], DEFAULT_MASTER_SWITCH)
		apiTypeState.value = values[API_TYPE] ?: DEFAULT_API_TYPE
		providerModeState.value = values[PROVIDER_MODE] ?: deriveProviderMode(values)
		providerIdState.value = values[PROVIDER_ID] ?: DEFAULT_PROVIDER_ID
		customApiUrlState.value = values[CUSTOM_API_URL] ?: DEFAULT_API_URL
		customApiKeyState.value = values[CUSTOM_API_KEY] ?: DEFAULT_API_KEY
		customModelNameState.value = values[CUSTOM_MODEL_NAME] ?: DEFAULT_MODEL_NAME
		customSystemPromptState.value = values[CUSTOM_SYSTEM_PROMPT] ?: DEFAULT_SYSTEM_PROMPT
		temperatureState.value = parseFloat(values[TEMPERATURE], DEFAULT_TEMPERATURE)
		topPState.value = parseFloat(values[TOP_P], DEFAULT_TOP_P)
		selectedAppsState.value = parseStringSet(values[SELECTED_APPS], DEFAULT_SELECTED_APPS)
		suggestionPresentationTypeState.value = SuggestionPresentationType.fromInt(parseInt(values[SUGGESTION_PRESENTATION_TYPE], DEFAULT_SUGGESTION_PRESENTATION_TYPE))
		showErrorsState.value = parseBoolean(values[SHOW_ERRORS], DEFAULT_SHOW_ERRORS)
		configTypeState.value = values[CONFIG_TYPE] ?: DEFAULT_CONFIG_TYPE
		advancedConfigBodyState.value = values[ADVANCED_CONFIG_BODY] ?: DEFAULT_ADVANCED_CONFIG_BODY
		typingRegexPatternState.value = values[TYPING_REGEX_PATTERN] ?: DEFAULT_TYPING_REGEX_PATTERN
		typingRegexEnabledState.value = parseBoolean(values[TYPING_REGEX_ENABLED], DEFAULT_TYPING_REGEX_ENABLED)
		customDebounceState.value = parseInt(values[CUSTOM_DEBOUNCE_MS], DEFAULT_CUSTOM_DEBOUNCE_MS)
		suggestionContentTemplateState.value = values[SUGGESTION_CONTENT_TEMPLATE] ?: DEFAULT_SUGGESTION_CONTENT_TEMPLATE
	}

	private fun deriveProviderMode(values: Map<String, String?>): String {
		val configType = values[CONFIG_TYPE] ?: DEFAULT_CONFIG_TYPE
		val baseUrl = values[CUSTOM_API_URL] ?: DEFAULT_API_URL
		return when {
			configType == "advanced" -> "advanced"
			baseUrl.endsWith("/fim") || baseUrl.endsWith("/fim/") -> "fim"
			else -> DEFAULT_PROVIDER_MODE
		}
	}

	suspend fun updateMasterSwitch(enabled: Boolean) {
		val wasEnabled = masterSwitchState.value
		masterSwitchState.value = enabled
		updatePreferences(PreferenceUpdate(masterSwitch = enabled))
		if (wasEnabled && !enabled) {
			_disableSelfRequests.tryEmit(Unit)
		}
	}

	suspend fun updateApiType(type: String) {
		apiTypeState.value = type
		updatePreferences(PreferenceUpdate(apiType = type))
	}

	suspend fun updateProviderMode(mode: String) {
		providerModeState.value = mode
		updatePreferences(PreferenceUpdate(providerMode = mode))
	}

	suspend fun updateProviderId(providerId: String) {
		providerIdState.value = providerId
		updatePreferences(PreferenceUpdate(providerId = providerId))
	}

	suspend fun updateCustomApiUrl(url: String) {
		customApiUrlState.value = url
		updatePreferences(PreferenceUpdate(customApiUrl = url))
	}

	suspend fun updateCustomApiKey(key: String) {
		customApiKeyState.value = key
		updatePreferences(PreferenceUpdate(customApiKey = key))
	}

	suspend fun updateCustomModelName(model: String) {
		customModelNameState.value = model
		updatePreferences(PreferenceUpdate(customModelName = model))
	}

	suspend fun updateCustomSystemPrompt(prompt: String) {
		customSystemPromptState.value = prompt
		updatePreferences(PreferenceUpdate(customSystemPrompt = prompt))
	}

	suspend fun updateTemperature(temperature: Float) {
		temperatureState.value = temperature
		updatePreferences(PreferenceUpdate(temperature = temperature))
	}

	suspend fun updateTopP(topP: Float) {
		topPState.value = topP
		updatePreferences(PreferenceUpdate(topP = topP))
	}

	suspend fun updateSuggestionPresentationType(type: SuggestionPresentationType) {
		suggestionPresentationTypeState.value = type
		updatePreferences(PreferenceUpdate(suggestionPresentationType = type))
	}

	suspend fun updateShowErrors(show: Boolean) {
		showErrorsState.value = show
		updatePreferences(PreferenceUpdate(showErrors = show))
	}

	suspend fun updateSelectedApps(apps: Set<String>) {
		selectedAppsState.value = apps
		updatePreferences(PreferenceUpdate(selectedApps = apps))
	}

	suspend fun updateConfigType(type: String) {
		configTypeState.value = type
		updatePreferences(PreferenceUpdate(configType = type))
	}

	suspend fun updateAdvancedConfigBody(json: String) {
		advancedConfigBodyState.value = json
		updatePreferences(PreferenceUpdate(advancedConfigBody = json))
	}

	suspend fun updateTypingRegexPattern(pattern: String) {
		typingRegexPatternState.value = pattern
		updatePreferences(PreferenceUpdate(typingRegexPattern = pattern))
	}

	suspend fun updateTypingRegexEnabled(enabled: Boolean) {
		typingRegexEnabledState.value = enabled
		updatePreferences(PreferenceUpdate(typingRegexEnabled = enabled))
	}

	suspend fun updateCustomDebounceMs(debounceMs: Int) {
		customDebounceState.value = debounceMs
		updatePreferences(PreferenceUpdate(customDebounceMs = debounceMs))
	}

	suspend fun updateSuggestionContentTemplate(template: String) {
		suggestionContentTemplateState.value = template
		updatePreferences(PreferenceUpdate(suggestionContentTemplate = template))
	}

	suspend fun getMasterSwitch(): Boolean {
		return masterSwitchState.value
	}
}
