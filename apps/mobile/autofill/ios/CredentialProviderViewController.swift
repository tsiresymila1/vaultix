import AuthenticationServices
import UIKit

// AutoFill Credential Provider Extension. Reads the credential set the main app
// wrote into the App Group store and offers matching logins in the QuickType bar
// / a simple picker. App Group id must match the bridge module + entitlements.
private let appGroup = "group.ts.mila.vaultix"
private let credentialsKey = "vaultix_credentials"

private struct Credential: Codable {
  let id: String
  let domain: String
  let username: String
  let password: String
}

private func loadCredentials() -> [Credential] {
  guard
    let json = UserDefaults(suiteName: appGroup)?.string(forKey: credentialsKey),
    let data = json.data(using: .utf8),
    let creds = try? JSONDecoder().decode([Credential].self, from: data)
  else { return [] }
  return creds
}

private func matches(_ creds: [Credential], identifiers: [ASCredentialServiceIdentifier]) -> [Credential] {
  let hosts = identifiers.compactMap { URL(string: $0.identifier)?.host ?? $0.identifier }
  if hosts.isEmpty { return creds }
  return creds.filter { c in
    hosts.contains { host in host.contains(c.domain) || c.domain.contains(host) }
  }
}

class CredentialProviderViewController: ASCredentialProviderViewController {
  private var items: [Credential] = []
  private let table = UITableView()

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = UIColor(red: 0.11, green: 0.11, blue: 0.11, alpha: 1) // #1c1c1c
    table.frame = view.bounds
    table.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    table.backgroundColor = .clear
    table.dataSource = self
    table.delegate = self
    view.addSubview(table)
    navigationItem.leftBarButtonItem = UIBarButtonItem(
      barButtonSystemItem: .cancel, target: self, action: #selector(cancel))
  }

  /// Silent path: fill without UI when the OS already knows which record.
  override func provideCredentialWithoutUserInteraction(for credentialIdentity: ASPasswordCredentialIdentity) {
    let creds = loadCredentials()
    if let c = creds.first(where: { $0.id == credentialIdentity.recordIdentifier }) {
      extensionContext.completeRequest(
        withSelectedCredential: ASPasswordCredential(user: c.username, password: c.password),
        completionHandler: nil)
    } else {
      extensionContext.cancelRequest(
        withError: NSError(domain: ASExtensionErrorDomain,
                           code: ASExtensionError.userInteractionRequired.rawValue))
    }
  }

  /// Interactive path: show a list filtered by the requesting app/site.
  override func prepareCredentialList(for serviceIdentifiers: [ASCredentialServiceIdentifier]) {
    items = matches(loadCredentials(), identifiers: serviceIdentifiers)
    table.reloadData()
  }

  @objc private func cancel() {
    extensionContext.cancelRequest(
      withError: NSError(domain: ASExtensionErrorDomain,
                         code: ASExtensionError.userCanceled.rawValue))
  }
}

extension CredentialProviderViewController: UITableViewDataSource, UITableViewDelegate {
  func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { items.count }

  func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = UITableViewCell(style: .subtitle, reuseIdentifier: nil)
    let c = items[indexPath.row]
    cell.textLabel?.text = c.domain
    cell.detailTextLabel?.text = c.username
    cell.backgroundColor = .clear
    cell.textLabel?.textColor = .white
    cell.detailTextLabel?.textColor = .gray
    return cell
  }

  func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
    let c = items[indexPath.row]
    extensionContext.completeRequest(
      withSelectedCredential: ASPasswordCredential(user: c.username, password: c.password),
      completionHandler: nil)
  }
}
