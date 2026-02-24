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
	/** 0-100 progress percentage */
	readonly percentage: number;
	/** Formatted count text, e.g. "5/10 files" or "5/10" */
	readonly progressText: string;
	/** Truncated current item label, or null if unavailable */
	readonly currentItemLabel: string | null;
}
