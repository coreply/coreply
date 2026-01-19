package app.coreply.coreplyapp.ui.viewmodel

import android.app.Application
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import app.coreply.coreplyapp.applistener.SupportedApps
import app.coreply.coreplyapp.data.PreferencesManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class AppInfo(
    val packageName: String,
    val appName: String,
    val appIcon: Drawable?,
    val isSupported: Boolean = false,
)

data class AppSelectorUiState(
    val isLoading: Boolean = true,
    val supportedApps: List<AppInfo> = emptyList(),
    val otherApps: List<AppInfo> = emptyList(),
    val selectedApps: Set<String> = emptySet(),
    val error: String? = null
)

class AppSelectorViewModel(application: Application) : AndroidViewModel(application) {

    private val preferencesManager = PreferencesManager.getInstance(application)
    private val packageManager = application.packageManager

    var uiState by mutableStateOf(AppSelectorUiState())
        private set

    init {
        loadApps()
        loadSelectedApps()
    }

    private fun loadSelectedApps() {
        viewModelScope.launch {
            preferencesManager.loadPreferences()
            uiState = uiState.copy(selectedApps = preferencesManager.selectedAppsState.value)
        }
    }

    private fun loadApps() {
        viewModelScope.launch {
            uiState = uiState.copy(isLoading = true, error = null)

            try {
                val apps = withContext(Dispatchers.IO) {
                    getInstalledApps()
                }

                val (supportedApps, otherApps) = apps.partition { it.isSupported }

                uiState = uiState.copy(
                    isLoading = false,
                    supportedApps = supportedApps,
                    otherApps = otherApps
                )
            } catch (e: Exception) {
                uiState = uiState.copy(
                    isLoading = false,
                    error = "Failed to load apps: ${e.message}"
                )
            }
        }
    }

    private suspend fun getInstalledApps(): List<AppInfo> = withContext(Dispatchers.IO) {
        packageManager.getInstalledApplications(PackageManager.GET_META_DATA)
            .filter { app ->
                // Filter out system apps that users can't interact with
                (app.flags and ApplicationInfo.FLAG_SYSTEM) == 0 ||
                        packageManager.getLaunchIntentForPackage(app.packageName) != null
            }
            .map { app ->
                val appName = packageManager.getApplicationLabel(app).toString()
                val appIcon = try {
                    packageManager.getApplicationIcon(app.packageName)
                } catch (e: Exception) {
                    null
                }

                // Check if app is officially supported
                val supportedApp =
                    SupportedApps.supportedApps.find { it.pkgName == app.packageName }

                AppInfo(
                    packageName = app.packageName,
                    appName = appName,
                    appIcon = appIcon,
                    isSupported = supportedApp != null,
                )
            }
            .sortedWith(compareBy<AppInfo> { !uiState.selectedApps.contains(it.packageName) }.thenBy { it.appName })
    }

    fun toggleAppSelection(packageName: String) {
        val currentSelectedApps = uiState.selectedApps.toMutableSet()
        if (currentSelectedApps.contains(packageName)) {
            currentSelectedApps.remove(packageName)
        } else {
            currentSelectedApps.add(packageName)
        }

        uiState = uiState.copy(selectedApps = currentSelectedApps)

        // Persist to preferences
        viewModelScope.launch {
            preferencesManager.updateSelectedApps(currentSelectedApps)
        }
    }

    fun retryLoadApps() {
        loadApps()
    }
}
