package ts.mila.vaultix.autofill

import android.app.assist.AssistStructure
import android.os.CancellationSignal
import android.service.autofill.AutofillService
import android.service.autofill.Dataset
import android.service.autofill.FillCallback
import android.service.autofill.FillRequest
import android.service.autofill.FillResponse
import android.service.autofill.SaveCallback
import android.service.autofill.SaveRequest
import android.view.View
import android.view.autofill.AutofillId
import android.view.autofill.AutofillValue
import android.widget.RemoteViews
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.json.JSONArray

// Android AutofillService. Reads the credential set the app wrote into the shared
// EncryptedSharedPreferences (same file as VaultixAutofillModule) and offers
// datasets for detected username/password fields.
private const val PREFS_FILE = "vaultix_autofill"
private const val CREDENTIALS_KEY = "credentials"

data class Cred(val id: String, val domain: String, val username: String, val password: String)

class VaultixAutofillService : AutofillService() {

  override fun onFillRequest(
    request: FillRequest,
    cancellationSignal: CancellationSignal,
    callback: FillCallback,
  ) {
    val structure = request.fillContexts.lastOrNull()?.structure
    if (structure == null) {
      callback.onSuccess(null)
      return
    }

    val fields = parseFields(structure)
    if (fields.usernameId == null && fields.passwordId == null) {
      callback.onSuccess(null)
      return
    }

    val creds = loadCredentials()
    if (creds.isEmpty()) {
      callback.onSuccess(null)
      return
    }

    val responseBuilder = FillResponse.Builder()
    for (c in creds.take(8)) {
      val presentation = RemoteViews(packageName, android.R.layout.simple_list_item_1).apply {
        setTextViewText(android.R.id.text1, "${c.domain} — ${c.username}")
      }
      val dataset = Dataset.Builder().apply {
        fields.usernameId?.let { setValue(it, AutofillValue.forText(c.username), presentation) }
        fields.passwordId?.let { setValue(it, AutofillValue.forText(c.password), presentation) }
      }.build()
      responseBuilder.addDataset(dataset)
    }
    callback.onSuccess(responseBuilder.build())
  }

  // Saving new logins from the OS is out of scope for the scaffold (the app + the
  // browser extension already handle "save from page").
  override fun onSaveRequest(request: SaveRequest, callback: SaveCallback) {
    callback.onSuccess()
  }

  private data class Fields(var usernameId: AutofillId?, var passwordId: AutofillId?)

  private fun parseFields(structure: AssistStructure): Fields {
    val fields = Fields(null, null)
    for (i in 0 until structure.windowNodeCount) {
      traverse(structure.getWindowNodeAt(i).rootViewNode, fields)
    }
    return fields
  }

  private fun traverse(node: AssistStructure.ViewNode, fields: Fields) {
    val hints = node.autofillHints
    val id = node.autofillId
    if (id != null) {
      val hintStr = (hints?.joinToString(" ") ?: "").lowercase()
      val idEntry = (node.idEntry ?: "").lowercase()
      val isPassword = node.inputType and android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD != 0 ||
        hintStr.contains("password") || idEntry.contains("password")
      val isUsername = hintStr.contains("username") || hintStr.contains("email") ||
        idEntry.contains("user") || idEntry.contains("email") || idEntry.contains("login")
      if (isPassword && fields.passwordId == null) fields.passwordId = id
      else if (isUsername && fields.usernameId == null) fields.usernameId = id
    }
    for (i in 0 until node.childCount) traverse(node.getChildAt(i), fields)
  }

  private fun loadCredentials(): List<Cred> {
    return try {
      val masterKey = MasterKey.Builder(this)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()
      val prefs = EncryptedSharedPreferences.create(
        this, PREFS_FILE, masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
      )
      val json = prefs.getString(CREDENTIALS_KEY, null) ?: return emptyList()
      val arr = JSONArray(json)
      (0 until arr.length()).map { i ->
        val o = arr.getJSONObject(i)
        Cred(o.getString("id"), o.getString("domain"), o.getString("username"), o.getString("password"))
      }
    } catch (e: Exception) {
      emptyList()
    }
  }

  @Suppress("unused")
  private fun ignore(v: View) {}
}
