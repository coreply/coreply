package app.coreply.coreplymodule

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.view.accessibility.AccessibilityManager
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream

private const val SYSTEM_UI_PACKAGE_NAME = "com.android.systemui"

private fun getIconUri(packageManager: PackageManager, packageName: String): String {
  val drawable = try {
    packageManager.getApplicationIcon(packageName)
  } catch (_: Exception) {
    return ""
  }

  val bitmap = drawableToBitmap(drawable) ?: return ""
  val outputStream = ByteArrayOutputStream()
  bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)

  val encoded = Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)
  return "data:image/png;base64,$encoded"
}

private fun drawableToBitmap(drawable: Drawable): Bitmap? {
  if (drawable is BitmapDrawable) {
    return drawable.bitmap
  }

  val width = drawable.intrinsicWidth.takeIf { it > 0 } ?: 96
  val height = drawable.intrinsicHeight.takeIf { it > 0 } ?: 96
  val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
  val canvas = android.graphics.Canvas(bitmap)

  drawable.setBounds(0, 0, canvas.width, canvas.height)
  drawable.draw(canvas)

  return bitmap
}

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

    AsyncFunction("getInstalledAppsAsync") {
      val context = appContext.reactContext

      if (context == null) {
        return@AsyncFunction emptyList<Map<String, String>>()
      }

      val packageManager = context.packageManager

      return@AsyncFunction packageManager
        .getInstalledApplications(PackageManager.GET_META_DATA)
        .filter { app ->
          app.packageName == SYSTEM_UI_PACKAGE_NAME ||
          (app.flags and ApplicationInfo.FLAG_SYSTEM) == 0 ||
            packageManager.getLaunchIntentForPackage(app.packageName) != null
        }
        .map { app ->
          mapOf(
            "packageName" to app.packageName,
            "appName" to packageManager.getApplicationLabel(app).toString(),
            "iconUri" to getIconUri(packageManager, app.packageName),
          )
        }
        .sortedBy { it["appName"] ?: "" }
    }
  }
}
