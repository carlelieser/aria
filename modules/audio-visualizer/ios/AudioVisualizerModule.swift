import ExpoModulesCore
import AVFoundation
import Accelerate

/**
 * Native Audio Visualizer Module for iOS
 *
 * Uses MTAudioProcessingTap on AVPlayerItem's audioMix to capture real-time
 * audio data from the playback engine. Processes audio using vDSP FFT into
 * 4 frequency bands and emits normalized levels via CADisplayLink at ~30 fps.
 *
 * No microphone permission needed — taps into the player pipeline directly.
 */
public class AudioVisualizerModule: Module {
    private var isCapturing = false
    private var displayLink: CADisplayLink?
    private var playerObserver: NSKeyValueObservation?
    private var currentItem: AVPlayerItem?
    private var latestLevels: [Double] = [0, 0, 0, 0]
    private let levelsLock = NSLock()

    // FFT setup
    private var fftSetup: vDSP_DFT_Setup?
    private let fftSize = 128

    // Band boundaries in Hz
    private static let bandEdges: [Float] = [20, 250, 2000, 6000, 20000]
    private static let bandCount = 4
    private static let minDB: Float = -60
    private static let maxDB: Float = 0

    // Frame counter for throttling to ~30 fps
    private var frameCounter = 0

    public func definition() -> ModuleDefinition {
        Name("AudioVisualizer")

        Events("onAudioLevels")

        Function("isAvailable") {
            return true
        }

        AsyncFunction("startCapture") { (promise: Promise) in
            DispatchQueue.main.async {
                self.startCaptureInternal()
                promise.resolve(nil)
            }
        }

        AsyncFunction("stopCapture") { (promise: Promise) in
            DispatchQueue.main.async {
                self.stopCaptureInternal()
                promise.resolve(nil)
            }
        }

        OnDestroy {
            self.releaseInternal()
        }
    }

    // MARK: - Capture lifecycle

    private func startCaptureInternal() {
        guard !isCapturing else { return }
        isCapturing = true

        fftSetup = vDSP_DFT_zop_CreateSetup(nil, vDSP_Length(fftSize), .FORWARD)

        observePlayer()
        startDisplayLink()
    }

    private func stopCaptureInternal() {
        isCapturing = false
        stopDisplayLink()
        playerObserver?.invalidate()
        playerObserver = nil
        detachTap()

        if let setup = fftSetup {
            vDSP_DFT_DestroySetup(setup)
            fftSetup = nil
        }
    }

    private func releaseInternal() {
        stopCaptureInternal()
    }

    // MARK: - Player observation

    private func observePlayer() {
        guard let player = findAVQueuePlayer() else { return }

        // Observe current item changes
        playerObserver = player.observe(\.currentItem, options: [.new, .initial]) { [weak self] player, _ in
            DispatchQueue.main.async {
                self?.onPlayerItemChanged(player.currentItem)
            }
        }
    }

    private func findAVQueuePlayer() -> AVQueuePlayer? {
        // Access RNTP's shared player through the SwiftAudioEx/TrackPlayer bridge
        // react-native-track-player exposes its player via a shared instance
        guard let rntpClass = NSClassFromString("MusicService") ?? NSClassFromString("RNTrackPlayer") else {
            return findPlayerViaAudioSession()
        }

        // Try to access the shared instance and its player property
        if let sharedSelector = NSSelectorFromString("sharedInstance"),
           rntpClass.responds(to: sharedSelector),
           let shared = (rntpClass as AnyObject).perform(sharedSelector)?.takeUnretainedValue() {
            if let playerSelector = NSSelectorFromString("player"),
               shared.responds(to: playerSelector),
               let playerObj = shared.perform(playerSelector)?.takeUnretainedValue() as? AVQueuePlayer {
                return playerObj
            }
        }

        return findPlayerViaAudioSession()
    }

    private func findPlayerViaAudioSession() -> AVQueuePlayer? {
        // Fallback: no direct player access available
        // Without player access, we cannot attach an audio processing tap
        return nil
    }

    private func onPlayerItemChanged(_ item: AVPlayerItem?) {
        detachTap()
        currentItem = item

        guard isCapturing, let item = item else { return }
        attachTap(to: item)
    }

    // MARK: - MTAudioProcessingTap

    private func attachTap(to item: AVPlayerItem) {
        guard let track = item.asset.tracks(withMediaType: .audio).first else { return }

        var callbacks = MTAudioProcessingTapCallbacks(
            version: kMTAudioProcessingTapCallbacksVersion_0,
            clientInfo: UnsafeMutableRawPointer(Unmanaged.passRetained(self).toOpaque()),
            init: tapInit,
            finalize: tapFinalize,
            prepare: tapPrepare,
            unprepare: tapUnprepare,
            process: tapProcess
        )

        var tap: Unmanaged<MTAudioProcessingTap>?
        let status = MTAudioProcessingTapCreate(kCFAllocatorDefault, &callbacks, kMTAudioProcessingTapCreationFlag_PostEffects, &tap)

        guard status == noErr, let unwrappedTap = tap else { return }

        let params = AVMutableAudioMixInputParameters(track: track)
        params.audioTapProcessor = unwrappedTap.takeUnretainedValue()

        let audioMix = AVMutableAudioMix()
        audioMix.inputParameters = [params]
        item.audioMix = audioMix

        unwrappedTap.release()
    }

    private func detachTap() {
        currentItem?.audioMix = nil
        currentItem = nil
    }

    // MARK: - Tap callbacks (C-function style)

    private let tapInit: MTAudioProcessingTapInitCallback = { tap, clientInfo, tapStorageOut in
        tapStorageOut.pointee = clientInfo
    }

    private let tapFinalize: MTAudioProcessingTapFinalizeCallback = { tap in
        let clientInfo = MTAudioProcessingTapGetStorage(tap)
        Unmanaged<AudioVisualizerModule>.fromOpaque(clientInfo).release()
    }

    private let tapPrepare: MTAudioProcessingTapPrepareCallback = { tap, maxFrames, processingFormat in
        // No preparation needed
    }

    private let tapUnprepare: MTAudioProcessingTapUnprepareCallback = { tap in
        // No cleanup needed
    }

    private let tapProcess: MTAudioProcessingTapProcessCallback = { tap, numberFrames, flags, bufferListInOut, numberFramesOut, flagsOut in
        let status = MTAudioProcessingTapGetSourceAudio(tap, numberFrames, bufferListInOut, flagsOut, nil, numberFramesOut)
        guard status == noErr else { return }

        let storage = MTAudioProcessingTapGetStorage(tap)
        let module = Unmanaged<AudioVisualizerModule>.fromOpaque(storage).takeUnretainedValue()

        guard module.isCapturing else { return }

        // Get audio buffer
        let bufferList = UnsafeMutableAudioBufferListPointer(bufferListInOut)
        guard let firstBuffer = bufferList.first,
              let data = firstBuffer.mData else { return }

        let frameCount = Int(firstBuffer.mDataByteSize) / MemoryLayout<Float>.size
        let samples = data.bindMemory(to: Float.self, capacity: frameCount)

        module.processAudioBuffer(samples: samples, frameCount: frameCount)
    }

    // MARK: - Audio processing

    private func processAudioBuffer(samples: UnsafePointer<Float>, frameCount: Int) {
        guard let setup = fftSetup else { return }

        let n = min(frameCount, fftSize)

        // Prepare FFT input
        var realInput = [Float](repeating: 0, count: fftSize)
        var imagInput = [Float](repeating: 0, count: fftSize)
        for i in 0..<n {
            realInput[i] = samples[i]
        }

        // Apply Hann window
        var window = [Float](repeating: 0, count: fftSize)
        vDSP_hann_window(&window, vDSP_Length(fftSize), Int32(vDSP_HANN_NORM))
        vDSP_vmul(realInput, 1, window, 1, &realInput, 1, vDSP_Length(fftSize))

        // Perform FFT
        var realOutput = [Float](repeating: 0, count: fftSize)
        var imagOutput = [Float](repeating: 0, count: fftSize)
        vDSP_DFT_Execute(setup, realInput, imagInput, &realOutput, &imagOutput)

        // Compute magnitudes
        let binCount = fftSize / 2
        var magnitudes = [Float](repeating: 0, count: binCount)
        for i in 0..<binCount {
            let real = realOutput[i]
            let imag = imagOutput[i]
            magnitudes[i] = sqrtf(real * real + imag * imag)
        }

        // Determine sample rate from audio session
        let sampleRate = Float(AVAudioSession.sharedInstance().sampleRate)
        let binWidth = sampleRate / Float(fftSize)

        // Map to frequency bands
        var bandLevels = [Float](repeating: 0, count: Self.bandCount)
        var bandCounts = [Int](repeating: 0, count: Self.bandCount)

        for i in 1..<binCount {
            let frequency = Float(i) * binWidth
            guard let bandIndex = getBandIndex(frequency: frequency) else { continue }

            bandLevels[bandIndex] += magnitudes[i]
            bandCounts[bandIndex] += 1
        }

        // Average and normalize
        var levels = [Double](repeating: 0, count: Self.bandCount)
        for i in 0..<Self.bandCount {
            let avg = bandCounts[i] > 0 ? bandLevels[i] / Float(bandCounts[i]) : 0
            let db: Float = avg > 0 ? 20 * log10f(avg) : Self.minDB
            let normalized = Double((db - Self.minDB) / (Self.maxDB - Self.minDB))
            levels[i] = max(0, min(1, normalized))
        }

        levelsLock.lock()
        latestLevels = levels
        levelsLock.unlock()
    }

    private func getBandIndex(frequency: Float) -> Int? {
        for i in 0..<Self.bandCount {
            if frequency >= Self.bandEdges[i] && frequency < Self.bandEdges[i + 1] {
                return i
            }
        }
        return nil
    }

    // MARK: - Display link for throttled emission

    private func startDisplayLink() {
        let link = CADisplayLink(target: self, selector: #selector(displayLinkFired))
        link.preferredFrameRateRange = CAFrameRateRange(minimum: 20, maximum: 30, preferred: 30)
        link.add(to: .main, forMode: .common)
        displayLink = link
    }

    private func stopDisplayLink() {
        displayLink?.invalidate()
        displayLink = nil
    }

    @objc private func displayLinkFired() {
        guard isCapturing else { return }

        levelsLock.lock()
        let levels = latestLevels
        levelsLock.unlock()

        sendEvent("onAudioLevels", ["levels": levels])
    }
}
