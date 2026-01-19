package app.coreply.coreplyapp

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.coreply.coreplyapp.theme.CoreplyTheme
import app.coreply.coreplyapp.utils.GlobalPref.isAccessibilityEnabled

class WelcomeActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        
        val page = intent.getIntExtra("page", 0)
        
        setContent {
            CoreplyTheme {
                WelcomeScreen(
                    page = page,
                    onFinish = { finish() }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WelcomeScreen(
    page: Int,
    onFinish: () -> Unit
) {
    val context = LocalContext.current
    
    Scaffold(
        modifier = Modifier.fillMaxSize(),
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            when (page) {
                1 -> PermissionContent(
                    title = "Enable Overlay Permission",
                    description = "Coreply needs permission to display suggestions over other apps. This allows the app to show AI-powered text suggestions while you\'re typing in messaging apps.",
                    cardColors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    ),
                    cardHorizontalAlignment = Alignment.CenterHorizontally,
                    cardContent = {
                        Text(
                            text = "📱",
                            style = MaterialTheme.typography.headlineLarge
                        )
                        Text(
                            text = "This permission is safe and only used to show text suggestions",
                            style = MaterialTheme.typography.bodyMedium,
                            textAlign = TextAlign.Center,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    },
                    buttonContent = {
                        Button(
                            onClick = {
                                if (!isAccessibilityEnabled(context)) {
                                    // Navigate to accessibility permission
                                    val intent = Intent(context, WelcomeActivity::class.java)
                                    intent.putExtra("page", 2)
                                    context.startActivity(intent)
                                }
                                context.startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION))
                                onFinish()
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Open Settings")
                        }
                    }
                )
                2 -> PermissionContent(
                    title = "Accessibility Service Disclosure",
                    description = "Coreply uses the Accessibility Service to read on-screen messages and locate text fields in messaging apps. This is necessary for providing inline context aware texting suggestions.",
                    cardColors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer
                    ),
                    cardContent = {
                        Text(
                            text = "✅ Step by Step Guide",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSecondaryContainer
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "1. Open Accessibility Settings\n2. Select Coreply in the list of apps.\n3. Toggle on the switch",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSecondaryContainer
                        )
                    },
                    buttonContent = {
                        Button(
                            onClick = {
                                context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
                                onFinish()
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("I Accept")
                        }
                        
//                        TextButton(
//                            onClick = {
//                                // TODO: Implement video tutorial
//                            }
//                        ) {
//                            Text("Watch Setup Tutorial")
//                        }
                    }
                )
                3 -> PermissionContent(
                    title = "Disable Accessibility Service",
                    description = "To turn off Coreply, you need to disable the accessibility service in your device settings.",
                    cardColors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    ),
                    cardContent = {
                        Text(
                            text = "⚠️ Important",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Disabling the accessibility service will stop all Coreply features. You can re-enable it anytime from the app settings.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                    },
                    buttonContent = {
                        Button(
                            onClick = {
                                context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
                                onFinish()
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Open Accessibility Settings")
                        }
                        
                        TextButton(
                            onClick = onFinish
                        ) {
                            Text("Cancel")
                        }
                    }
                )
                else -> onFinish()
            }
        }
    }
}

@Composable
private fun ColumnScope.PermissionContent(
    title: String,
    description: String,
    cardColors: CardColors,
    cardHorizontalAlignment: Alignment.Horizontal = Alignment.Start,
    cardContent: @Composable ColumnScope.() -> Unit,
    buttonContent: @Composable ColumnScope.() -> Unit
) {
    // App icon
    Image(
        painter = painterResource(id = R.mipmap.ic_launcher_foreground),
        contentDescription = "Coreply Icon",
        modifier = Modifier.size(100.dp)
    )
    
    Text(
        text = title,
        style = MaterialTheme.typography.headlineSmall,
        fontWeight = FontWeight.Bold,
        textAlign = TextAlign.Center
    )
    
    Text(
        text = description,
        style = MaterialTheme.typography.bodyMedium,
        textAlign = TextAlign.Center,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = cardColors
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            horizontalAlignment = cardHorizontalAlignment,
            content = cardContent
        )
    }
    
    Spacer(modifier = Modifier.weight(1f))
    
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
        content = buttonContent
    )
}
