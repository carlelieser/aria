Pod::Spec.new do |s|
  s.name           = 'AudioEqualizer'
  s.version        = '1.0.0'
  s.summary        = 'Native audio equalizer for Expo'
  s.description    = 'Audio equalizer controls using native AVFoundation APIs'
  s.author         = 'Aria'
  s.homepage       = 'https://github.com/aria/audio-equalizer'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '*.swift'
  s.swift_version = '5.4'
end
