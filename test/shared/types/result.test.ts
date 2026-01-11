import { describe, it, expect } from 'vitest';
import {
	ok,
	err,
	isOk,
	isErr,
	unwrap,
	unwrapOr,
	map,
	mapErr,
	andThen,
	tryCatch,
	tryCatchAsync,
	type Result,
} from '@shared/types/result';

describe('Result Type', () => {
	describe('ok', () => {
		it('should create a success result', () => {
			const result = ok(42);
			expect(result.success).toBe(true);
			expect((result as { data: number }).data).toBe(42);
		});

		it('should work with different data types', () => {
			expect(ok('string').success).toBe(true);
			expect(ok({ key: 'value' }).success).toBe(true);
			expect(ok([1, 2, 3]).success).toBe(true);
			expect(ok(null).success).toBe(true);
			expect(ok(undefined).success).toBe(true);
		});
	});

	describe('err', () => {
		it('should create an error result', () => {
			const result = err(new Error('Something went wrong'));
			expect(result.success).toBe(false);
			expect((result as { error: Error }).error.message).toBe('Something went wrong');
		});

		it('should work with different error types', () => {
			const stringErr = err('error message');
			expect(stringErr.success).toBe(false);

			const customErr = err({ code: 'NOT_FOUND', message: 'Resource not found' });
			expect(customErr.success).toBe(false);
		});
	});

	describe('isOk', () => {
		it('should return true for ok result', () => {
			const result = ok(42);
			expect(isOk(result)).toBe(true);
		});

		it('should return false for err result', () => {
			const result = err(new Error('error'));
			expect(isOk(result)).toBe(false);
		});

		it('should narrow type correctly', () => {
			const result: Result<number, Error> = ok(42);
			if (isOk(result)) {
				expect(result.data).toBe(42);
			}
		});
	});

	describe('isErr', () => {
		it('should return true for err result', () => {
			const result = err(new Error('error'));
			expect(isErr(result)).toBe(true);
		});

		it('should return false for ok result', () => {
			const result = ok(42);
			expect(isErr(result)).toBe(false);
		});

		it('should narrow type correctly', () => {
			const result: Result<number, Error> = err(new Error('test error'));
			if (isErr(result)) {
				expect(result.error.message).toBe('test error');
			}
		});
	});

	describe('unwrap', () => {
		it('should return data for ok result', () => {
			const result = ok(42);
			expect(unwrap(result)).toBe(42);
		});

		it('should throw error for err result', () => {
			const result = err(new Error('test error'));
			expect(() => unwrap(result)).toThrow('test error');
		});

		it('should throw the original error value', () => {
			const error = new Error('original error');
			const result = err(error);
			expect(() => unwrap(result)).toThrow(error);
		});
	});

	describe('unwrapOr', () => {
		it('should return data for ok result', () => {
			const result = ok(42);
			expect(unwrapOr(result, 0)).toBe(42);
		});

		it('should return default value for err result', () => {
			const result = err(new Error('error'));
			expect(unwrapOr(result, 0)).toBe(0);
		});

		it('should work with different default types', () => {
			const errResult = err(new Error('error'));
			expect(unwrapOr(errResult, 'default')).toBe('default');
			expect(unwrapOr(errResult, null)).toBeNull();
			expect(unwrapOr(errResult, [])).toEqual([]);
		});
	});

	describe('map', () => {
		it('should transform ok result data', () => {
			const result = ok(21);
			const mapped = map(result, (x) => x * 2);

			expect(isOk(mapped)).toBe(true);
			expect(unwrap(mapped)).toBe(42);
		});

		it('should not transform err result', () => {
			const result: Result<number, Error> = err(new Error('error'));
			const mapped = map(result, (x) => x * 2);

			expect(isErr(mapped)).toBe(true);
		});

		it('should preserve error value', () => {
			const error = new Error('original error');
			const result: Result<number, Error> = err(error);
			const mapped = map(result, (x) => x * 2);

			if (isErr(mapped)) {
				expect(mapped.error).toBe(error);
			}
		});

		it('should support type transformation', () => {
			const result = ok(42);
			const mapped = map(result, (x) => x.toString());

			expect(unwrap(mapped)).toBe('42');
		});
	});

	describe('mapErr', () => {
		it('should transform err result error', () => {
			const result: Result<number, string> = err('error');
			const mapped = mapErr(result, (e) => new Error(e));

			expect(isErr(mapped)).toBe(true);
			if (isErr(mapped)) {
				expect(mapped.error).toBeInstanceOf(Error);
			}
		});

		it('should not transform ok result', () => {
			const result: Result<number, string> = ok(42);
			const mapped = mapErr(result, (e) => new Error(e));

			expect(isOk(mapped)).toBe(true);
			expect(unwrap(mapped)).toBe(42);
		});

		it('should preserve data value', () => {
			const result: Result<{ value: number }, string> = ok({ value: 42 });
			const mapped = mapErr(result, (e) => new Error(e));

			if (isOk(mapped)) {
				expect(mapped.data.value).toBe(42);
			}
		});
	});

	describe('andThen', () => {
		it('should chain ok results', () => {
			const result = ok(21);
			const chained = andThen(result, (x) => ok(x * 2));

			expect(isOk(chained)).toBe(true);
			expect(unwrap(chained)).toBe(42);
		});

		it('should propagate first error', () => {
			const result: Result<number, string> = err('first error');
			const chained = andThen(result, (x) => ok(x * 2));

			expect(isErr(chained)).toBe(true);
			if (isErr(chained)) {
				expect(chained.error).toBe('first error');
			}
		});

		it('should propagate error from chain function', () => {
			const result = ok(21);
			const chained = andThen(result, (_x): Result<number, string> => err('chain error'));

			expect(isErr(chained)).toBe(true);
			if (isErr(chained)) {
				expect(chained.error).toBe('chain error');
			}
		});

		it('should support type transformation in chain', () => {
			const result = ok('42');
			const chained = andThen(result, (s) => ok(parseInt(s, 10)));

			expect(unwrap(chained)).toBe(42);
		});

		it('should support multiple chained operations', () => {
			const result = ok(10);
			const chained = andThen(
				andThen(result, (x) => ok(x + 5)),
				(x) => ok(x * 2)
			);

			expect(unwrap(chained)).toBe(30);
		});
	});

	describe('tryCatch', () => {
		it('should return ok result for successful function', () => {
			const result = tryCatch(() => 42);

			expect(isOk(result)).toBe(true);
			expect(unwrap(result)).toBe(42);
		});

		it('should return err result for throwing function', () => {
			const result = tryCatch(() => {
				throw new Error('test error');
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error.message).toBe('test error');
			}
		});

		it('should wrap non-Error throws in Error', () => {
			const result = tryCatch(() => {
				throw 'string error';
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(Error);
				expect(result.error.message).toBe('string error');
			}
		});

		it('should wrap number throws in Error', () => {
			const result = tryCatch(() => {
				throw 404;
			});

			if (isErr(result)) {
				expect(result.error.message).toBe('404');
			}
		});
	});

	describe('tryCatchAsync', () => {
		it('should return ok result for successful async function', async () => {
			const result = await tryCatchAsync(async () => {
				return 42;
			});

			expect(isOk(result)).toBe(true);
			expect(unwrap(result)).toBe(42);
		});

		it('should return err result for rejecting async function', async () => {
			const result = await tryCatchAsync(async () => {
				throw new Error('async error');
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error.message).toBe('async error');
			}
		});

		it('should return err result for rejected promise', async () => {
			const result = await tryCatchAsync(() => Promise.reject(new Error('rejected')));

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error.message).toBe('rejected');
			}
		});

		it('should wrap non-Error async throws in Error', async () => {
			const result = await tryCatchAsync(async () => {
				throw 'async string error';
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(Error);
				expect(result.error.message).toBe('async string error');
			}
		});

		it('should handle complex async operations', async () => {
			const result = await tryCatchAsync(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return { data: 'success' };
			});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.data).toBe('success');
			}
		});
	});

	describe('Integration', () => {
		it('should work in a realistic pipeline', () => {
			const parseNumber = (s: string): Result<number, string> => {
				const n = parseInt(s, 10);
				if (isNaN(n)) return err('Invalid number');
				return ok(n);
			};

			const double = (n: number): Result<number, string> => ok(n * 2);

			const ensurePositive = (n: number): Result<number, string> => {
				if (n < 0) return err('Number must be positive');
				return ok(n);
			};

			const pipeline = (input: string): Result<number, string> =>
				andThen(andThen(parseNumber(input), ensurePositive), double);

			expect(unwrap(pipeline('21'))).toBe(42);
			expect(isErr(pipeline('abc'))).toBe(true);
			expect(isErr(pipeline('-5'))).toBe(true);
		});

		it('should work with async pipeline', async () => {
			const fetchUser = async (id: string): Promise<Result<{ name: string }, Error>> => {
				if (id === 'valid') {
					return ok({ name: 'John' });
				}
				return err(new Error('User not found'));
			};

			const result = await fetchUser('valid');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.name).toBe('John');
			}

			const errorResult = await fetchUser('invalid');
			expect(isErr(errorResult)).toBe(true);
		});
	});
});
