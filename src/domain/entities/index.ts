export { type Artist, type ArtistReference, toArtistReference, formatArtistNames } from './artist';
export {
	type Album,
	type AlbumReference,
	type AlbumType,
	toAlbumReference,
	getAlbumYear,
} from './album';
export {
	type Track,
	type TrackMetadata,
	type CreateTrackParams,
	createTrack,
	getPrimaryArtist,
	getArtistNames,
	getArtworkUrl,
} from './track';
export {
	type Playlist,
	type PlaylistTrack,
	type PlaylistRule,
	type SmartPlaylistCriteria,
	type CreatePlaylistParams,
	createPlaylist,
	addTrackToPlaylist,
	removeTrackFromPlaylist,
	reorderPlaylistTracks,
	getPlaylistDuration,
	getPlaylistTrackCount,
} from './playlist';
