package app.coreply.coreplyapp.data

import android.content.Context
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.SharedPreferencesMigration
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import androidx.preference.PreferenceManager
import app.coreply.coreplyapp.applistener.SupportedApps
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(
    name = "settings",
    produceMigrations = { context ->
        listOf(SharedPreferencesMigration({ PreferenceManager.getDefaultSharedPreferences(context) }))
    })

class PreferencesManager private constructor(private val dataStore: DataStore<Preferences>) {

    companion object {
        @Volatile
        private var INSTANCE: PreferencesManager? = null

        fun getInstance(context: Context): PreferencesManager {
            return INSTANCE ?: synchronized(this) {
                val instance = PreferencesManager(context.dataStore)
                INSTANCE = instance
                instance
            }
        }

        // Preference keys
        val MASTER_SWITCH = booleanPreferencesKey("master_switch")
        val API_TYPE = stringPreferencesKey("api_type")
        val CUSTOM_API_URL = stringPreferencesKey("customApiUrl")
        val CUSTOM_API_KEY = stringPreferencesKey("customApiKey")
        val CUSTOM_MODEL_NAME = stringPreferencesKey("customModelName")
        val CUSTOM_SYSTEM_PROMPT = stringPreferencesKey("customSystemPrompt")
        val TEMPERATURE = floatPreferencesKey("temperature_float")
        val TOP_P = floatPreferencesKey("topp_float")
        val SUGGESTION_PRESENTATION_TYPE = intPreferencesKey("suggestion_presentation_type")
        val SHOW_ERRORS = booleanPreferencesKey("show_errors")
        val SELECTED_APPS = stringSetPreferencesKey("selected_apps_set")
        val CONFIG_TYPE = stringPreferencesKey("config_type")
        val ADVANCED_CONFIG_BODY = stringPreferencesKey("advanced_config_body")
        val TYPING_REGEX_PATTERN = stringPreferencesKey("typing_regex_pattern")
        val TYPING_REGEX_ENABLED = booleanPreferencesKey("typing_regex_enabled")
        val CUSTOM_DEBOUNCE_MS = intPreferencesKey("custom_debounce_ms")
        val SUGGESTION_CONTENT_TEMPLATE = stringPreferencesKey("suggestion_content_template")

        // Default values
        private const val DEFAULT_MASTER_SWITCH = true
        private const val DEFAULT_API_TYPE = "custom"
        private const val DEFAULT_API_URL = "https://api.openai.com/v1/"
        private const val DEFAULT_API_KEY = ""
        private const val DEFAULT_MODEL_NAME = "gpt-4.1-mini"
        private const val DEFAULT_SYSTEM_PROMPT =
            "You are an AI texting assistant. You will be given a list of text messages between the user (indicated by 'Message I sent:'), and other people (indicated by their names or simply 'Message I received:'). You may also receive a screenshot of the conversation. Your job is to suggest the next message the user should send. Match the tone and style of the conversation. The user may request the message start or end with a certain prefix (both could be parts of a longer word) . The user may quote a specific message. In this case, make sure your suggestions are about the quoted message.\nOutput the suggested text only. Do not output anything else. Do not surround output with quotation marks"
        private const val DEFAULT_TEMPERATURE = 0.3f
        private val DEFAULT_SELECTED_APPS = SupportedApps.supportedApps.map { it.pkgName }.toSet()
        private const val DEFAULT_TOP_P = 1.0f
        private const val DEFAULT_SUGGESTION_PRESENTATION_TYPE = 2 // Both
        private const val DEFAULT_SHOW_ERRORS = true
        private const val DEFAULT_CONFIG_TYPE = "simple"
        private var DEFAULT_ADVANCED_CONFIG_BODY = """{
            |  "model": "gpt-4o-mini",
            |  "temperature": 0.7,
            |  "top_p": 1.0,
            |  "messages": [
            |    {
            |      "role": "system",
            |      "content": "You are an AI texting assistant. Generate a suggested reply based on the conversation history and current typing. Output only the suggested text without quotation marks or extra formatting."
            |    },
            |    {
            |      "role": "user",
            |      "content": "Chat history:\n{{#pastMessages}}{{#sent}}Me: {{/sent}}{{#received}}Them: {{/received}}{{content.jsonEscaped}}\n{{/pastMessages}}{{#currentTyping}}Current typing: {{currentTyping.jsonEscaped}}{{/currentTyping}}{{^currentTyping}}Suggest a reply.{{/currentTyping}}"
            |    }
            |  ],
            |  "max_tokens": 50,
            |  "stream": false
            |}
        """.trimMargin()
        private const val DEFAULT_TYPING_REGEX_PATTERN = "^.*[\\s.!?,;:]$"
        private const val DEFAULT_TYPING_REGEX_ENABLED = false
        private const val DEFAULT_CUSTOM_DEBOUNCE_MS = 350
        private const val DEFAULT_SUGGESTION_CONTENT_TEMPLATE = "{{assistantMessage}}"
    }

    // Mutable state for each preference field
    val masterSwitchState: MutableState<Boolean> = mutableStateOf(DEFAULT_MASTER_SWITCH)
    private val _disableSelfRequests = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val disableSelfRequests: SharedFlow<Unit> = _disableSelfRequests.asSharedFlow()
    val apiTypeState: MutableState<String> = mutableStateOf(DEFAULT_API_TYPE)
    val customApiUrlState: MutableState<String> = mutableStateOf(DEFAULT_API_URL)
    val customApiKeyState: MutableState<String> = mutableStateOf(DEFAULT_API_KEY)
    val customModelNameState: MutableState<String> = mutableStateOf(DEFAULT_MODEL_NAME)
    val customSystemPromptState: MutableState<String> = mutableStateOf(DEFAULT_SYSTEM_PROMPT)
    val temperatureState: MutableState<Float> = mutableStateOf(DEFAULT_TEMPERATURE)
    val topPState: MutableState<Float> = mutableStateOf(DEFAULT_TOP_P)
    val selectedAppsState: MutableState<Set<String>> = mutableStateOf(DEFAULT_SELECTED_APPS)
    val suggestionPresentationTypeState: MutableState<SuggestionPresentationType> =
        mutableStateOf(SuggestionPresentationType.BOTH)
    val showErrorsState: MutableState<Boolean> = mutableStateOf(DEFAULT_SHOW_ERRORS)
    val configTypeState: MutableState<String> = mutableStateOf(DEFAULT_CONFIG_TYPE)
    val advancedConfigBodyState: MutableState<String> = mutableStateOf(DEFAULT_ADVANCED_CONFIG_BODY)
    val typingRegexPatternState: MutableState<String> = mutableStateOf(DEFAULT_TYPING_REGEX_PATTERN)
    val typingRegexEnabledState: MutableState<Boolean> =
        mutableStateOf(DEFAULT_TYPING_REGEX_ENABLED)
    val customDebounceState: MutableState<Int> = mutableStateOf(DEFAULT_CUSTOM_DEBOUNCE_MS)
    val suggestionContentTemplateState: MutableState<String> =
        mutableStateOf(DEFAULT_SUGGESTION_CONTENT_TEMPLATE)


    data class PreferenceUpdate(
        val masterSwitch: Boolean? = null,
        val apiType: String? = null,
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
        val suggestionContentTemplate: String? = null
    )

    /**
     * Helper function to update multiple preferences in a single transaction
     */
    suspend fun updatePreferences(updates: PreferenceUpdate) {
        dataStore.edit { preferences ->
            updates.masterSwitch?.let { preferences[MASTER_SWITCH] = it }
            updates.apiType?.let { preferences[API_TYPE] = it }
            updates.customApiUrl?.let { preferences[CUSTOM_API_URL] = it }
            updates.customApiKey?.let { preferences[CUSTOM_API_KEY] = it }
            updates.customModelName?.let { preferences[CUSTOM_MODEL_NAME] = it }
            updates.customSystemPrompt?.let { preferences[CUSTOM_SYSTEM_PROMPT] = it }
            updates.temperature?.let { preferences[TEMPERATURE] = it }
            updates.topP?.let { preferences[TOP_P] = it }
            updates.suggestionPresentationType?.let {
                preferences[SUGGESTION_PRESENTATION_TYPE] = it.value
            }
            updates.showErrors?.let { preferences[SHOW_ERRORS] = it }
            updates.selectedApps?.let { preferences[SELECTED_APPS] = it }
            updates.configType?.let { preferences[CONFIG_TYPE] = it }
            updates.advancedConfigBody?.let { preferences[ADVANCED_CONFIG_BODY] = it }
            updates.typingRegexPattern?.let { preferences[TYPING_REGEX_PATTERN] = it }
            updates.typingRegexEnabled?.let { preferences[TYPING_REGEX_ENABLED] = it }
            updates.customDebounceMs?.let { preferences[CUSTOM_DEBOUNCE_MS] = it }
            updates.suggestionContentTemplate?.let { preferences[SUGGESTION_CONTENT_TEMPLATE] = it }
        }

    }

    /**
     * Load all preferences from datastore and update the state
     */
    suspend fun loadPreferences() {
        val preferences = dataStore.data.firstOrNull()
        preferences?.let { prefs ->
            masterSwitchState.value = prefs[MASTER_SWITCH] ?: DEFAULT_MASTER_SWITCH
            apiTypeState.value = prefs[API_TYPE] ?: DEFAULT_API_TYPE
            customApiUrlState.value = prefs[CUSTOM_API_URL] ?: DEFAULT_API_URL
            customApiKeyState.value = prefs[CUSTOM_API_KEY] ?: DEFAULT_API_KEY
            customModelNameState.value = prefs[CUSTOM_MODEL_NAME] ?: DEFAULT_MODEL_NAME
            customSystemPromptState.value = prefs[CUSTOM_SYSTEM_PROMPT] ?: DEFAULT_SYSTEM_PROMPT
            temperatureState.value = prefs[TEMPERATURE] ?: DEFAULT_TEMPERATURE
            topPState.value = prefs[TOP_P] ?: DEFAULT_TOP_P
            selectedAppsState.value = prefs[SELECTED_APPS] ?: DEFAULT_SELECTED_APPS
            suggestionPresentationTypeState.value = SuggestionPresentationType.fromInt(
                prefs[SUGGESTION_PRESENTATION_TYPE] ?: DEFAULT_SUGGESTION_PRESENTATION_TYPE
            )
            showErrorsState.value = prefs[SHOW_ERRORS] ?: DEFAULT_SHOW_ERRORS
            configTypeState.value = prefs[CONFIG_TYPE] ?: DEFAULT_CONFIG_TYPE
            advancedConfigBodyState.value =
                prefs[ADVANCED_CONFIG_BODY] ?: DEFAULT_ADVANCED_CONFIG_BODY
            typingRegexPatternState.value =
                prefs[TYPING_REGEX_PATTERN] ?: DEFAULT_TYPING_REGEX_PATTERN
            typingRegexEnabledState.value =
                prefs[TYPING_REGEX_ENABLED] ?: DEFAULT_TYPING_REGEX_ENABLED
            customDebounceState.value = prefs[CUSTOM_DEBOUNCE_MS] ?: DEFAULT_CUSTOM_DEBOUNCE_MS
            suggestionContentTemplateState.value =
                prefs[SUGGESTION_CONTENT_TEMPLATE] ?: DEFAULT_SUGGESTION_CONTENT_TEMPLATE
        }
    }

    /**
     * Update master switch state and persist to datastore
     */
    suspend fun updateMasterSwitch(enabled: Boolean) {
        val wasEnabled = masterSwitchState.value
        masterSwitchState.value = enabled
        updatePreferences(PreferenceUpdate(masterSwitch = enabled))
        if (wasEnabled && !enabled) {
            _disableSelfRequests.tryEmit(Unit)
        }
    }

    /**
     * Update API type state and persist to datastore
     */
    suspend fun updateApiType(type: String) {
        apiTypeState.value = type
        updatePreferences(PreferenceUpdate(apiType = type))
    }

    /**
     * Update custom API URL state and persist to datastore
     */
    suspend fun updateCustomApiUrl(url: String) {
        customApiUrlState.value = url
        updatePreferences(PreferenceUpdate(customApiUrl = url))
    }

    /**
     * Update custom API key state and persist to datastore
     */
    suspend fun updateCustomApiKey(key: String) {
        customApiKeyState.value = key
        updatePreferences(PreferenceUpdate(customApiKey = key))
    }

    /**
     * Update custom model name state and persist to datastore
     */
    suspend fun updateCustomModelName(model: String) {
        customModelNameState.value = model
        updatePreferences(PreferenceUpdate(customModelName = model))
    }

    /**
     * Update custom system prompt state and persist to datastore
     */
    suspend fun updateCustomSystemPrompt(prompt: String) {
        customSystemPromptState.value = prompt
        updatePreferences(PreferenceUpdate(customSystemPrompt = prompt))
    }

    /**
     * Update temperature state and persist to datastore
     */
    suspend fun updateTemperature(temperature: Float) {
        temperatureState.value = temperature
        updatePreferences(PreferenceUpdate(temperature = temperature))
    }

    /**
     * Update top-P state and persist to datastore
     */
    suspend fun updateTopP(topP: Float) {
        topPState.value = topP
        updatePreferences(PreferenceUpdate(topP = topP))
    }

    suspend fun updateSuggestionPresentationType(type: SuggestionPresentationType) {
        suggestionPresentationTypeState.value = type
        updatePreferences(PreferenceUpdate(suggestionPresentationType = type))
    }

    /**
     * Update show errors state and persist to datastore
     */
    suspend fun updateShowErrors(show: Boolean) {
        showErrorsState.value = show
        updatePreferences(PreferenceUpdate(showErrors = show))
    }

    /**
     * Update selected apps state and persist to datastore
     */
    suspend fun updateSelectedApps(apps: Set<String>) {
        selectedAppsState.value = apps
        updatePreferences(PreferenceUpdate(selectedApps = apps))
    }

    /**
     * Update config type state and persist to datastore
     */
    suspend fun updateConfigType(type: String) {
        configTypeState.value = type
        updatePreferences(PreferenceUpdate(configType = type))
    }

    /**
     * Update advanced config JSON state and persist to datastore
     */
    suspend fun updateAdvancedConfigBody(json: String) {
        advancedConfigBodyState.value = json
        updatePreferences(PreferenceUpdate(advancedConfigBody = json))
    }

    /**
     * Update typing regex pattern state and persist to datastore
     */
    suspend fun updateTypingRegexPattern(pattern: String) {
        typingRegexPatternState.value = pattern
        updatePreferences(PreferenceUpdate(typingRegexPattern = pattern))
    }

    /**
     * Update typing regex enabled state and persist to datastore
     */
    suspend fun updateTypingRegexEnabled(enabled: Boolean) {
        typingRegexEnabledState.value = enabled
        updatePreferences(PreferenceUpdate(typingRegexEnabled = enabled))
    }

    /**
     * Update custom debounce milliseconds state and persist to datastore
     */
    suspend fun updateCustomDebounceMs(debounceMs: Int) {
        customDebounceState.value = debounceMs
        updatePreferences(PreferenceUpdate(customDebounceMs = debounceMs))
    }

    /**
     * Update suggestion content template state and persist to datastore
     */
    suspend fun updateSuggestionContentTemplate(template: String) {
        suggestionContentTemplateState.value = template
        updatePreferences(PreferenceUpdate(suggestionContentTemplate = template))
    }

    /**
     * Get current master switch value (for backward compatibility)
     */
    suspend fun getMasterSwitch(): Boolean {
        return masterSwitchState.value
    }
}
