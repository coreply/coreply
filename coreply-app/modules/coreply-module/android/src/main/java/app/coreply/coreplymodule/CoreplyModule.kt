package app.coreply.coreplymodule

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.view.accessibility.AccessibilityManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CoreplyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CoreplyModule")

    Function("hello") {
      "Hello world! 👋"
    }

    Function("isAccessibilityEnabled") {
      val context = appContext.reactContext

      if (context == null) {
        return@Function false
      } else {
        val manager =
          context.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
        val infos =
          manager.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_GENERIC)

        return@Function infos.any {
          it.settingsActivityName == "app.coreply.coreplyapp.SettingsActivity"
        }
      }
    }

    Function("requestDisableAccessibility") {
      CoreplyDisableRequests.emit()
    }
  }
}
