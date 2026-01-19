package app.coreply.coreplyapp.utils

import android.content.Context
import android.content.ContextWrapper
import android.util.TypedValue

/**
 * Created on 10/15/16.
 */

class PixelCalculator(context: Context?) : ContextWrapper(context) {
    fun dpToPx(dp: Int): Int {
        val scale = resources.displayMetrics.density
        return (dp * scale + 0.5f).toInt()
    }
    fun pxToSp(px: Float): Float {
        return if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            // For API 34+ (UPSIDE_DOWN_CAKE) use the recommended method
            TypedValue.deriveDimension(TypedValue.COMPLEX_UNIT_SP, px, resources.displayMetrics)
        } else {
            // For older API versions, use the traditional calculation
            px / resources.displayMetrics.scaledDensity
        }
    }

    fun spToPx(sp: Float): Float {
        return if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            // For API 34+ (UPSIDE_DOWN_CAKE) use the recommended method
            TypedValue.convertDimensionToPixels(TypedValue.COMPLEX_UNIT_SP, sp, resources.displayMetrics)
        } else {
            // For older API versions, use the traditional calculation
            sp * resources.displayMetrics.scaledDensity
        }
    }
}