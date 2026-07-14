package app.coreply.coreplyapp
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.enableEdgeToEdge
import app.coreply.coreplyapp.data.PreferencesManager
import app.coreply.coreplyapp.data.SuggestionPresentationType
import app.coreply.coreplyapp.utils.AccessibilityStatus

import com.facebook.react.ReactActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper
import expo.modules.brownfield.BrownfieldMessaging
import expo.modules.brownfield.BrownfieldState

class RnActivity : ReactActivity(){
    private lateinit var brownfieldListenerId: String
    private lateinit var preferencesManager: PreferencesManager

    override fun onCreate(savedInstanceState: Bundle?) {
        // Set the theme to AppTheme BEFORE onCreate to support
        // coloring the background, status bar, and navigation bar.
        // This is required for expo-splash-screen.
        setTheme(R.style.AppThemeNoActionBar);
        enableEdgeToEdge()
        BrownfieldState.getOrCreate("accessibilityEnabled")
        BrownfieldState.set("accessibilityEnabled", AccessibilityStatus.isAccessibilityEnabled(this))
        
        preferencesManager = PreferencesManager.getInstance(applicationContext)
        brownfieldListenerId = BrownfieldMessaging.addListener { event ->
            when (event["type"] as? String) {
                "settingsUpdated" -> {
                    val payload = event["data"]
                    val settings = payload as? Map<*, *>
                    if (settings != null) {
                        val selectedApps = (settings["selectedApps"] as? List<*>)
                            ?.mapNotNull { item -> item as? String }
                            ?.toSet()
                        val globalSettings = settings["globalSettings"] as? Map<*, *>

                        MainScope().launch {
                            if (selectedApps != null) {
                                preferencesManager.updateSelectedApps(selectedApps)
                            }

                            val presentationSettings =
                                globalSettings?.get("presentation") as? Map<*, *>

                            val showErrors = presentationSettings?.get("showErrors") as? Boolean
                            if (showErrors != null) {
                                preferencesManager.updateShowErrors(showErrors)
                            }

                            val suggestionPresentationType =
                                when (presentationSettings?.get("suggestionPresentationType") as? String) {
                                    "overlay" -> SuggestionPresentationType.BUBBLE
                                    "inline" -> SuggestionPresentationType.INLINE
                                    "both" -> SuggestionPresentationType.BOTH
                                    else -> null
                                }
                            if (suggestionPresentationType != null) {
                                preferencesManager.updateSuggestionPresentationType(
                                    suggestionPresentationType,
                                )
                            }
                        }
                    }
                }
            }
        }
        
        super.onCreate(null)
    }

    override fun onResume() {
        BrownfieldState.set("accessibilityEnabled", AccessibilityStatus.isAccessibilityEnabled(this))
        super.onResume()
    }

    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String = "main"

    /**
     * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
     * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
     */

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return ReactActivityDelegateWrapper(
            this,
            true,
            object : DefaultReactActivityDelegate(
                this,
                mainComponentName,
                fabricEnabled
            ){
                override fun getLaunchOptions(): Bundle {
                    val bundle = super.launchOptions ?: Bundle()
                    bundle.putString("messageFromNativeCode", "Hello from RnActivity!")
                    return bundle
                }
            })
    }

    /**
     * Align the back button behavior with Android S
     * where moving root activities to background instead of finishing activities.
     * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
     */
    override fun invokeDefaultOnBackPressed() {
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
            if (!moveTaskToBack(false)) {
                // For non-root activities, use the default implementation to finish them.
                super.invokeDefaultOnBackPressed()
            }
            return
        }

        // Use the default back button implementation on Android S
        // because it's doing more than [Activity.moveTaskToBack] in fact.
        super.invokeDefaultOnBackPressed()
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::brownfieldListenerId.isInitialized) {
            BrownfieldMessaging.removeListener(brownfieldListenerId)
        }
    }
}
