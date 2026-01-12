package expo.modules.audiometadata

import android.content.Context
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.util.Base64
import androidx.documentfile.provider.DocumentFile
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

class AudioMetadataModule : Module() {
    private val context: Context
        get() = appContext.reactContext ?: throw IllegalStateException("React context is null")

    override fun definition() = ModuleDefinition {
        Name("AudioMetadata")

        AsyncFunction("extractMetadata") { fileUri: String, promise: Promise ->
            extractMetadataAsync(fileUri, promise)
        }

        AsyncFunction("extractArtwork") { fileUri: String, promise: Promise ->
            extractArtworkAsync(fileUri, promise)
        }
    }

    private fun extractMetadataAsync(fileUri: String, promise: Promise) {
        Thread {
            try {
                val result = extractMetadataInternal(fileUri)
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("METADATA_ERROR", e.message ?: "Failed to extract metadata", e)
            }
        }.start()
    }

    private fun extractArtworkAsync(fileUri: String, promise: Promise) {
        Thread {
            try {
                val result = extractArtworkInternal(fileUri)
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("ARTWORK_ERROR", e.message ?: "Failed to extract artwork", e)
            }
        }.start()
    }

    private fun extractMetadataInternal(fileUri: String): Map<String, Any?> {
        val retriever = MediaMetadataRetriever()

        try {
            setDataSource(retriever, fileUri)

            val title = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE)
            val artist = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST)
            val album = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM)
            val albumArtist = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUMARTIST)
            val year = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_YEAR)?.toIntOrNull()
            val genre = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_GENRE)
            val durationMs = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L
            val bitrate = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_BITRATE)?.toIntOrNull()
            val trackNumber = parseTrackNumber(retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_CD_TRACK_NUMBER))
            val discNumber = parseTrackNumber(retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DISC_NUMBER))
            val sampleRate = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_SAMPLERATE)?.toIntOrNull()

            val hasArtwork = retriever.embeddedPicture != null

            return mapOf(
                "title" to title,
                "artist" to artist,
                "album" to album,
                "albumArtist" to albumArtist,
                "year" to year,
                "genre" to genre,
                "trackNumber" to trackNumber,
                "discNumber" to discNumber,
                "duration" to (durationMs / 1000.0),
                "bitrate" to bitrate?.let { it / 1000 },
                "sampleRate" to sampleRate,
                "hasArtwork" to hasArtwork
            )
        } finally {
            retriever.release()
        }
    }

    private fun extractArtworkInternal(fileUri: String): Map<String, Any>? {
        val retriever = MediaMetadataRetriever()

        try {
            setDataSource(retriever, fileUri)

            val artwork = retriever.embeddedPicture ?: return null
            val base64 = Base64.encodeToString(artwork, Base64.NO_WRAP)

            val mimeType = detectImageMimeType(artwork)

            return mapOf(
                "base64" to base64,
                "mimeType" to mimeType
            )
        } finally {
            retriever.release()
        }
    }

    private fun setDataSource(retriever: MediaMetadataRetriever, fileUri: String) {
        val uri = Uri.parse(fileUri)

        when (uri.scheme) {
            "content" -> {
                retriever.setDataSource(context, uri)
            }
            "file" -> {
                val path = uri.path ?: throw IllegalArgumentException("Invalid file URI: $fileUri")
                retriever.setDataSource(path)
            }
            null -> {
                retriever.setDataSource(fileUri)
            }
            else -> {
                retriever.setDataSource(context, uri)
            }
        }
    }

    private fun parseTrackNumber(value: String?): Int? {
        if (value == null) return null
        return value.split("/").firstOrNull()?.trim()?.toIntOrNull()
    }

    private fun detectImageMimeType(data: ByteArray): String {
        if (data.size < 4) return "image/jpeg"

        return when {
            data[0] == 0xFF.toByte() && data[1] == 0xD8.toByte() -> "image/jpeg"
            data[0] == 0x89.toByte() && data[1] == 0x50.toByte() &&
                data[2] == 0x4E.toByte() && data[3] == 0x47.toByte() -> "image/png"
            data[0] == 0x47.toByte() && data[1] == 0x49.toByte() &&
                data[2] == 0x46.toByte() -> "image/gif"
            data[0] == 0x52.toByte() && data[1] == 0x49.toByte() &&
                data[2] == 0x46.toByte() && data[3] == 0x46.toByte() -> "image/webp"
            else -> "image/jpeg"
        }
    }
}
