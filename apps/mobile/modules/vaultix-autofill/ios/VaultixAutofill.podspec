Pod::Spec.new do |s|
  s.name           = 'VaultixAutofill'
  s.version        = '0.1.0'
  s.summary        = 'Vaultix autofill bridge (shared credential store)'
  s.license        = 'MIT'
  s.author         = 'Vaultix'
  s.homepage       = 'https://vaultix-secure.vercel.app'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
end
