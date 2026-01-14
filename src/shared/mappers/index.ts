export {
	generateStringHash,
	generatePrefixedHashId,
	generateLocalTrackId,
	generateLocalAlbumId,
	generateLocalArtistId,
} from './hash-utils';

export {
	UNKNOWN_ARTIST,
	mapArtistReference,
	mapArtistReferences,
	mapArtistReferencesStrict,
	type ArtistLike,
} from './artist-mapper';

export { mapAndFilter, mapAndFilterWithIndex, mapAndFilterUndefined } from './bulk-mapper';

export {
	mapImagesToArtwork,
	mapSimpleImagesToArtwork,
	type ImageLike,
	type ArtworkMapperOptions,
} from './artwork-mapper';

export { extractYearFromDateString, extractYearFromSubtitle } from './year-extractor';
