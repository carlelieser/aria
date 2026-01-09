import { useCallback, useEffect, useState } from 'react';
import {
	sleepTimerService,
	type SleepTimerMode,
} from '@/src/application/services/sleep-timer-service';

interface SleepTimerState {
	isActive: boolean;
	mode: SleepTimerMode;
	endTime: number | null;
	remainingMs: number;
}

export function useSleepTimer() {
	const [state, setState] = useState<SleepTimerState>(() =>
		sleepTimerService.getState()
	);

	useEffect(() => {
		const unsubscribe = sleepTimerService.subscribe(() => {
			setState(sleepTimerService.getState());
		});
		return unsubscribe;
	}, []);

	const start = useCallback((minutes: number) => {
		sleepTimerService.start(minutes);
	}, []);

	const startEndOfTrack = useCallback(() => {
		sleepTimerService.startEndOfTrack();
	}, []);

	const cancel = useCallback(() => {
		sleepTimerService.cancel();
	}, []);

	const extendByMinutes = useCallback((minutes: number) => {
		sleepTimerService.extendByMinutes(minutes);
	}, []);

	const formatRemaining = useCallback(() => {
		const totalSeconds = Math.ceil(state.remainingMs / 1000);

		if (totalSeconds <= 0) return '0:00';

		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		}

		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}, [state.remainingMs]);

	return {
		isActive: state.isActive,
		mode: state.mode,
		remainingMs: state.remainingMs,
		remainingMinutes: Math.ceil(state.remainingMs / 60000),
		remainingSeconds: Math.ceil(state.remainingMs / 1000),

		formatRemaining,
		start,
		startEndOfTrack,
		cancel,
		extendByMinutes,
	};
}

export const SLEEP_TIMER_PRESETS = [
	{ label: '5 min', minutes: 5 },
	{ label: '15 min', minutes: 15 },
	{ label: '30 min', minutes: 30 },
	{ label: '45 min', minutes: 45 },
	{ label: '1 hour', minutes: 60 },
	{ label: '1.5 hours', minutes: 90 },
	{ label: '2 hours', minutes: 120 },
] as const;
