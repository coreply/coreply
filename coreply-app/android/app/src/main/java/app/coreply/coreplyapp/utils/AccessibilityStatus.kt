package app.coreply.coreplyapp.utils

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.view.accessibility.AccessibilityManager

/**
 * Created on 1/13/17.
 */
object AccessibilityStatus {
    fun isAccessibilityEnabled(context: Context?, activityName: String): Boolean {
        val manager =
            context!!.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
        val infos =
            manager.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_GENERIC)
        for (info in infos) {
            if (info.settingsActivityName != null && info.settingsActivityName == activityName) return true
        }
        return false
    }

    fun isAccessibilityEnabled(context: Context?): Boolean {
        return isAccessibilityEnabled(context, "app.coreply.coreplyapp.SettingsActivity")
    }
}