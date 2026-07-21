import { describe, it, expect, beforeEach } from 'vitest';
import { LyricsOrchestrator } from '@/src/plugins/lyrics/services/lyrics-orchestrator';
import type { LyricsProvider } from '@/src/plugins/lyrics/domain/lyrics-provider';
import { ok } from '@shared/types/result';

function makeProvider(id: string, priority: number, enabled = true): LyricsProvider {
	return {
		id,
		name: id,
		priority,
		enabled,
		searchLyrics: async () => ok(null),
		canHandleTrack: () => true,
		isAvailable: async () => true,
	};
}

describe('LyricsOrchestrator provider selection', () => {
	let orchestrator: LyricsOrchestrator;

	beforeEach(() => {
		orchestrator = new LyricsOrchestrator();
		orchestrator.registerProvider(makeProvider('a', 20));
		orchestrator.registerProvider(makeProvider('b', 10));
		orchestrator.registerProvider(makeProvider('c', 30, false));
	});

	it('uses each provider’s built-in enabled/priority without config', () => {
		const ids = orchestrator.getSortedProviders().map((p) => p.id);
		// c is disabled; a/b sorted by priority (b=10 before a=20)
		expect(ids).toEqual(['b', 'a']);
	});

	it('applies the enabled override from config', () => {
		orchestrator.setProviderConfig(['a', 'c'], []);
		const ids = orchestrator.getSortedProviders().map((p) => p.id);
		expect(ids).toContain('a');
		expect(ids).toContain('c');
		expect(ids).not.toContain('b');
	});

	it('orders providers by the configured order', () => {
		orchestrator.setProviderConfig(['a', 'b', 'c'], ['c', 'a', 'b']);
		const ids = orchestrator.getSortedProviders().map((p) => p.id);
		expect(ids).toEqual(['c', 'a', 'b']);
	});

	it('places providers absent from the order after the ordered ones', () => {
		orchestrator.setProviderConfig(['a', 'b', 'c'], ['c']);
		const ids = orchestrator.getSortedProviders().map((p) => p.id);
		expect(ids[0]).toBe('c');
		expect(ids.slice(1).sort()).toEqual(['a', 'b']);
	});
});
