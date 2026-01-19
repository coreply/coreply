package app.coreply.coreplyapp.utils

import android.content.Context
import android.content.SharedPreferences
import androidx.preference.PreferenceManager

/**
 * Legacy preference helper - for backward compatibility only.
 * Use PreferencesManager for new preference management.
 */
object PreferenceHelper {
    lateinit var preferences: SharedPreferences
    
    fun init(context: Context) {
        preferences = PreferenceManager.getDefaultSharedPreferences(context)
    }

    private inline fun SharedPreferences.edit(operation: (SharedPreferences.Editor) -> Unit) {
        val editor = this.edit()
        operation(editor)
        editor.apply()
    }

    /**
     * puts a value for the given [key].
     */
    operator fun SharedPreferences.set(key: String, value: Any?)
            = when (value) {
        is String? -> preferences.edit { it.putString(key, value) }
        is Int -> preferences.edit { it.putInt(key, value) }
        is Boolean -> preferences.edit { it.putBoolean(key, value) }
        is Float -> preferences.edit { it.putFloat(key, value) }
        is Long -> preferences.edit { it.putLong(key, value) }
        else -> throw UnsupportedOperationException("Not yet implemented")
    }

    /**
     * finds a preference based on the given [key].
     * [T] is the type of value
     * @param defaultValue optional defaultValue - will take a default defaultValue if it is not specified
     */
    inline operator fun <reified T : Any> get(key: String, defaultValue: T? = null): T
            = when (T::class) {
        String::class -> preferences.getString(key, defaultValue as? String ?: "") as T
        Int::class -> preferences.getInt(key, defaultValue as? Int ?: -1) as T
        Boolean::class -> preferences.getBoolean(key, defaultValue as? Boolean ?: false) as T
        Float::class -> preferences.getFloat(key, defaultValue as? Float ?: -1f) as T
        Long::class -> preferences.getLong(key, defaultValue as? Long ?: -1) as T
        else -> throw UnsupportedOperationException("Not yet implemented")
    }
}