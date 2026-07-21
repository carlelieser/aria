/**
 * ProgressToast Types
 *
 * Props interfaces for the progress toast and its subcomponents.
 */

export interface ProgressToastProps {
	/** Unique portal name for toast positioning */
	readonly portalName: string;
	/** Whether the background operation is currently running */
	readonly isActive: boolean;
	/** Whether the operation has completed (triggers auto-dismiss) */
	readonly isComplete: boolean;
	/** Human-readable phase description, e.g. "Scanning music files..." */
	readonly phaseMessage: string;
	/** 0-100 progress percentage. Ignored when `indeterminate` is true. */
	readonly percentage: number;
	/** Formatted count text, e.g. "5/10 files" or "342 tracks" */
	readonly progressText: string;
	/** Truncated current item label, or null if unavailable */
	readonly currentItemLabel: string | null;
	/**
	 * When true, the total is unknown: show an indeterminate bar and the
	 * `progressText` count instead of a percentage. Defaults to false.
	 */
	readonly indeterminate?: boolean;
	/**
	 * Optional line shown under the title while the operation is in progress,
	 * e.g. an ETA caveat. Hidden on completion. Defaults to none.
	 */
	readonly subtitle?: string;
}
