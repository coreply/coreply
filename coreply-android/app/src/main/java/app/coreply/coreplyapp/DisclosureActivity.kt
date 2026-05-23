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

class DisclosureActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            CoreplyTheme {
                DisclosureScreen(
                    onFinish = { finish() }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DisclosureScreen(
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
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            PermissionContent(
                title = "Accessibility Service Disclosure",
                description = "Please read the following disclosure carefully.",
                cardColors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.secondaryContainer
                ),
                cardContent = {
                    Text(
                        text = "What data is collected",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSecondaryContainer
                    )
                    Spacer(modifier = Modifier.height(3.dp))
                    Text(
                        text = "Coreply's accessibility service reads on-screen text content, detects active text input fields and reads the text being typed. This app may collect emails, SMS or MMS messages, other in-app messages (e.g. your chat history in messaging apps), and/or other user-generated content (e.g. things your wrote or stored in different apps).",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSecondaryContainer
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "How your data is shared",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSecondaryContainer
                    )
                    Spacer(modifier = Modifier.height(3.dp))
                    Text(
                        text = "The data described above will be sent to the API or service according to your setup. The purpose of the data collection/sharing described above is to generate context-aware typing suggestions, which is this app's core feature.",
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
                        Text("I Agree & Enable")
                    }

                    TextButton(
                        onClick = onFinish
                    ) {
                        Text("I don't consent / Go back")
                    }
                }
            )

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
        modifier = Modifier.size(60.dp)
    )

    Text(
        text = title,
        style = MaterialTheme.typography.titleLarge,
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
        content = buttonContent
    )
}
