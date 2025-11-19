package app.coreply.coreplyapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.graphics.drawable.toBitmap
import androidx.lifecycle.viewmodel.compose.viewModel
import app.coreply.coreplyapp.theme.CoreplyTheme
import app.coreply.coreplyapp.ui.viewmodel.AppInfo
import app.coreply.coreplyapp.ui.viewmodel.AppSelectorViewModel

class AppSelectorActivity : ComponentActivity() {

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            CoreplyTheme {
                AppSelectorScreen(
                    onBackPressed = { finish() }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppSelectorScreen(
    onBackPressed: () -> Unit,
    viewModel: AppSelectorViewModel = viewModel()
) {
    val uiState = viewModel.uiState
    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior()

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            TopAppBar(
                scrollBehavior = scrollBehavior,
                title = { Text("Select Apps") },
                navigationIcon = {
                    IconButton(onClick = onBackPressed) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (!uiState.isLoading) {
                        IconButton(onClick = { viewModel.retryLoadApps() }) {
                            Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                        }
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading -> {
                    LoadingContent()
                }

                uiState.error != null -> {
                    ErrorContent(
                        error = uiState.error,
                        onRetry = { viewModel.retryLoadApps() }
                    )
                }

                else -> {
                    AppListContent(
                        supportedApps = uiState.supportedApps,
                        otherApps = uiState.otherApps,
                        selectedApps = uiState.selectedApps,
                        onAppToggle = viewModel::toggleAppSelection
                    )
                }
            }
        }
    }
}

@Composable
fun LoadingContent() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            CircularProgressIndicator(
                modifier = Modifier.size(48.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "Loading installed apps...",
                style = MaterialTheme.typography.bodyLarge,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
fun ErrorContent(
    error: String,
    onRetry: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.padding(32.dp)
        ) {
            Text(
                text = "Error",
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.error
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = error,
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(onClick = onRetry) {
                Text("Retry")
            }
        }
    }
}

@Composable
fun AppListContent(
    supportedApps: List<AppInfo>,
    otherApps: List<AppInfo>,
    selectedApps: Set<String>,
    onAppToggle: (String) -> Unit
) {
    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Supported Apps Section
        if (supportedApps.isNotEmpty()) {
            item {
                Text(
                    text = "Coreply Supported Apps",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            }

            items(supportedApps) { app ->
                AppSelectionItem(
                    app = app,
                    isSelected = selectedApps.contains(app.packageName),
                    onSelectionChanged = { onAppToggle(app.packageName) }
                )
            }
        }

        // Other Apps Section
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
                    isSelected = selectedApps.contains(app.packageName),
                    onSelectionChanged = { onAppToggle(app.packageName) }
                )
            }
        }

        // Empty state
        if (supportedApps.isEmpty() && otherApps.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No apps found",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
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
    onSelectionChanged: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
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
                        text = "Supported",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }

        Spacer(modifier = Modifier.width(8.dp))

        Switch(
            checked = isSelected,
            onCheckedChange = { onSelectionChanged() }
        )
    }

}
