package app.coreply.coreplyapp.ui.viewmodel

import android.app.Application
import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import app.coreply.coreplyapp.data.PreferencesManager
import app.coreply.coreplyapp.data.SuggestionPresentationType
import app.coreply.coreplyapp.utils.GlobalPref
import kotlinx.coroutines.launch

data class SettingsUiState(
    val masterSwitchEnabled: Boolean = false,
    val apiType: String = "custom",
    val customApiUrl: String = "https://api.openai.com/v1/",
    val customApiKey: String = "",
    val customModelName: String = "gpt-4.1-mini",
    val customSystemPrompt: String = "",
    val temperature: Float = 0.3f,
    val suggestionPresentationType: SuggestionPresentationType = SuggestionPresentationType.BOTH,
    val showErrors: Boolean = false,
    val topP: Float = 0.5f,
    val selectedApps: Set<String> = emptySet()
)

class SettingsViewModel(application: Application) : AndroidViewModel(application) {
    
    private val preferencesManager = PreferencesManager.getInstance(application)
    
    var uiState by mutableStateOf(SettingsUiState())
        private set

    init {
        // Load preferences from datastore on app launch
        viewModelScope.launch {
            preferencesManager.loadPreferences()
            updateUiStateFromPreferences()
        }
    }
    
    private fun updateUiStateFromPreferences() {
        uiState = SettingsUiState(
            masterSwitchEnabled = preferencesManager.masterSwitchState.value && GlobalPref.isAccessibilityEnabled(getApplication()),
            apiType = preferencesManager.apiTypeState.value,
            customApiUrl = preferencesManager.customApiUrlState.value,
            customApiKey = preferencesManager.customApiKeyState.value,
            customModelName = preferencesManager.customModelNameState.value,
            customSystemPrompt = preferencesManager.customSystemPromptState.value,
            temperature = preferencesManager.temperatureState.value,
            selectedApps = preferencesManager.selectedAppsState.value,
            topP = preferencesManager.topPState.value,
            suggestionPresentationType = preferencesManager.suggestionPresentationTypeState.value,
            showErrors = preferencesManager.showErrorsState.value
        )
    }
    
    fun updateMasterSwitchState(context: Context) {
        val isEnabled = GlobalPref.isAccessibilityEnabled(context)
        uiState = uiState.copy(masterSwitchEnabled = isEnabled && preferencesManager.masterSwitchState.value)
    }

    fun updateApiType(type: String) {
        uiState = uiState.copy(apiType = type)
        viewModelScope.launch { 
            preferencesManager.updateApiType(type)
        }
    }
    
    fun updateCustomApiUrl(url: String) {
        uiState = uiState.copy(customApiUrl = url)
        viewModelScope.launch { 
            preferencesManager.updateCustomApiUrl(url)
        }
    }
    
    fun updateCustomApiKey(key: String) {
        uiState = uiState.copy(customApiKey = key)
        viewModelScope.launch { 
            preferencesManager.updateCustomApiKey(key)
        }
    }
    
    fun updateCustomModelName(model: String) {
        uiState = uiState.copy(customModelName = model)
        viewModelScope.launch { 
            preferencesManager.updateCustomModelName(model)
        }
    }
    
    fun updateCustomSystemPrompt(prompt: String) {
        uiState = uiState.copy(customSystemPrompt = prompt)
        viewModelScope.launch { 
            preferencesManager.updateCustomSystemPrompt(prompt)
        }
    }
    
    fun updateTemperature(temperature: Float) {
        uiState = uiState.copy(temperature = temperature)
        viewModelScope.launch { 
            preferencesManager.updateTemperature(temperature)
        }
    }
    
    fun updateTopP(topP: Float) {
        uiState = uiState.copy(topP = topP)
        viewModelScope.launch { 
            preferencesManager.updateTopP(topP)
        }
    }

    fun updateSuggestionPresentationType(type: SuggestionPresentationType) {
        uiState = uiState.copy(suggestionPresentationType = type)
        viewModelScope.launch {
            preferencesManager.updateSuggestionPresentationType(type)
        }
    }

    fun updateShowErrors(show: Boolean) {
        uiState = uiState.copy(showErrors = show)
        viewModelScope.launch {
            preferencesManager.updateShowErrors(show)
        }
    }

    fun updateSelectedApps(apps: Set<String>) {
        uiState = uiState.copy(selectedApps = apps)
        viewModelScope.launch {
            preferencesManager.updateSelectedApps(apps)
        }
    }
}
