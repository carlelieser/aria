/**
 * Crypto Polyfill for React Native
 *
 * Provides a Web Crypto API compatible shim using expo-crypto.
 * Required for youtubei.js authenticated requests which use crypto.subtle.digest.
 */

import * as ExpoCrypto from 'expo-crypto';

if (typeof globalThis.crypto === 'undefined') {
	(globalThis as Record<string, unknown>).crypto = {};
}

if (typeof globalThis.crypto.subtle === 'undefined') {
	const subtle = {
		async digest(algorithm: AlgorithmIdentifier, data: BufferSource): Promise<ArrayBuffer> {
			const algoName = typeof algorithm === 'string' ? algorithm : algorithm.name;
			const normalizedAlgo = algoName.toUpperCase().replace('-', '');

			let expoCryptoAlgo: ExpoCrypto.CryptoDigestAlgorithm;
			switch (normalizedAlgo) {
				case 'SHA1':
					expoCryptoAlgo = ExpoCrypto.CryptoDigestAlgorithm.SHA1;
					break;
				case 'SHA256':
					expoCryptoAlgo = ExpoCrypto.CryptoDigestAlgorithm.SHA256;
					break;
				case 'SHA384':
					expoCryptoAlgo = ExpoCrypto.CryptoDigestAlgorithm.SHA384;
					break;
				case 'SHA512':
					expoCryptoAlgo = ExpoCrypto.CryptoDigestAlgorithm.SHA512;
					break;
				case 'MD5':
					expoCryptoAlgo = ExpoCrypto.CryptoDigestAlgorithm.MD5;
					break;
				default:
					throw new Error(`Unsupported algorithm: ${algoName}`);
			}

			let uint8Array: Uint8Array;
			if (data instanceof ArrayBuffer) {
				uint8Array = new Uint8Array(data);
			} else if (ArrayBuffer.isView(data)) {
				uint8Array = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
			} else {
				throw new Error('Invalid data type for digest');
			}

			const hexDigest = await ExpoCrypto.digestStringAsync(
				expoCryptoAlgo,
				Array.from(uint8Array)
					.map((b) => String.fromCharCode(b))
					.join(''),
				{ encoding: ExpoCrypto.CryptoEncoding.HEX }
			);

			const bytes = new Uint8Array(hexDigest.length / 2);
			for (let i = 0; i < hexDigest.length; i += 2) {
				bytes[i / 2] = parseInt(hexDigest.substring(i, i + 2), 16);
			}

			return bytes.buffer;
		},
	};

	(globalThis.crypto as unknown as Record<string, unknown>).subtle = subtle;
}

export {};
