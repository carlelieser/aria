export type Result<T, E = Error> =
	| { readonly success: true; readonly data: T }
	| { readonly success: false; readonly error: E };

export function ok<T>(data: T): Result<T, never> {
	return { success: true, data };
}

export function err<E>(error: E): Result<never, E> {
	return { success: false, error };
}

export function isOk<T, E>(
	result: Result<T, E>
): result is { readonly success: true; readonly data: T } {
	return result.success;
}

export function isErr<T, E>(
	result: Result<T, E>
): result is { readonly success: false; readonly error: E } {
	return !result.success;
}

export function unwrap<T, E>(result: Result<T, E>): T {
	if (isOk(result)) {
		return result.data;
	}
	throw result.error;
}

export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
	if (isOk(result)) {
		return result.data;
	}
	return defaultValue;
}

export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
	if (isOk(result)) {
		return ok(fn(result.data));
	}
	return result as Result<never, E>;
}

export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
	if (isErr(result)) {
		return err(fn(result.error));
	}
	return result as Result<T, never>;
}

export function andThen<T, U, E>(
	result: Result<T, E>,
	fn: (value: T) => Result<U, E>
): Result<U, E> {
	if (isOk(result)) {
		return fn(result.data);
	}
	return result as Result<never, E>;
}

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

export function tryCatch<T>(fn: () => T): Result<T, Error> {
	try {
		return ok(fn());
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)));
	}
}

export async function tryCatchAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
	try {
		const data = await fn();
		return ok(data);
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)));
	}
}
