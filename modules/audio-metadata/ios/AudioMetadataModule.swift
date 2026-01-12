import ExpoModulesCore
import AVFoundation

public class AudioMetadataModule: Module {
    public func definition() -> ModuleDefinition {
        Name("AudioMetadata")

        AsyncFunction("extractMetadata") { (fileUri: String, promise: Promise) in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let result = try self.extractMetadataInternal(fileUri: fileUri)
                    promise.resolve(result)
                } catch {
                    promise.reject("METADATA_ERROR", error.localizedDescription)
                }
            }
        }

        AsyncFunction("extractArtwork") { (fileUri: String, promise: Promise) in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let result = try self.extractArtworkInternal(fileUri: fileUri)
                    promise.resolve(result)
                } catch {
                    promise.reject("ARTWORK_ERROR", error.localizedDescription)
                }
            }
        }
    }

    private func extractMetadataInternal(fileUri: String) throws -> [String: Any?] {
        let url = try parseUri(fileUri)
        let asset = AVURLAsset(url: url)

        var title: String?
        var artist: String?
        var album: String?
        var albumArtist: String?
        var year: Int?
        var genre: String?
        var trackNumber: Int?
        var discNumber: Int?
        var hasArtwork = false

        let commonMetadata = asset.commonMetadata

        for item in commonMetadata {
            guard let key = item.commonKey?.rawValue else { continue }

            switch key {
            case AVMetadataKey.commonKeyTitle.rawValue:
                title = item.stringValue
            case AVMetadataKey.commonKeyArtist.rawValue:
                artist = item.stringValue
            case AVMetadataKey.commonKeyAlbumName.rawValue:
                album = item.stringValue
            case AVMetadataKey.commonKeyCreationDate.rawValue:
                if let dateStr = item.stringValue {
                    year = Int(dateStr.prefix(4))
                }
            case AVMetadataKey.commonKeyType.rawValue:
                genre = item.stringValue
            case AVMetadataKey.commonKeyArtwork.rawValue:
                hasArtwork = item.dataValue != nil
            default:
                break
            }
        }

        let id3Metadata = AVMetadataItem.metadataItems(
            from: asset.metadata,
            filteredByIdentifier: .id3MetadataTrackNumber
        )
        if let trackItem = id3Metadata.first, let trackStr = trackItem.stringValue {
            trackNumber = parseTrackNumber(trackStr)
        }

        let id3DiscMetadata = AVMetadataItem.metadataItems(
            from: asset.metadata,
            filteredByIdentifier: .id3MetadataPartOfASet
        )
        if let discItem = id3DiscMetadata.first, let discStr = discItem.stringValue {
            discNumber = parseTrackNumber(discStr)
        }

        let id3AlbumArtist = AVMetadataItem.metadataItems(
            from: asset.metadata,
            filteredByIdentifier: .id3MetadataBand
        )
        if let albumArtistItem = id3AlbumArtist.first {
            albumArtist = albumArtistItem.stringValue
        }

        let id3Genre = AVMetadataItem.metadataItems(
            from: asset.metadata,
            filteredByIdentifier: .id3MetadataContentType
        )
        if let genreItem = id3Genre.first, genre == nil {
            genre = genreItem.stringValue
        }

        let duration = CMTimeGetSeconds(asset.duration)

        var bitrate: Int?
        var sampleRate: Int?

        if let audioTrack = asset.tracks(withMediaType: .audio).first {
            let formatDescriptions = audioTrack.formatDescriptions as? [CMFormatDescription]
            if let formatDesc = formatDescriptions?.first {
                if let asbd = CMAudioFormatDescriptionGetStreamBasicDescription(formatDesc) {
                    sampleRate = Int(asbd.pointee.mSampleRate)
                }
            }
            bitrate = Int(audioTrack.estimatedDataRate / 1000)
        }

        return [
            "title": title,
            "artist": artist,
            "album": album,
            "albumArtist": albumArtist,
            "year": year,
            "genre": genre,
            "trackNumber": trackNumber,
            "discNumber": discNumber,
            "duration": duration.isNaN ? 0 : duration,
            "bitrate": bitrate,
            "sampleRate": sampleRate,
            "hasArtwork": hasArtwork
        ]
    }

    private func extractArtworkInternal(fileUri: String) throws -> [String: Any]? {
        let url = try parseUri(fileUri)
        let asset = AVURLAsset(url: url)

        let artworkItems = AVMetadataItem.metadataItems(
            from: asset.commonMetadata,
            filteredByIdentifier: .commonIdentifierArtwork
        )

        guard let artworkItem = artworkItems.first,
              let artworkData = artworkItem.dataValue else {
            return nil
        }

        let base64 = artworkData.base64EncodedString()
        let mimeType = detectImageMimeType(data: artworkData)

        return [
            "base64": base64,
            "mimeType": mimeType
        ]
    }

    private func parseUri(_ uri: String) throws -> URL {
        if uri.hasPrefix("file://") {
            guard let url = URL(string: uri) else {
                throw NSError(domain: "AudioMetadata", code: 1, userInfo: [
                    NSLocalizedDescriptionKey: "Invalid file URI: \(uri)"
                ])
            }
            return url
        }

        let url = URL(fileURLWithPath: uri)
        return url
    }

    private func parseTrackNumber(_ value: String) -> Int? {
        let parts = value.split(separator: "/")
        guard let first = parts.first else { return nil }
        return Int(first.trimmingCharacters(in: .whitespaces))
    }

    private func detectImageMimeType(data: Data) -> String {
        guard data.count >= 4 else { return "image/jpeg" }

        let bytes = [UInt8](data.prefix(4))

        if bytes[0] == 0xFF && bytes[1] == 0xD8 {
            return "image/jpeg"
        }
        if bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47 {
            return "image/png"
        }
        if bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46 {
            return "image/gif"
        }
        if bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 {
            return "image/webp"
        }

        return "image/jpeg"
    }
}
