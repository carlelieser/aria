package expo.modules.audioequalizer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.audiofx.AudioEffect
import android.media.audiofx.Equalizer
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

/**
 * Native Audio Equalizer Module for Android
 *
 * Uses android.media.audiofx.Equalizer to provide system-level audio equalization.
 * Listens for audio session broadcasts to attach to the correct media player session.
 */
class AudioEqualizerModule : Module() {
    private var equalizer: Equalizer? = null
    private var isInitialized = false
    private var currentAudioSessionId: Int = 0
    private var pendingEnabled: Boolean = false
    private var pendingBandLevels: ShortArray? = null
    private var audioSessionReceiver: BroadcastReceiver? = null

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
        if (isInitialized) {
            return
        }

        try {
            // Register for audio session broadcasts to catch when media players open sessions
            registerAudioSessionReceiver()

            // Try to create equalizer with session 0 first (works on some devices)
            // If that fails, we'll wait for an audio session broadcast
            try {
                equalizer = Equalizer(0, 0)
                currentAudioSessionId = 0
            } catch (e: Exception) {
                // Session 0 not available, will attach when we receive a session broadcast
                equalizer = null
            }

            isInitialized = true
        } catch (e: Exception) {
            throw RuntimeException("Failed to initialize equalizer: ${e.message}", e)
        }
    }

    private fun registerAudioSessionReceiver() {
        if (audioSessionReceiver != null) {
            return
        }

        audioSessionReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (intent?.action == AudioEffect.ACTION_OPEN_AUDIO_EFFECT_CONTROL_SESSION) {
                    val sessionId = intent.getIntExtra(AudioEffect.EXTRA_AUDIO_SESSION, 0)
                    val packageName = intent.getStringExtra(AudioEffect.EXTRA_PACKAGE_NAME)

                    // Only attach to our own app's audio sessions
                    if (packageName == context?.packageName && sessionId != 0) {
                        attachToSession(sessionId)
                    }
                } else if (intent?.action == AudioEffect.ACTION_CLOSE_AUDIO_EFFECT_CONTROL_SESSION) {
                    val sessionId = intent.getIntExtra(AudioEffect.EXTRA_AUDIO_SESSION, 0)
                    if (sessionId == currentAudioSessionId) {
                        // Our session was closed, release the equalizer
                        releaseEqualizerOnly()
                    }
                }
            }
        }

        val filter = IntentFilter().apply {
            addAction(AudioEffect.ACTION_OPEN_AUDIO_EFFECT_CONTROL_SESSION)
            addAction(AudioEffect.ACTION_CLOSE_AUDIO_EFFECT_CONTROL_SESSION)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(audioSessionReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            context.registerReceiver(audioSessionReceiver, filter)
        }
    }

    @Synchronized
    private fun attachToSession(sessionId: Int) {
        if (sessionId == currentAudioSessionId && equalizer != null) {
            return
        }

        // Release existing equalizer
        releaseEqualizerOnly()

        try {
            equalizer = Equalizer(0, sessionId)
            currentAudioSessionId = sessionId

            // Apply any pending settings
            equalizer?.let { eq ->
                eq.enabled = pendingEnabled
                pendingBandLevels?.let { levels ->
                    for (i in levels.indices) {
                        if (i < eq.numberOfBands) {
                            eq.setBandLevel(i.toShort(), levels[i])
                        }
                    }
                }
            }
        } catch (e: Exception) {
            // Failed to attach to this session
            equalizer = null
        }
    }

    @Synchronized
    private fun releaseEqualizerOnly() {
        try {
            // Save current state before releasing
            equalizer?.let { eq ->
                pendingEnabled = eq.enabled
                val numBands = eq.numberOfBands.toInt()
                pendingBandLevels = ShortArray(numBands) { i ->
                    eq.getBandLevel(i.toShort())
                }
            }
            equalizer?.release()
        } catch (e: Exception) {
            // Ignore release errors
        }
        equalizer = null
        currentAudioSessionId = 0
    }

    private fun getEqualizerInfoInternal(): Map<String, Any> {
        val eq = equalizer
        if (eq != null) {
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

        // Return default 10-band EQ info when no equalizer is attached yet
        // This allows the UI to render while waiting for audio session
        return createDefaultEqualizerInfo()
    }

    private fun createDefaultEqualizerInfo(): Map<String, Any> {
        // Standard 10-band frequencies used by most Android devices
        val defaultFrequencies = listOf(60, 230, 910, 3600, 14000)
        val bands = defaultFrequencies.mapIndexed { index, freq ->
            mapOf(
                "minFrequency" to (freq * 0.7).toInt(),
                "maxFrequency" to (freq * 1.4).toInt(),
                "centerFrequency" to freq * 1000 // Convert to milliHz
            )
        }

        return mapOf(
            "isAvailable" to true, // Report as available, will attach to session when audio plays
            "numberOfBands" to 5,
            "minBandLevel" to -1500,
            "maxBandLevel" to 1500,
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
        val eq = equalizer
        if (eq != null) {
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

        // Return pending state when no equalizer is attached
        return mapOf(
            "isEnabled" to pendingEnabled,
            "bandLevels" to (pendingBandLevels?.map { it.toInt() } ?: emptyList()),
            "presetName" to null
        )
    }

    private fun setEnabledInternal(enabled: Boolean) {
        pendingEnabled = enabled
        equalizer?.enabled = enabled
    }

    private fun setBandLevelInternal(bandIndex: Int, level: Int) {
        // Store in pending state for when equalizer attaches to a session
        ensurePendingBandLevels()
        if (bandIndex >= 0 && bandIndex < (pendingBandLevels?.size ?: 0)) {
            pendingBandLevels?.set(bandIndex, level.toShort())
        }

        val eq = equalizer ?: return // Silently return if no equalizer yet

        val numberOfBands = eq.numberOfBands.toInt()
        if (bandIndex < 0 || bandIndex >= numberOfBands) {
            return // Ignore out of range
        }

        val levelRange = eq.bandLevelRange
        val clampedLevel = level.coerceIn(levelRange[0].toInt(), levelRange[1].toInt())
        eq.setBandLevel(bandIndex.toShort(), clampedLevel.toShort())
    }

    private fun setBandLevelsInternal(levels: List<Int>) {
        // Store in pending state
        pendingBandLevels = ShortArray(levels.size) { levels[it].toShort() }

        val eq = equalizer ?: return // Silently return if no equalizer yet

        val numberOfBands = eq.numberOfBands.toInt()
        val levelRange = eq.bandLevelRange

        for (i in 0 until minOf(levels.size, numberOfBands)) {
            val clampedLevel = levels[i].coerceIn(levelRange[0].toInt(), levelRange[1].toInt())
            eq.setBandLevel(i.toShort(), clampedLevel.toShort())
        }
    }

    private fun ensurePendingBandLevels() {
        if (pendingBandLevels == null) {
            // Default to 10 bands (standard EQ)
            pendingBandLevels = ShortArray(10) { 0 }
        }
    }

    private fun usePresetInternal(presetName: String) {
        val eq = equalizer ?: return // Silently return if no equalizer yet

        val numPresets = eq.numberOfPresets.toInt()
        for (i in 0 until numPresets) {
            if (eq.getPresetName(i.toShort()) == presetName) {
                eq.usePreset(i.toShort())
                return
            }
        }
        // Preset not found, silently ignore
    }

    @Synchronized
    private fun releaseInternal() {
        // Unregister broadcast receiver
        audioSessionReceiver?.let {
            try {
                context.unregisterReceiver(it)
            } catch (e: Exception) {
                // Ignore if already unregistered
            }
        }
        audioSessionReceiver = null

        try {
            equalizer?.release()
        } catch (e: Exception) {
            // Ignore release errors
        }
        equalizer = null
        currentAudioSessionId = 0
        pendingBandLevels = null
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
