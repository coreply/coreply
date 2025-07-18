package app.coreply.coreplyapp.ui.compose

import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.graphics.drawable.toBitmap
import app.coreply.coreplyapp.applistener.DetectedApp
import app.coreply.coreplyapp.applistener.SupportedApps
import app.coreply.coreplyapp.ui.viewmodel.SettingsViewModel

data class AppInfo(
    val packageName: String,
    val appName: String,
    val appIcon: Drawable?,
    val isSupported: Boolean = false,
    val supportedAppType: DetectedApp? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppSelectorScreen(
    onBackPressed: () -> Unit,
    viewModel: SettingsViewModel
) {
    val context = LocalContext.current
    val packageManager = context.packageManager

    // Get all installed apps
    val installedApps = remember {
        val apps = packageManager.getInstalledApplications(PackageManager.GET_META_DATA)
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
                val supportedApp = SupportedApps.supportedApps.find { it.pkgName == app.packageName }

                AppInfo(
                    packageName = app.packageName,
                    appName = appName,
                    appIcon = appIcon,
                    isSupported = supportedApp != null,
                    supportedAppType = supportedApp?.typeEnum
                )
            }
            .sortedWith(compareBy<AppInfo> { !it.isSupported }.thenBy { it.appName })

        apps
    }

    // Parse selected apps from preferences
    val selectedAppsSet = remember(viewModel.uiState.selectedApps) {
        viewModel.uiState.selectedApps
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Select Apps") },
                navigationIcon = {
                    IconButton(onClick = onBackPressed) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Officially Supported Apps Section
            val supportedApps = installedApps.filter { it.isSupported }
            if (supportedApps.isNotEmpty()) {
                item {
                    Text(
                        text = "Officially Supported Apps",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(vertical = 8.dp)
                    )
                }

                items(supportedApps) { app ->
                    AppSelectionItem(
                        app = app,
                        isSelected = selectedAppsSet.contains(app.packageName),
                        onSelectionChanged = { isSelected ->
                            val currentSelectedApps = selectedAppsSet.toMutableSet()
                            if (isSelected) {
                                currentSelectedApps.add(app.packageName)
                            } else {
                                currentSelectedApps.remove(app.packageName)
                            }
                            viewModel.updateSelectedApps(currentSelectedApps)
                        }
                    )
                }
            }

            // Other Apps Section
            val otherApps = installedApps.filter { !it.isSupported }
            if (otherApps.isNotEmpty()) {
                item {
                    Text(
                        text = "Other Apps",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(vertical = 8.dp)
                    )
                }

                items(otherApps) { app ->
                    AppSelectionItem(
                        app = app,
                        isSelected = selectedAppsSet.contains(app.packageName),
                        onSelectionChanged = { isSelected ->
                            val currentSelectedApps = selectedAppsSet.toMutableSet()
                            if (isSelected) {
                                currentSelectedApps.add(app.packageName)
                            } else {
                                currentSelectedApps.remove(app.packageName)
                            }
                            viewModel.updateSelectedApps(currentSelectedApps)
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun AppSelectionItem(
    app: AppInfo,
    isSelected: Boolean,
    onSelectionChanged: (Boolean) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                // App Icon
                app.appIcon?.let { icon ->
                    Image(
                        bitmap = icon.toBitmap(48, 48).asImageBitmap(),
                        contentDescription = "${app.appName} icon",
                        modifier = Modifier.size(48.dp)
                    )
                } ?: run {
                    Box(
                        modifier = Modifier.size(48.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("?", style = MaterialTheme.typography.headlineMedium)
                    }
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column {
                    Text(
                        text = app.appName,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = app.packageName,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    if (app.isSupported) {
                        Text(
                            text = "Officially Supported",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }

            Switch(
                checked = isSelected,
                onCheckedChange = onSelectionChanged
            )
        }
    }
}
