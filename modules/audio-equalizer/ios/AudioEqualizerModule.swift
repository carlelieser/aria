import ExpoModulesCore
import AVFoundation

/**
 * Native Audio Equalizer Module for iOS
 *
 * Note: iOS does not support system-wide audio equalization when using AVPlayer
 * (which react-native-track-player uses). The AVAudioUnitEQ requires an AVAudioEngine
 * pipeline, but AVPlayer manages its own audio pipeline internally.
 *
 * This module stores equalizer settings and reports itself as unavailable.
 * A future implementation could use MTAudioProcessingTap or modify the player
 * to use AVAudioEngine instead of AVPlayer.
 *
 * For now, the equalizer UI will work but won't affect audio playback on iOS.
 */
public class AudioEqualizerModule: Module {
    private var isInitialized = false
    private var isEnabled = false
    private var bandLevels: [Float] = []

    // Standard 10-band EQ frequencies
    private let standardFrequencies: [Float] = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
    private let numberOfBands = 10
    private let minBandLevel: Float = -1500  // -15 dB in millibels
    private let maxBandLevel: Float = 1500   // +15 dB in millibels

    public func definition() -> ModuleDefinition {
        Name("AudioEqualizer")

        AsyncFunction("getEqualizerInfo") { (promise: Promise) in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    try self.initializeIfNeeded()
                    let result = self.getEqualizerInfoInternal()
                    promise.resolve(result)
                } catch {
                    promise.resolve(self.createUnavailableInfo())
                }
            }
        }

        AsyncFunction("getPresets") { (promise: Promise) in
            DispatchQueue.global(qos: .userInitiated).async {
                // iOS doesn't have built-in EQ presets like Android
                // Return empty array - presets are managed on the JS side
                promise.resolve([[String: Any]]())
            }
        }

        AsyncFunction("getState") { (promise: Promise) in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    try self.initializeIfNeeded()
                    let result = self.getStateInternal()
                    promise.resolve(result)
                } catch {
                    promise.resolve(self.createDisabledState())
                }
            }
        }

        AsyncFunction("setEnabled") { (enabled: Bool, promise: Promise) in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    try self.initializeIfNeeded()
                    try self.setEnabledInternal(enabled: enabled)
                    promise.resolve(nil)
                } catch {
                    promise.reject("EQ_ERROR", error.localizedDescription)
                }
            }
        }

        AsyncFunction("setBandLevel") { (bandIndex: Int, level: Int, promise: Promise) in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    try self.initializeIfNeeded()
                    try self.setBandLevelInternal(bandIndex: bandIndex, level: Float(level))
                    promise.resolve(nil)
                } catch {
                    promise.reject("EQ_ERROR", error.localizedDescription)
                }
            }
        }

        AsyncFunction("setBandLevels") { (levels: [Int], promise: Promise) in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    try self.initializeIfNeeded()
                    try self.setBandLevelsInternal(levels: levels.map { Float($0) })
                    promise.resolve(nil)
                } catch {
                    promise.reject("EQ_ERROR", error.localizedDescription)
                }
            }
        }

        AsyncFunction("usePreset") { (presetName: String, promise: Promise) in
            DispatchQueue.global(qos: .userInitiated).async {
                // iOS doesn't have built-in presets, so we just acknowledge
                // The JS side should call setBandLevels with the preset values
                promise.resolve(nil)
            }
        }

        AsyncFunction("release") { (promise: Promise) in
            DispatchQueue.global(qos: .userInitiated).async {
                self.releaseInternal()
                promise.resolve(nil)
            }
        }

        OnDestroy {
            self.releaseInternal()
        }
    }

    private func initializeIfNeeded() throws {
        guard !isInitialized else { return }

        // Initialize band levels to flat (0 gain)
        bandLevels = Array(repeating: 0, count: numberOfBands)

        // Note: iOS equalizer cannot affect AVPlayer audio playback.
        // We store settings for UI consistency but they won't affect audio.
        isInitialized = true
    }

    private func getEqualizerInfoInternal() -> [String: Any] {
        let bands: [[String: Any]] = standardFrequencies.enumerated().map { index, freq in
            // Approximate frequency range (half octave below and above)
            let minFreq = freq / 1.414 // sqrt(2)
            let maxFreq = freq * 1.414
            return [
                "minFrequency": Int(minFreq),
                "maxFrequency": Int(maxFreq),
                "centerFrequency": Int(freq)
            ]
        }

        // Report as unavailable since iOS equalizer cannot affect AVPlayer audio
        return [
            "isAvailable": false,
            "numberOfBands": numberOfBands,
            "minBandLevel": Int(minBandLevel),
            "maxBandLevel": Int(maxBandLevel),
            "bands": bands
        ]
    }

    private func getStateInternal() -> [String: Any?] {
        return [
            "isEnabled": isEnabled,
            "bandLevels": bandLevels.map { Int($0) },
            "presetName": nil
        ]
    }

    private func setEnabledInternal(enabled: Bool) throws {
        // Store setting for UI consistency, but cannot affect audio on iOS
        isEnabled = enabled
    }

    private func setBandLevelInternal(bandIndex: Int, level: Float) throws {
        guard bandIndex >= 0 && bandIndex < numberOfBands else {
            throw NSError(domain: "AudioEqualizer", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Band index \(bandIndex) out of range (0-\(numberOfBands - 1))"
            ])
        }

        // Store setting for UI consistency, but cannot affect audio on iOS
        let clampedLevel = min(max(level, minBandLevel), maxBandLevel)
        bandLevels[bandIndex] = clampedLevel
    }

    private func setBandLevelsInternal(levels: [Float]) throws {
        for i in 0..<min(levels.count, numberOfBands) {
            try setBandLevelInternal(bandIndex: i, level: levels[i])
        }
    }

    private func releaseInternal() {
        isInitialized = false
        isEnabled = false
        bandLevels = []
    }

    private func createUnavailableInfo() -> [String: Any] {
        return [
            "isAvailable": false,
            "numberOfBands": 0,
            "minBandLevel": 0,
            "maxBandLevel": 0,
            "bands": [[String: Any]]()
        ]
    }

    private func createDisabledState() -> [String: Any?] {
        return [
            "isEnabled": false,
            "bandLevels": [Int](),
            "presetName": nil
        ]
    }
}
