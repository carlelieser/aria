Pod::Spec.new do |s|
  s.name           = 'AudioVisualizer'
  s.version        = '1.0.0'
  s.summary        = 'Native audio visualizer for Expo'
  s.description    = 'Real-time audio visualization using native FFT/waveform APIs'
  s.author         = 'Aria'
  s.homepage       = 'https://github.com/aria/audio-visualizer'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '*.swift'
  s.swift_version = '5.4'
end
