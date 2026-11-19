package app.coreply.coreplyapp.data

import android.content.Context
import org.asyncstorage.shared_storage.Entry
import org.asyncstorage.storage.StorageRegistry

object SettingsMigrations {
    const val STORAGE_NAME = "coreply.migrations"
    private const val SETTINGS_SCHEMA_VERSION_KEY = "settingsSchemaVersion"
    private const val INITIAL_SETTINGS_SCHEMA_VERSION = 1

    suspend fun run(context: Context) {
        LegacyNativeToExpoSettingsMigration(context).migrateIfNeeded()

        val storage = StorageRegistry.getStorage(context, STORAGE_NAME)
        val version = storage.getValues(listOf(SETTINGS_SCHEMA_VERSION_KEY)).firstOrNull()?.value
        if (version == null) {
            storage.setValues(
                listOf(Entry(SETTINGS_SCHEMA_VERSION_KEY, INITIAL_SETTINGS_SCHEMA_VERSION.toString())),
            )
        }
    }
}
