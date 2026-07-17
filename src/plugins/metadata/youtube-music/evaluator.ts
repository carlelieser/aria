import { Platform } from 'youtubei.js/react-native';
import { Jinter } from 'jintr';
import { getLogger } from '@shared/services/logger';

const logger = getLogger('YouTubeMusic:Evaluator');

/**
 * youtubei.js v17 appends a self-contained `process()` helper to the
 * extracted player script and terminates it with a top-level
 * `return process(...)`, so the script must be executed as a function
 * body and its `{ n, sig }` result returned as-is.
 */
function evaluateWithJinter(script: string): unknown {
	const jinter = new Jinter();
	jinter.scope.set('Object', Object);
	jinter.scope.set('Array', Array);
	jinter.scope.set('String', String);
	jinter.scope.set('Number', Number);
	jinter.scope.set('Math', Math);
	jinter.scope.set('parseInt', parseInt);
	jinter.scope.set('parseFloat', parseFloat);
	jinter.scope.set('decodeURIComponent', decodeURIComponent);
	jinter.scope.set('encodeURIComponent', encodeURIComponent);
	jinter.scope.set('RegExp', RegExp);
	jinter.scope.set('JSON', JSON);

	// Top-level `return` is invalid outside a function body, so wrap the
	// script in an IIFE for the interpreter.
	return jinter.evaluate(`(function () {\n${script}\n})();`);
}

function createEvaluator() {
	return (data: { output: string }) => {
		try {
			const result = new Function(data.output)();
			logger.debug('Function() success');
			return result;
		} catch {
			logger.debug('Function() unavailable, interpreting with Jinter');
			try {
				const result = evaluateWithJinter(data.output);
				logger.debug('Jinter success');
				return result;
			} catch (jinterError) {
				logger.error(
					'Jinter also failed',
					jinterError instanceof Error ? jinterError : undefined
				);
				throw jinterError;
			}
		}
	};
}

export function installEvaluator(): void {
	try {
		Platform.shim.eval = createEvaluator();
		logger.info('Custom evaluator installed');
	} catch (e) {
		logger.error('Failed to install evaluator', e instanceof Error ? e : undefined);
	}
}
