package ts.mila.vaultix.autofill

import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Writes the decrypted credential set into an EncryptedSharedPreferences file that
// the VaultixAutofillService reads. The file name must match the service.
private const val PREFS_FILE = "vaultix_autofill"
private const val CREDENTIALS_KEY = "credentials"

class VaultixAutofillModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("VaultixAutofill")

    Function("save") { json: String ->
      prefs().edit().putString(CREDENTIALS_KEY, json).apply()
    }

    Function("clear") {
      prefs().edit().remove(CREDENTIALS_KEY).apply()
    }

    Function("isSupported") {
      appContext.reactContext?.getSystemService(android.view.autofill.AutofillManager::class.java)?.isAutofillSupported == true
    }

    Function("isEnabled") {
      appContext.reactContext?.getSystemService(android.view.autofill.AutofillManager::class.java)?.hasEnabledAutofillServices() == true
    }

    Function("openSettings") {
      val ctx = appContext.reactContext ?: throw IllegalStateException("No context")
      val intent = android.content.Intent(android.provider.Settings.ACTION_REQUEST_SET_AUTOFILL_SERVICE).apply {
        data = android.net.Uri.parse("package:${ctx.packageName}")
        addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      ctx.startActivity(intent)
    }
  }

  private fun prefs(): SharedPreferences {
    val ctx = appContext.reactContext ?: throw IllegalStateException("No context")
    val masterKey = MasterKey.Builder(ctx)
      .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
      .build()
    return EncryptedSharedPreferences.create(
      ctx,
      PREFS_FILE,
      masterKey,
      EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
      EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )
  }
}
