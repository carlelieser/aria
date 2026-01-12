Pod::Spec.new do |s|
  s.name           = 'AudioMetadata'
  s.version        = '1.0.0'
  s.summary        = 'Native audio metadata extraction for Expo'
  s.description    = 'Extracts audio metadata using native AVFoundation APIs'
  s.author         = 'Aria'
  s.homepage       = 'https://github.com/aria/audio-metadata'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '*.swift'
  s.swift_version = '5.4'
end
