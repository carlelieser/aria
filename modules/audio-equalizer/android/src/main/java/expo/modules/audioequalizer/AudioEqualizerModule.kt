package expo.modules.audioequalizer

import android.content.Context
import android.media.AudioManager
import android.media.audiofx.Equalizer
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

/**
 * Native Audio Equalizer Module for Android
 *
 * Uses android.media.audiofx.Equalizer to provide system-level audio equalization.
 * Attaches to the audio session used by the media player.
 */
class AudioEqualizerModule : Module() {
    private var equalizer: Equalizer? = null
    private var isInitialized = false

    private val context: Context
        get() = appContext.reactContext ?: throw IllegalStateException("React context is null")

    override fun definition() = ModuleDefinition {
        Name("AudioEqualizer")

        AsyncFunction("getEqualizerInfo") { promise: Promise ->
            runOnBackgroundThread {
                try {
                    initializeIfNeeded()
                    val result = getEqualizerInfoInternal()
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.resolve(createUnavailableInfo())
                }
            }
        }

        AsyncFunction("getPresets") { promise: Promise ->
            runOnBackgroundThread {
                try {
                    initializeIfNeeded()
                    val result = getPresetsInternal()
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.resolve(emptyList<Map<String, Any>>())
                }
            }
        }

        AsyncFunction("getState") { promise: Promise ->
            runOnBackgroundThread {
                try {
                    initializeIfNeeded()
                    val result = getStateInternal()
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.resolve(createDisabledState())
                }
            }
        }

        AsyncFunction("setEnabled") { enabled: Boolean, promise: Promise ->
            runOnBackgroundThread {
                try {
                    initializeIfNeeded()
                    setEnabledInternal(enabled)
                    promise.resolve(null)
                } catch (e: Exception) {
                    promise.reject("EQ_ERROR", e.message ?: "Failed to set enabled state", e)
                }
            }
        }

        AsyncFunction("setBandLevel") { bandIndex: Int, level: Int, promise: Promise ->
            runOnBackgroundThread {
                try {
                    initializeIfNeeded()
                    setBandLevelInternal(bandIndex, level)
                    promise.resolve(null)
                } catch (e: Exception) {
                    promise.reject("EQ_ERROR", e.message ?: "Failed to set band level", e)
                }
            }
        }

        AsyncFunction("setBandLevels") { levels: List<Int>, promise: Promise ->
            runOnBackgroundThread {
                try {
                    initializeIfNeeded()
                    setBandLevelsInternal(levels)
                    promise.resolve(null)
                } catch (e: Exception) {
                    promise.reject("EQ_ERROR", e.message ?: "Failed to set band levels", e)
                }
            }
        }

        AsyncFunction("usePreset") { presetName: String, promise: Promise ->
            runOnBackgroundThread {
                try {
                    initializeIfNeeded()
                    usePresetInternal(presetName)
                    promise.resolve(null)
                } catch (e: Exception) {
                    promise.reject("EQ_ERROR", e.message ?: "Failed to use preset", e)
                }
            }
        }

        AsyncFunction("release") { promise: Promise ->
            runOnBackgroundThread {
                try {
                    releaseInternal()
                    promise.resolve(null)
                } catch (e: Exception) {
                    promise.reject("EQ_ERROR", e.message ?: "Failed to release equalizer", e)
                }
            }
        }

        OnDestroy {
            releaseInternal()
        }
    }

    private fun runOnBackgroundThread(action: () -> Unit) {
        Thread {
            action()
        }.start()
    }

    @Synchronized
    private fun initializeIfNeeded() {
        if (isInitialized && equalizer != null) {
            return
        }

        try {
            // Use audio session ID 0 for global output mix
            // This allows the equalizer to affect all audio output
            equalizer = Equalizer(0, 0)
            isInitialized = true
        } catch (e: Exception) {
            throw RuntimeException("Failed to initialize equalizer: ${e.message}", e)
        }
    }

    private fun getEqualizerInfoInternal(): Map<String, Any> {
        val eq = equalizer ?: return createUnavailableInfo()

        val numberOfBands = eq.numberOfBands.toInt()
        val levelRange = eq.bandLevelRange
        val minLevel = levelRange[0].toInt()
        val maxLevel = levelRange[1].toInt()

        val bands = mutableListOf<Map<String, Any>>()
        for (i in 0 until numberOfBands) {
            val freqRange = eq.getBandFreqRange(i.toShort())
            val centerFreq = eq.getCenterFreq(i.toShort())
            bands.add(mapOf(
                "minFrequency" to freqRange[0],
                "maxFrequency" to freqRange[1],
                "centerFrequency" to centerFreq
            ))
        }

        return mapOf(
            "isAvailable" to true,
            "numberOfBands" to numberOfBands,
            "minBandLevel" to minLevel,
            "maxBandLevel" to maxLevel,
            "bands" to bands
        )
    }

    private fun getPresetsInternal(): List<Map<String, Any>> {
        val eq = equalizer ?: return emptyList()

        val presets = mutableListOf<Map<String, Any>>()
        val numPresets = eq.numberOfPresets.toInt()

        for (i in 0 until numPresets) {
            val presetName = eq.getPresetName(i.toShort())
            presets.add(mapOf(
                "id" to i.toString(),
                "name" to presetName
            ))
        }

        return presets
    }

    private fun getStateInternal(): Map<String, Any?> {
        val eq = equalizer ?: return createDisabledState()

        val numberOfBands = eq.numberOfBands.toInt()
        val bandLevels = mutableListOf<Int>()

        for (i in 0 until numberOfBands) {
            bandLevels.add(eq.getBandLevel(i.toShort()).toInt())
        }

        val currentPreset = try {
            val presetIndex = eq.currentPreset.toInt()
            if (presetIndex >= 0 && presetIndex < eq.numberOfPresets) {
                eq.getPresetName(presetIndex.toShort())
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }

        return mapOf(
            "isEnabled" to eq.enabled,
            "bandLevels" to bandLevels,
            "presetName" to currentPreset
        )
    }

    private fun setEnabledInternal(enabled: Boolean) {
        val eq = equalizer ?: throw IllegalStateException("Equalizer not initialized")
        eq.enabled = enabled
    }

    private fun setBandLevelInternal(bandIndex: Int, level: Int) {
        val eq = equalizer ?: throw IllegalStateException("Equalizer not initialized")

        val numberOfBands = eq.numberOfBands.toInt()
        if (bandIndex < 0 || bandIndex >= numberOfBands) {
            throw IllegalArgumentException("Band index $bandIndex out of range (0-${numberOfBands - 1})")
        }

        val levelRange = eq.bandLevelRange
        val clampedLevel = level.coerceIn(levelRange[0].toInt(), levelRange[1].toInt())
        eq.setBandLevel(bandIndex.toShort(), clampedLevel.toShort())
    }

    private fun setBandLevelsInternal(levels: List<Int>) {
        val eq = equalizer ?: throw IllegalStateException("Equalizer not initialized")

        val numberOfBands = eq.numberOfBands.toInt()
        val levelRange = eq.bandLevelRange

        for (i in 0 until minOf(levels.size, numberOfBands)) {
            val clampedLevel = levels[i].coerceIn(levelRange[0].toInt(), levelRange[1].toInt())
            eq.setBandLevel(i.toShort(), clampedLevel.toShort())
        }
    }

    private fun usePresetInternal(presetName: String) {
        val eq = equalizer ?: throw IllegalStateException("Equalizer not initialized")

        val numPresets = eq.numberOfPresets.toInt()
        for (i in 0 until numPresets) {
            if (eq.getPresetName(i.toShort()) == presetName) {
                eq.usePreset(i.toShort())
                return
            }
        }

        throw IllegalArgumentException("Preset '$presetName' not found")
    }

    @Synchronized
    private fun releaseInternal() {
        try {
            equalizer?.release()
        } catch (e: Exception) {
            // Ignore release errors
        }
        equalizer = null
        isInitialized = false
    }

    private fun createUnavailableInfo(): Map<String, Any> {
        return mapOf(
            "isAvailable" to false,
            "numberOfBands" to 0,
            "minBandLevel" to 0,
            "maxBandLevel" to 0,
            "bands" to emptyList<Map<String, Any>>()
        )
    }

    private fun createDisabledState(): Map<String, Any?> {
        return mapOf(
            "isEnabled" to false,
            "bandLevels" to emptyList<Int>(),
            "presetName" to null
        )
    }
}
