type DeepFreeze<T> = T extends any[]
	? ReadonlyArray<DeepFreeze<T[number]>>
	: T extends Record<string, unknown>
		? {
				readonly [K in keyof T]: DeepFreeze<T[K]>;
			}
		: T;

export function deepFreeze<T>(obj: T): DeepFreeze<T> {
	if (!obj) {
		return obj as DeepFreeze<T>;
	}

	if (typeof obj !== "object") {
		return obj as DeepFreeze<T>;
	}

	Object.freeze(obj);

	if (Array.isArray(obj)) {
		for (const item of obj) {
			deepFreeze(item);
		}
	} else {
		Object.values(obj).forEach(deepFreeze);
	}

	return obj as DeepFreeze<T>;
}
