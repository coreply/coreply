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
import androidx.datastore.preferences.preferencesDataStore
import androidx.preference.PreferenceManager
import kotlinx.coroutines.flow.firstOrNull

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
        val HOSTED_API_KEY = stringPreferencesKey("hostedApiKey")
        val SUGGESTION_PRESENTATION_TYPE = intPreferencesKey("suggestion_presentation_type")

        // Default values
        private const val DEFAULT_MASTER_SWITCH = true
        private const val DEFAULT_API_TYPE = "hosted"
        private const val DEFAULT_API_URL = "https://api.openai.com/v1/"
        private const val DEFAULT_API_KEY = ""
        private const val DEFAULT_MODEL_NAME = "gpt-4.1-mini"
        private const val DEFAULT_SYSTEM_PROMPT = "You are an AI texting assistant. You will be given a list of text messages between the user (indicated by 'Message I sent:'), and other people (indicated by their names or simply 'Message I received:'). You may also receive a screenshot of the conversation. Your job is to suggest the next message the user should send. Match the tone and style of the conversation. The user may request the message start or end with a certain prefix (both could be parts of a longer word) . The user may quote a specific message. In this case, make sure your suggestions are about the quoted message.\nOutput the suggested text only. Do not output anything else. Do not surround output with quotation marks"
        private const val DEFAULT_TEMPERATURE = 0.3f
        private const val DEFAULT_HOSTED_API_KEY = ""
        private const val DEFAULT_TOP_P = 1.0f
        private const val DEFAULT_SUGGESTION_PRESENTATION_TYPE = 2 // Both
    }

    // Mutable state for each preference field
    val masterSwitchState: MutableState<Boolean> = mutableStateOf(DEFAULT_MASTER_SWITCH)
    val apiTypeState: MutableState<String> = mutableStateOf(DEFAULT_API_TYPE)
    val customApiUrlState: MutableState<String> = mutableStateOf(DEFAULT_API_URL)
    val customApiKeyState: MutableState<String> = mutableStateOf(DEFAULT_API_KEY)
    val customModelNameState: MutableState<String> = mutableStateOf(DEFAULT_MODEL_NAME)
    val customSystemPromptState: MutableState<String> = mutableStateOf(DEFAULT_SYSTEM_PROMPT)
    val temperatureState: MutableState<Float> = mutableStateOf(DEFAULT_TEMPERATURE)
    val topPState: MutableState<Float> = mutableStateOf(DEFAULT_TOP_P)
    val hostedApiKeyState: MutableState<String> = mutableStateOf(DEFAULT_HOSTED_API_KEY)
    val suggestionPresentationTypeState: MutableState<SuggestionPresentationType> = mutableStateOf(SuggestionPresentationType.BOTH)

    data class PreferenceUpdate(
        val masterSwitch: Boolean? = null,
        val apiType: String? = null,
        val customApiUrl: String? = null,
        val customApiKey: String? = null,
        val customModelName: String? = null,
        val customSystemPrompt: String? = null,
        val temperature: Float? = null,
        val topP: Float? = null,
        val hostedApiKey: String? = null
        val suggestionPresentationType: SuggestionPresentationType? = null
    )

    /**
     * Helper function to update multiple preferences in a single transaction
     */
    suspend fun updatePreferences(updates: PreferenceUpdate) {
        dataStore.edit { preferences ->
            updates.masterSwitch?.let { preferences[MASTER_SWITCH] = it }
            updates.customApiUrl?.let { preferences[CUSTOM_API_URL] = it }
            updates.customApiKey?.let { preferences[CUSTOM_API_KEY] = it }
            updates.apiType?.let { preferences[API_TYPE] = it }
            updates.customModelName?.let { preferences[CUSTOM_MODEL_NAME] = it }
            updates.customSystemPrompt?.let { preferences[CUSTOM_SYSTEM_PROMPT] = it }
            updates.temperature?.let { preferences[TEMPERATURE] = it }
            updates.topP?.let { preferences[TOP_P] = it }
            updates.hostedApiKey?.let { preferences[HOSTED_API_KEY] = it }
            updates.suggestionPresentationType?.let { preferences[SUGGESTION_PRESENTATION_TYPE] = it.value }
        }
    }

    /**
     * Load all preferences from datastore and update the state
     */
    suspend fun loadPreferences() {
        val preferences = dataStore.data.firstOrNull()
        preferences?.let { prefs ->
            masterSwitchState.value = prefs[MASTER_SWITCH] ?: DEFAULT_MASTER_SWITCH
            customApiUrlState.value = prefs[CUSTOM_API_URL] ?: DEFAULT_API_URL
            customApiKeyState.value = prefs[CUSTOM_API_KEY] ?: DEFAULT_API_KEY
            apiTypeState.value = prefs[API_TYPE] ?: if (customApiKeyState.value.isEmpty()) "hosted" else "custom"
            customModelNameState.value = prefs[CUSTOM_MODEL_NAME] ?: DEFAULT_MODEL_NAME
            customSystemPromptState.value = prefs[CUSTOM_SYSTEM_PROMPT] ?: DEFAULT_SYSTEM_PROMPT
            temperatureState.value = prefs[TEMPERATURE] ?: DEFAULT_TEMPERATURE
            topPState.value = prefs[TOP_P] ?: DEFAULT_TOP_P
            hostedApiKeyState.value = prefs[HOSTED_API_KEY] ?: DEFAULT_HOSTED_API_KEY
            suggestionPresentationTypeState.value = SuggestionPresentationType.fromInt(prefs[SUGGESTION_PRESENTATION_TYPE] ?: DEFAULT_SUGGESTION_PRESENTATION_TYPE)
        }
    }

    /**
     * Update master switch state and persist to datastore
     */
    suspend fun updateMasterSwitch(enabled: Boolean) {
        masterSwitchState.value = enabled
        updatePreferences(PreferenceUpdate(masterSwitch = enabled))
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

    suspend fun updateHostedApiKey(apiKey: String) {
        hostedApiKeyState.value = apiKey
        updatePreferences(PreferenceUpdate(hostedApiKey = apiKey))
    }
    /**
     * Get current master switch value (for backward compatibility)
     */
    suspend fun getMasterSwitch(): Boolean {
        return masterSwitchState.value
    }
}
