/**
 * Computes the difference between two objects.
 * Returns an object with keys for each changed field, and values as { old, new }.
 */
export function computeDiff<T extends object>(oldData: T, newData: T): Record<string, { old: any, new: any }> {
  const diff: Record<string, { old: any, new: any }> = {};
  for (const key of Object.keys(newData) as Array<keyof T>) {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      diff[String(key)] = { old: oldData[key], new: newData[key] };
    }
  }
  return diff;
}