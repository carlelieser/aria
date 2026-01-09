/**
 * JavaScript evaluator for YouTube Music in React Native
 *
 * Uses Function constructor when available, falls back to Jinter interpreter.
 */

import { Platform } from 'youtubei.js/react-native';
import { Jinter } from 'jintr';
import { getLogger } from '../../../shared/services/logger';

const logger = getLogger('YouTubeMusic:Evaluator');

/**
 * Create a custom JavaScript evaluator for React Native/Hermes environment
 */
function createEvaluator() {
  return (data: { output: string }, env: Record<string, unknown>) => {
    logger.debug('eval called');

    const properties: string[] = [];

    if (env.n) {
      properties.push(`n: exportedVars.nFunction("${env.n}")`);
    }

    if (env.sig) {
      properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
    }

    const code = `${data.output}\nreturn { ${properties.join(', ')} };`;

    try {
      const fn = new Function(code);
      const result = fn();
      logger.debug('Function() success');
      return result;
    } catch (fnError) {
      logger.debug('Function() failed, trying Jinter');

      try {
        const resultExpr = `({ ${properties.join(', ')} })`;
        const jinterCode = `${data.output}\nvar __result__ = ${resultExpr}; __result__;`;

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

        const result = jinter.evaluate(jinterCode);
        logger.debug('Jinter success');
        return result;
      } catch (jinterError) {
        logger.error('Jinter also failed', jinterError instanceof Error ? jinterError : undefined);
        throw jinterError;
      }
    }
  };
}

/**
 * Install the custom evaluator into the YouTube.js platform shim
 */
export function installEvaluator(): void {
  try {
    Platform.shim.eval = createEvaluator();
    logger.info('Custom evaluator installed');
  } catch (e) {
    logger.error('Failed to install evaluator', e instanceof Error ? e : undefined);
  }
}
