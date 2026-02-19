package expo.modules.audiovisualizer

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.audiofx.Visualizer
import android.os.Handler
import android.os.Looper
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
 * Uses android.media.audiofx.Visualizer on the global output mix (session 0) to
 * capture real-time FFT data. Processes FFT into 4 frequency bands and emits
 * normalized levels at ~30 Hz for smooth visualization.
 *
 * Uses session 0 (global output mix) to avoid interfering with the media player's
 * audio session. This approach is read-only and does not modify the audio pipeline.
 *
 * Requires RECORD_AUDIO permission.
 */
class AudioVisualizerModule : Module() {
    private var visualizer: Visualizer? = null
    private var isCapturing = false
    private val handler = Handler(Looper.getMainLooper())

    companion object {
        private const val BAND_COUNT = 4
        private const val CAPTURE_SIZE = 128
        private const val CAPTURE_RATE = 30000 // ~30 Hz in milliHz
        private const val START_DELAY_MS = 500L

        // Frequency band boundaries in Hz
        private val BAND_EDGES = floatArrayOf(20f, 250f, 2000f, 6000f, 20000f)

        private const val MIN_DB = -60f
        private const val MAX_DB = 0f
    }

    private val context: Context
        get() = appContext.reactContext ?: throw IllegalStateException("React context is null")

    override fun definition() = ModuleDefinition {
        Name("AudioVisualizer")

        Events("onAudioLevels")

        Function("isAvailable") {
            return@Function hasRecordPermission()
        }

        AsyncFunction("startCapture") { promise: Promise ->
            runOnBackgroundThread {
                try {
                    startCaptureInternal()
                    promise.resolve(null)
                } catch (e: Exception) {
                    promise.resolve(null)
                }
            }
        }

        AsyncFunction("stopCapture") { promise: Promise ->
            runOnBackgroundThread {
                try {
                    stopCaptureInternal()
                    promise.resolve(null)
                } catch (e: Exception) {
                    promise.resolve(null)
                }
            }
        }

        OnDestroy {
            releaseInternal()
        }
    }

    private fun runOnBackgroundThread(action: () -> Unit) {
        Thread { action() }.start()
    }

    private fun hasRecordPermission(): Boolean {
        return context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED
    }

    @Synchronized
    private fun startCaptureInternal() {
        if (isCapturing) return
        if (!hasRecordPermission()) return

        isCapturing = true

        // Delay Visualizer creation to let the audio session stabilize after
        // playback starts. Creating it immediately can disrupt the audio pipeline.
        handler.postDelayed({
            synchronized(this) {
                if (!isCapturing) return@postDelayed
                createVisualizerSafe()
            }
        }, START_DELAY_MS)
    }

    @Synchronized
    private fun stopCaptureInternal() {
        isCapturing = false
        handler.removeCallbacksAndMessages(null)
        releaseVisualizer()
    }

    private fun createVisualizerSafe() {
        try {
            // Session 0 = global output mix. This is a read-only capture that
            // does NOT attach to any specific audio session, so it won't
            // interfere with the media player's pipeline.
            val viz = Visualizer(0)
            viz.captureSize = CAPTURE_SIZE
            viz.setDataCaptureListener(
                object : Visualizer.OnDataCaptureListener {
                    override fun onWaveFormDataCapture(
                        visualizer: Visualizer?,
                        waveform: ByteArray?,
                        samplingRate: Int
                    ) {
                        // Not used — we rely on FFT data
                    }

                    override fun onFftDataCapture(
                        visualizer: Visualizer?,
                        fft: ByteArray?,
                        samplingRate: Int
                    ) {
                        if (fft == null || !isCapturing) return
                        processFFT(fft, samplingRate)
                    }
                },
                CAPTURE_RATE,
                false,
                true
            )
            viz.enabled = true
            visualizer = viz
        } catch (_: Exception) {
            // Visualizer creation failed (device doesn't support it, permission
            // revoked mid-flight, etc.). Silently degrade — the JS side will
            // keep showing the synthetic animation as fallback.
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

    @Synchronized
    private fun releaseVisualizer() {
        try {
            visualizer?.enabled = false
            visualizer?.release()
        } catch (_: Exception) {
            // Ignore release errors
        }
        visualizer = null
    }

    @Synchronized
    private fun releaseInternal() {
        isCapturing = false
        handler.removeCallbacksAndMessages(null)

        releaseVisualizer()
    }
}
