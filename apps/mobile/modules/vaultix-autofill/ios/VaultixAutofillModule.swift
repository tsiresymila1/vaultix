import ExpoModulesCore

// Writes the decrypted credential set into the App Group shared store so the
// AutoFill Credential Provider extension can read it. The App Group id must match
// the one in the config plugin + the extension entitlements.
private let appGroup = "group.ts.mila.vaultix"
private let credentialsKey = "vaultix_credentials"

public class VaultixAutofillModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VaultixAutofill")

    Function("save") { (json: String) in
      UserDefaults(suiteName: appGroup)?.set(json, forKey: credentialsKey)
    }

    Function("clear") {
      UserDefaults(suiteName: appGroup)?.removeObject(forKey: credentialsKey)
    }

    Function("isSupported") { () -> Bool in
      if #available(iOS 12.0, *) { return true }
      return false
    }
  }
}
