// Node 20 compatibility polyfill for Map.groupBy and Object.groupBy
if (!(Map as any).groupBy) {
  (Map as any).groupBy = function <K, T>(items: Iterable<T>, callback: (item: T, index: number) => K): Map<K, T[]> {
    const map = new Map<K, T[]>()
    let index = 0
    for (const item of items) {
      const key = callback(item, index++)
      const list = map.get(key)
      if (list) {
        list.push(item)
      } else {
        map.set(key, [item])
      }
    }
    return map
  }
}

if (!(Object as any).groupBy) {
  (Object as any).groupBy = function <K extends PropertyKey, T>(
    items: Iterable<T>,
    callback: (item: T, index: number) => K
  ): Record<K, T[]> {
    const result = {} as Record<K, T[]>
    let index = 0
    for (const item of items) {
      const key = callback(item, index++)
      if (!result[key]) {
        result[key] = []
      }
      result[key]!.push(item)
    }
    return result
  }
}
