import React, { Component, type ReactNode, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { PlayerAwareScrollView } from '@/components/ui/player-aware-scroll-view';

const ERROR_TAG = '[ErrorCapture]';

type ErrorHandler = (error: Error, isFatal?: boolean) => void;
interface ErrorUtilsType {
	getGlobalHandler: () => ErrorHandler;
	setGlobalHandler: (handler: ErrorHandler) => void;
}

declare const global: {
	ErrorUtils?: ErrorUtilsType;
};

interface ErrorInfo {
	componentStack: string;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null, errorInfo: null };
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		console.error(ERROR_TAG, 'React Error Boundary caught error:');
		console.error(ERROR_TAG, 'Error:', error.message);
		console.error(ERROR_TAG, 'Stack:', error.stack);
		console.error(ERROR_TAG, 'Component Stack:', errorInfo.componentStack);

		this.setState({ errorInfo });
	}

	_handleReset = (): void => {
		this.setState({ hasError: false, error: null, errorInfo: null });
	};

	render(): ReactNode {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<View style={styles.container}>
					<View style={styles.header}>
						<Text style={styles.title}>Something went wrong</Text>
						<Pressable onPress={this._handleReset} style={styles.resetButton}>
							<Text style={styles.resetButtonText}>Try Again</Text>
						</Pressable>
					</View>
					<PlayerAwareScrollView style={styles.scrollView}>
						<Text style={styles.errorName}>{this.state.error?.name}</Text>
						<Text style={styles.errorMessage}>{this.state.error?.message}</Text>
						{this.state.error?.stack && (
							<>
								<Text style={styles.sectionTitle}>Stack Trace:</Text>
								<Text style={styles.stackTrace}>{this.state.error.stack}</Text>
							</>
						)}
						{this.state.errorInfo?.componentStack && (
							<>
								<Text style={styles.sectionTitle}>Component Stack:</Text>
								<Text style={styles.stackTrace}>
									{this.state.errorInfo.componentStack}
								</Text>
							</>
						)}
					</PlayerAwareScrollView>
				</View>
			);
		}

		return this.props.children;
	}
}

export function useGlobalErrorHandlers(): void {
	useEffect(() => {
		const errorUtils = global.ErrorUtils;

		if (!errorUtils) {
			return;
		}

		const originalHandler = errorUtils.getGlobalHandler();

		errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
			console.error(ERROR_TAG, '=== UNHANDLED JS ERROR ===');
			console.error(ERROR_TAG, 'Fatal:', isFatal);
			console.error(ERROR_TAG, 'Error:', error.message);
			console.error(ERROR_TAG, 'Stack:', error.stack);
			console.error(ERROR_TAG, '==========================');

			if (originalHandler) {
				originalHandler(error, isFatal);
			}
		});

		return () => {
			errorUtils.setGlobalHandler(originalHandler);
		};
	}, []);
}

export function withErrorLogging<T extends unknown[], R>(
	fn: (...args: T) => Promise<R>,
	context: string
): (...args: T) => Promise<R> {
	return async (...args: T): Promise<R> => {
		try {
			return await fn(...args);
		} catch (error) {
			console.error(ERROR_TAG, `Error in ${context}:`);
			if (error instanceof Error) {
				console.error(ERROR_TAG, 'Message:', error.message);
				console.error(ERROR_TAG, 'Stack:', error.stack);
			} else {
				console.error(ERROR_TAG, 'Error:', error);
			}
			throw error;
		}
	};
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#1a1a1a',
		padding: 16,
		paddingTop: 60,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	title: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#ff6b6b',
	},
	resetButton: {
		backgroundColor: '#333',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
	},
	resetButtonText: {
		color: '#fff',
		fontWeight: '600',
	},
	scrollView: {
		flex: 1,
		borderRadius: 12,
		overflow: 'hidden',
	},
	errorName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#ff9999',
		marginBottom: 4,
	},
	errorMessage: {
		fontSize: 14,
		color: '#fff',
		marginBottom: 16,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#888',
		marginTop: 12,
		marginBottom: 4,
	},
	stackTrace: {
		fontSize: 11,
		color: '#aaa',
		fontFamily: 'monospace',
	},
});
