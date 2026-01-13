import ExpoModulesCore
import AVFoundation

/**
 * Native Audio Equalizer Module for iOS
 *
 * Uses AVAudioUnitEQ to provide audio equalization through the AVAudioEngine.
 * Note: This implementation is more complex on iOS because the audio engine
 * needs to be integrated with the existing audio playback system.
 */
public class AudioEqualizerModule: Module {
    private var audioEngine: AVAudioEngine?
    private var equalizer: AVAudioUnitEQ?
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

        // Note: Full AVAudioEngine integration would require modifying
        // the audio playback chain. For now, we store settings that can
        // be applied when integrated with the player.

        // Create the EQ unit for when we can integrate it
        let eq = AVAudioUnitEQ(numberOfBands: numberOfBands)
        equalizer = eq

        // Configure each band as a parametric EQ
        for i in 0..<numberOfBands {
            let band = eq.bands[i]
            band.filterType = .parametric
            band.frequency = standardFrequencies[i]
            band.bandwidth = 1.0 // Octave bandwidth
            band.gain = 0 // Start flat
            band.bypass = false
        }

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

        return [
            "isAvailable": true,
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
        isEnabled = enabled

        guard let eq = equalizer else { return }

        // Bypass all bands when disabled
        for band in eq.bands {
            band.bypass = !enabled
        }
    }

    private func setBandLevelInternal(bandIndex: Int, level: Float) throws {
        guard bandIndex >= 0 && bandIndex < numberOfBands else {
            throw NSError(domain: "AudioEqualizer", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Band index \(bandIndex) out of range (0-\(numberOfBands - 1))"
            ])
        }

        let clampedLevel = min(max(level, minBandLevel), maxBandLevel)
        bandLevels[bandIndex] = clampedLevel

        // Convert millibels to decibels for AVAudioUnitEQ
        let gainDb = clampedLevel / 100.0

        if let eq = equalizer {
            eq.bands[bandIndex].gain = gainDb
        }
    }

    private func setBandLevelsInternal(levels: [Float]) throws {
        for i in 0..<min(levels.count, numberOfBands) {
            try setBandLevelInternal(bandIndex: i, level: levels[i])
        }
    }

    private func releaseInternal() {
        if let engine = audioEngine, engine.isRunning {
            engine.stop()
        }
        audioEngine = nil
        equalizer = nil
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
