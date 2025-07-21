export async function concurrent<T extends any[]>(
  ...promises: Promise<T[number]>[]
) {
  return Promise.all(promises);
}
