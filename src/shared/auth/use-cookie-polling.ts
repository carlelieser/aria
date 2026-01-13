/**
 * Cookie Polling Hook
 *
 * Shared hook for polling cookies during OAuth login flows.
 * Handles polling state, timeout, and cleanup.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_POLL_INTERVAL_MS = 500;
const DEFAULT_POLL_TIMEOUT_MS = 30000;

export interface UseCookiePollingOptions {
	/** Function to check for cookies. Returns cookie string if found, null otherwise */
	checkCookies: () => Promise<string | null>;
	/** Callback when cookies are successfully found */
	onSuccess: (cookies: string) => void;
	/** Polling interval in milliseconds */
	pollIntervalMs?: number;
	/** Polling timeout in milliseconds */
	pollTimeoutMs?: number;
}

export interface UseCookiePollingResult {
	/** Whether polling is currently active */
	isPolling: boolean;
	/** Whether polling timed out without finding cookies */
	pollingTimedOut: boolean;
	/** Start polling for cookies */
	startPolling: () => void;
	/** Stop polling */
	stopPolling: () => void;
	/** Reset timeout state and found flag */
	reset: () => void;
	/** Manually check for cookies once */
	manualCheck: () => Promise<boolean>;
}

export function useCookiePolling({
	checkCookies,
	onSuccess,
	pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
	pollTimeoutMs = DEFAULT_POLL_TIMEOUT_MS,
}: UseCookiePollingOptions): UseCookiePollingResult {
	const [isPolling, setIsPolling] = useState(false);
	const [pollingTimedOut, setPollingTimedOut] = useState(false);

	const hasFoundCookies = useRef(false);
	const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const pollStartTimeRef = useRef<number | null>(null);

	const stopPolling = useCallback(() => {
		if (pollIntervalRef.current) {
			clearInterval(pollIntervalRef.current);
			pollIntervalRef.current = null;
		}
		setIsPolling(false);
		pollStartTimeRef.current = null;
	}, []);

	const startPolling = useCallback(() => {
		if (pollIntervalRef.current || hasFoundCookies.current) {
			return;
		}

		setIsPolling(true);
		setPollingTimedOut(false);
		pollStartTimeRef.current = Date.now();

		const pollForCookies = async () => {
			// Check for timeout
			if (pollStartTimeRef.current && Date.now() - pollStartTimeRef.current > pollTimeoutMs) {
				stopPolling();
				setPollingTimedOut(true);
				return;
			}

			// Stop if already found
			if (hasFoundCookies.current) {
				stopPolling();
				return;
			}

			// Check for cookies
			const cookies = await checkCookies();
			if (cookies && !hasFoundCookies.current) {
				hasFoundCookies.current = true;
				stopPolling();
				onSuccess(cookies);
			}
		};

		// Immediately check once
		void pollForCookies();

		// Then poll at intervals
		pollIntervalRef.current = setInterval(() => {
			void pollForCookies();
		}, pollIntervalMs);
	}, [stopPolling, checkCookies, onSuccess, pollIntervalMs, pollTimeoutMs]);

	const reset = useCallback(() => {
		setPollingTimedOut(false);
		hasFoundCookies.current = false;
	}, []);

	const manualCheck = useCallback(async (): Promise<boolean> => {
		const cookies = await checkCookies();
		if (cookies) {
			hasFoundCookies.current = true;
			stopPolling();
			onSuccess(cookies);
			return true;
		}
		setPollingTimedOut(true);
		return false;
	}, [checkCookies, stopPolling, onSuccess]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
			}
		};
	}, []);

	return {
		isPolling,
		pollingTimedOut,
		startPolling,
		stopPolling,
		reset,
		manualCheck,
	};
}
