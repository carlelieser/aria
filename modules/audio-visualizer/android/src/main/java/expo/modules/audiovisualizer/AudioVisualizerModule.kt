package expo.modules.audiovisualizer

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.audiofx.Visualizer
import android.os.Handler
import android.os.Looper
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

/**
 * Native Audio Visualizer Module for Android
 *
 * Uses android.media.audiofx.Visualizer on session 0 (global output mix)
 * to capture real-time FFT data. Processes FFT into 4 frequency bands
 * and emits normalized levels at ~20 Hz for smooth visualization.
 *
 * Requires RECORD_AUDIO and MODIFY_AUDIO_SETTINGS permissions.
 */
class AudioVisualizerModule : Module() {
    private var visualizer: Visualizer? = null
    private var isCapturing = false
    private val handler = Handler(Looper.getMainLooper())

    companion object {
        private const val TAG = "AudioVisualizer"
        private const val BAND_COUNT = 4
        private const val CAPTURE_SIZE = 128
        private const val TARGET_CAPTURE_RATE = 20000
        private const val START_DELAY_MS = 300L

        private val BAND_EDGES = floatArrayOf(20f, 250f, 2000f, 6000f, 20000f)

        private const val MIN_DB = 0f
        private const val MAX_DB = 45f
    }

    private val context: Context
        get() = appContext.reactContext ?: throw IllegalStateException("React context is null")

    override fun definition() = ModuleDefinition {
        Name("AudioVisualizer")

        Events("onAudioLevels")

        Function("isAvailable") {
            return@Function true
        }

        AsyncFunction("startCapture") { promise: Promise ->
            handler.post {
                try {
                    startCaptureInternal()
                } catch (e: Exception) {
                    Log.w(TAG, "startCapture failed", e)
                }
                promise.resolve(null)
            }
        }

        AsyncFunction("stopCapture") { promise: Promise ->
            handler.post {
                stopCaptureInternal()
                promise.resolve(null)
            }
        }

        OnDestroy {
            handler.post { releaseInternal() }
        }
    }

    private fun hasRecordPermission(): Boolean {
        return context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED
    }

    private fun startCaptureInternal() {
        if (!hasRecordPermission()) {
            Log.w(TAG, "RECORD_AUDIO permission not granted")
            return
        }

        // Always recreate — handles session changes after play/pause/seek
        releaseVisualizer()
        isCapturing = true

        // Delay Visualizer creation to let the audio session stabilize.
        // Creating immediately after playback starts can attach to a
        // stale session and miss audio data.
        handler.postDelayed({
            if (!isCapturing) return@postDelayed
            createVisualizer()
        }, START_DELAY_MS)
    }

    private fun stopCaptureInternal() {
        isCapturing = false
        handler.removeCallbacksAndMessages(null)
        releaseVisualizer()
    }

    private fun createVisualizer() {
        try {
            val viz = Visualizer(0)
            viz.enabled = false
            viz.captureSize = CAPTURE_SIZE

            val captureRate = min(TARGET_CAPTURE_RATE, Visualizer.getMaxCaptureRate())
            val result = viz.setDataCaptureListener(
                object : Visualizer.OnDataCaptureListener {
                    override fun onWaveFormDataCapture(
                        visualizer: Visualizer?,
                        waveform: ByteArray?,
                        samplingRate: Int
                    ) {}

                    override fun onFftDataCapture(
                        visualizer: Visualizer?,
                        fft: ByteArray?,
                        samplingRate: Int
                    ) {
                        if (fft == null || !isCapturing) return
                        processFFT(fft, samplingRate)
                    }
                },
                captureRate,
                false,
                true
            )
            if (result != Visualizer.SUCCESS) {
                Log.w(TAG, "setDataCaptureListener failed: $result")
                return
            }
            viz.enabled = true
            visualizer = viz
        } catch (e: Exception) {
            Log.w(TAG, "Visualizer creation failed", e)
            visualizer = null
        }
    }

    private fun processFFT(fft: ByteArray, samplingRate: Int) {
        val sampleRateHz = samplingRate / 1000f
        val binCount = fft.size / 2
        val binWidth = sampleRateHz / (binCount * 2f)

        val bandLevels = FloatArray(BAND_COUNT)
        val bandCounts = IntArray(BAND_COUNT)

        for (i in 1 until binCount) {
            val frequency = i * binWidth
            val bandIndex = getBandIndex(frequency)
            if (bandIndex < 0) continue

            val realIndex = i * 2
            val imagIndex = realIndex + 1
            if (imagIndex >= fft.size) break

            val real = fft[realIndex].toFloat()
            val imag = fft[imagIndex].toFloat()
            val magnitude = sqrt(real * real + imag * imag)

            bandLevels[bandIndex] += magnitude
            bandCounts[bandIndex]++
        }

        val levels = mutableListOf<Double>()
        for (i in 0 until BAND_COUNT) {
            val avgMagnitude = if (bandCounts[i] > 0) {
                bandLevels[i] / bandCounts[i]
            } else {
                0f
            }

            val db = if (avgMagnitude > 0) {
                20f * ln(avgMagnitude.toDouble()).toFloat() / ln(10f)
            } else {
                MIN_DB
            }

            val normalized = ((db - MIN_DB) / (MAX_DB - MIN_DB)).toDouble()
            levels.add(max(0.0, min(1.0, normalized)))
        }

        sendEvent("onAudioLevels", mapOf("levels" to levels))
    }

    private fun getBandIndex(frequency: Float): Int {
        for (i in 0 until BAND_COUNT) {
            if (frequency >= BAND_EDGES[i] && frequency < BAND_EDGES[i + 1]) {
                return i
            }
        }
        return -1
    }

    private fun releaseVisualizer() {
        try {
            visualizer?.enabled = false
            visualizer?.release()
        } catch (_: Exception) {}
        visualizer = null
    }

    private fun releaseInternal() {
        isCapturing = false
        handler.removeCallbacksAndMessages(null)
        releaseVisualizer()
    }
}
