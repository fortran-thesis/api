type TimestampLike = {
  toDate?: () => Date;
  _seconds?: number;
  _nanoseconds?: number;
  seconds?: number;
  nanoseconds?: number;
};

const toIsoString = (value: TimestampLike | Date): string | null => {
  try {
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value.toISOString();
    }

    if (typeof value?.toDate === "function") {
      const date = value.toDate();
      return date instanceof Date && !isNaN(date.getTime()) ? date.toISOString() : null;
    }

    const seconds =
      typeof value?._seconds === "number" ?
        value._seconds :
        typeof value?.seconds === "number" ?
          value.seconds :
          null;

    if (seconds === null) return null;

    const nanos =
      typeof value?._nanoseconds === "number" ?
        value._nanoseconds :
        typeof value?.nanoseconds === "number" ?
          value.nanoseconds :
          0;

    const ms = seconds * 1000 + Math.floor(nanos / 1000000);
    const date = new Date(ms);
    return isNaN(date.getTime()) ? null : date.toISOString();
  } catch {
    return null;
  }
};

const isTimestampLike = (value: unknown): value is TimestampLike => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as TimestampLike;
  return (
    typeof candidate.toDate === "function" ||
    typeof candidate._seconds === "number" ||
    typeof candidate.seconds === "number"
  );
};

export const normalizeResponseTimestamps = <T>(value: T): T => {
  const walk = (input: unknown): unknown => {
    if (input === null || input === undefined) return input;

    if (input instanceof Date) {
      return toIsoString(input) ?? input;
    }

    if (Array.isArray(input)) {
      return input.map((item) => walk(item));
    }

    if (isTimestampLike(input)) {
      return toIsoString(input) ?? input;
    }

    if (typeof input === "object") {
      const output: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(input as Record<string, unknown>)) {
        output[key] = walk(item);
      }
      return output;
    }

    return input;
  };

  return walk(value) as T;
};
