import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrackId } from '@domain/value-objects/track-id';
import { Duration } from '@domain/value-objects/duration';
import { createStreamingSource } from '@domain/value-objects/audio-source';
import type { Track } from '@domain/entities/track';
import type { TrackActionContext } from '@domain/actions/track-action';

import { TrackActionsService } from '@/src/application/services/track-actions-service';
import { TRACK_ACTION_EVENTS } from '@/src/application/events/track-action-events';

const { mockEventBus } = vi.hoisted(() => {
	const mockEventBus = {
		on: vi.fn().mockReturnValue(vi.fn()),
		emit: vi.fn(),
	};
	return { mockEventBus };
});

vi.mock('@shared/services/logger', () => ({
	getLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

vi.mock('@plugins/core/registry/plugin-registry', () => ({
	getPluginRegistry: vi.fn().mockReturnValue({
		getEventBus: vi.fn().mockReturnValue(mockEventBus),
	}),
}));

function createTestTrack(id: string): Track {
	return {
		id: TrackId.create('youtube-music', id),
		title: `Track ${id}`,
		artists: [{ id: `artist-${id}`, name: `Artist ${id}` }],
		duration: Duration.fromSeconds(180),
		source: createStreamingSource('youtube-music', id),
		metadata: {},
		playCount: 0,
		isFavorite: false,
	};
}

function createTestContext(trackId: string): TrackActionContext {
	return {
		track: createTestTrack(trackId),
		source: 'library',
	};
}

describe('TrackActionsService', () => {
	let service: TrackActionsService;

	beforeEach(() => {
		vi.useFakeTimers();
		service = new TrackActionsService();
		vi.clearAllMocks();
		mockEventBus.on.mockReturnValue(vi.fn());
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('getActionsForTrack', () => {
		it('should emit a request event on the event bus', async () => {
			const context = createTestContext('t1');

			const actionsPromise = service.getActionsForTrack(context);
			vi.advanceTimersByTime(200);
			await actionsPromise;

			expect(mockEventBus.emit).toHaveBeenCalledWith(
				TRACK_ACTION_EVENTS.REQUEST_ACTIONS,
				expect.objectContaining({
					track: context.track,
					source: context.source,
					requestId: expect.any(String),
				})
			);
		});

		it('should subscribe to response events', async () => {
			const context = createTestContext('t1');

			const actionsPromise = service.getActionsForTrack(context);
			vi.advanceTimersByTime(200);
			await actionsPromise;

			expect(mockEventBus.on).toHaveBeenCalledWith(
				TRACK_ACTION_EVENTS.RESPOND_ACTIONS,
				expect.any(Function)
			);
		});

		it('should return actions from plugin responses', async () => {
			const mockActions = [
				{
					id: 'add-to-library',
					label: 'Add to Library',
					icon: 'plus',
					group: 'primary' as const,
					priority: 10,
					enabled: true,
				},
			];

			mockEventBus.emit.mockImplementation((eventName: string, request: any) => {
				if (eventName === TRACK_ACTION_EVENTS.REQUEST_ACTIONS) {
					const calls = mockEventBus.on.mock.calls;
					for (const [name, handler] of calls) {
						if (name === TRACK_ACTION_EVENTS.RESPOND_ACTIONS) {
							handler({
								requestId: request.requestId,
								actions: mockActions,
							});
						}
					}
				}
			});

			const context = createTestContext('t1');
			const actionsPromise = service.getActionsForTrack(context);
			vi.advanceTimersByTime(200);
			const result = await actionsPromise;

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('add-to-library');
		});

		it('should return empty array when no plugins respond', async () => {
			mockEventBus.emit.mockImplementation(() => {});
			const context = createTestContext('t1');

			const actionsPromise = service.getActionsForTrack(context);
			vi.advanceTimersByTime(200);
			const result = await actionsPromise;

			expect(result).toHaveLength(0);
		});

		it('should sort actions by group order and priority', async () => {
			const mockActions = [
				{
					id: 'action-secondary',
					label: 'Secondary',
					icon: 'star',
					group: 'secondary' as const,
					priority: 5,
					enabled: true,
				},
				{
					id: 'action-primary',
					label: 'Primary',
					icon: 'plus',
					group: 'primary' as const,
					priority: 10,
					enabled: true,
				},
				{
					id: 'action-navigation',
					label: 'Navigation',
					icon: 'arrow',
					group: 'navigation' as const,
					priority: 8,
					enabled: true,
				},
			];

			mockEventBus.emit.mockImplementation((eventName: string, request: any) => {
				if (eventName === TRACK_ACTION_EVENTS.REQUEST_ACTIONS) {
					const calls = mockEventBus.on.mock.calls;
					for (const [name, handler] of calls) {
						if (name === TRACK_ACTION_EVENTS.RESPOND_ACTIONS) {
							handler({
								requestId: request.requestId,
								actions: mockActions,
							});
						}
					}
				}
			});

			const context = createTestContext('t1');
			const actionsPromise = service.getActionsForTrack(context);
			vi.advanceTimersByTime(200);
			const result = await actionsPromise;

			expect(result[0].group).toBe('primary');
			expect(result[1].group).toBe('secondary');
			expect(result[2].group).toBe('navigation');
		});

		it('should sort by priority within the same group (higher first)', async () => {
			const mockActions = [
				{
					id: 'low-priority',
					label: 'Low',
					icon: 'star',
					group: 'primary' as const,
					priority: 1,
					enabled: true,
				},
				{
					id: 'high-priority',
					label: 'High',
					icon: 'star',
					group: 'primary' as const,
					priority: 10,
					enabled: true,
				},
			];

			mockEventBus.emit.mockImplementation((eventName: string, request: any) => {
				if (eventName === TRACK_ACTION_EVENTS.REQUEST_ACTIONS) {
					const calls = mockEventBus.on.mock.calls;
					for (const [name, handler] of calls) {
						if (name === TRACK_ACTION_EVENTS.RESPOND_ACTIONS) {
							handler({
								requestId: request.requestId,
								actions: mockActions,
							});
						}
					}
				}
			});

			const context = createTestContext('t1');
			const actionsPromise = service.getActionsForTrack(context);
			vi.advanceTimersByTime(200);
			const result = await actionsPromise;

			expect(result[0].id).toBe('high-priority');
			expect(result[1].id).toBe('low-priority');
		});

		it('should unsubscribe from event bus after timeout', async () => {
			const unsubscribe = vi.fn();
			mockEventBus.on.mockReturnValue(unsubscribe);

			const context = createTestContext('t1');
			const actionsPromise = service.getActionsForTrack(context);
			vi.advanceTimersByTime(200);
			await actionsPromise;

			expect(unsubscribe).toHaveBeenCalled();
		});
	});

	describe('executeAction', () => {
		it('should emit an execute request event', async () => {
			const context = createTestContext('t1');

			const resultPromise = service.executeAction('add-to-library', context);
			vi.advanceTimersByTime(200);
			await resultPromise;

			expect(mockEventBus.emit).toHaveBeenCalledWith(
				TRACK_ACTION_EVENTS.EXECUTE_ACTION_REQUEST,
				expect.objectContaining({
					actionId: 'add-to-library',
					track: context.track,
					source: context.source,
				})
			);
		});

		it('should return handled=false when no plugin handles the action', async () => {
			const context = createTestContext('t1');

			const resultPromise = service.executeAction('unknown-action', context);
			vi.advanceTimersByTime(200);
			const result = await resultPromise;

			expect(result.handled).toBe(false);
		});

		it('should return handled result from plugin response', async () => {
			const mockResult = {
				handled: true,
				success: true,
				feedback: { message: 'Added to library', type: 'success' as const },
			};

			mockEventBus.emit.mockImplementation((eventName: string, request: any) => {
				if (eventName === TRACK_ACTION_EVENTS.EXECUTE_ACTION_REQUEST) {
					const calls = mockEventBus.on.mock.calls;
					for (const [name, handler] of calls) {
						if (name === TRACK_ACTION_EVENTS.EXECUTE_ACTION_RESPONSE) {
							handler({
								requestId: request.requestId,
								result: mockResult,
							});
						}
					}
				}
			});

			const context = createTestContext('t1');
			const resultPromise = service.executeAction('add-to-library', context);
			vi.advanceTimersByTime(200);
			const result = await resultPromise;

			expect(result.handled).toBe(true);
			expect(result.success).toBe(true);
		});

		it('should pass playlistId and trackPosition in request', async () => {
			const context: TrackActionContext = {
				track: createTestTrack('t1'),
				source: 'playlist',
				playlistId: 'playlist-1',
				trackPosition: 3,
			};

			const resultPromise = service.executeAction('remove-from-playlist', context);
			vi.advanceTimersByTime(200);
			await resultPromise;

			expect(mockEventBus.emit).toHaveBeenCalledWith(
				TRACK_ACTION_EVENTS.EXECUTE_ACTION_REQUEST,
				expect.objectContaining({
					playlistId: 'playlist-1',
					trackPosition: 3,
				})
			);
		});
	});
});
