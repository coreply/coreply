package app.coreply.coreplyapp

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.preference.Preference
import androidx.preference.PreferenceFragmentCompat
import androidx.preference.SwitchPreferenceCompat
import app.coreply.coreplyapp.data.PreferencesManager
import app.coreply.coreplyapp.utils.GlobalPref
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Created on 12/24/16.
 */
open class SettingsFragment : PreferenceFragmentCompat() {
    private var master: SwitchPreferenceCompat? = null
    override fun onCreatePreferences(savedInstanceState: Bundle?, rootKey: String?) {
        addPreferencesFromResource(R.xml.pref_main)

        master = findPreference<SwitchPreferenceCompat?>("master_switch")
        refreshAuto()
        master!!.onPreferenceChangeListener = object : Preference.OnPreferenceChangeListener {
            override fun onPreferenceChange(preference: Preference, newValue: Any?): Boolean {
                if (newValue as Boolean) {
                    val i = Intent(activity, WelcomeActivity::class.java)
                    i.putExtra(
                        "page",
                        GlobalPref.getFirstRunActivityPageNumber(activity)
                    )
                    startActivity(i)
                } else {
                    val context = activity ?: return false
                    CoroutineScope(Dispatchers.Main).launch {
                        PreferencesManager.getInstance(context).updateMasterSwitch(false)
                    }
                }
                return true
            }
        }


        findPreference<Preference?>("github")!!.setOnPreferenceClickListener(object :
            Preference.OnPreferenceClickListener {
            override fun onPreferenceClick(preference: Preference): Boolean {
                val uri = Uri.parse("https://github.com/coreply/coreply")
                val intent = Intent(Intent.ACTION_VIEW, uri)
                startActivity(intent)
                return true
            }
        })
        findPreference<Preference?>("followIG")!!.setOnPreferenceClickListener(object :
            Preference.OnPreferenceClickListener {
            override fun onPreferenceClick(preference: Preference): Boolean {
                val uri = Uri.parse("https://instagram.com/_u/coreply.app")
                val intent = Intent(Intent.ACTION_VIEW, uri)
                intent.setPackage("com.instagram.android")
                try {
                    startActivity(intent)
                } catch (e: ActivityNotFoundException) {
                    startActivity(
                        Intent(
                            Intent.ACTION_VIEW,
                            Uri.parse("https://instagram.com/coreply.app")
                        )
                    )
                }
                return true
            }
        })
    }

    override fun onResume() {
        super.onResume()
        refreshAuto()
    }

    fun refreshAuto() {
        master!!.setChecked(GlobalPref.isAccessibilityEnabled(activity))
    }
}
