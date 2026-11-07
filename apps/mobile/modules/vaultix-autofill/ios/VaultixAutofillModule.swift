import ExpoModulesCore
import AuthenticationServices
import Security

// Both targets use the same shared Keychain access group.
private let appGroup = "group.ts.mila.vaultix"
private let credentialsKey = "vaultix_credentials"

public class VaultixAutofillModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VaultixAutofill")

    Function("save") { (json: String) in
      let data = Data(json.utf8)
      var query = credentialQuery()
      let status = SecItemUpdate(query as CFDictionary, [kSecValueData: data] as CFDictionary)
      if status == errSecItemNotFound {
        query[kSecValueData] = data
        query[kSecAttrAccessible] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        guard SecItemAdd(query as CFDictionary, nil) == errSecSuccess else {
          throw NSError(domain: "VaultixAutofill", code: 1)
        }
      } else if status != errSecSuccess {
        throw NSError(domain: NSOSStatusErrorDomain, code: Int(status))
      }
      UserDefaults(suiteName: appGroup)?.removeObject(forKey: credentialsKey)
      if let records = try? JSONSerialization.jsonObject(with: data) as? [[String: String]] {
        let identities = records.compactMap { record -> ASPasswordCredentialIdentity? in
          guard let domain = record["domain"], !domain.isEmpty, !domain.hasPrefix("androidapp://"),
                let username = record["username"], let id = record["id"] else { return nil }
          return ASPasswordCredentialIdentity(serviceIdentifier: ASCredentialServiceIdentifier(identifier: domain, type: .domain), user: username, recordIdentifier: id)
        }
        ASCredentialIdentityStore.shared.replaceCredentialIdentities(with: identities)
      }
    }

    Function("clear") {
      let status = SecItemDelete(credentialQuery() as CFDictionary)
      guard status == errSecSuccess || status == errSecItemNotFound else {
        throw NSError(domain: NSOSStatusErrorDomain, code: Int(status))
      }
      UserDefaults(suiteName: appGroup)?.removeObject(forKey: credentialsKey)
      ASCredentialIdentityStore.shared.removeAllCredentialIdentities()
    }

    AsyncFunction("isEnabled") { (promise: Promise) in
      ASCredentialIdentityStore.shared.getState { state in promise.resolve(state.isEnabled) }
    }

    Function("isSupported") { () -> Bool in
      Bundle.main.builtInPlugInsURL.map { FileManager.default.fileExists(atPath: $0.appendingPathComponent("VaultixAutofill.appex").path) } ?? false
    }
  }
}

private func credentialQuery() -> [CFString: Any] {
  var query: [CFString: Any] = [kSecClass: kSecClassGenericPassword, kSecAttrService: credentialsKey]
  if let group = Bundle.main.object(forInfoDictionaryKey: "VaultixKeychainAccessGroup") as? String {
    query[kSecAttrAccessGroup] = group
  }
  return query
}
