// Polyfill Map.groupBy and Object.groupBy for Node 20
if (!Map.groupBy) {
  Map.groupBy = function (items, callback) {
    const map = new Map()
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

if (!Object.groupBy) {
  Object.groupBy = function (items, callback) {
    const result = {}
    let index = 0
    for (const item of items) {
      const key = callback(item, index++)
      if (!result[key]) {
        result[key] = []
      }
      result[key].push(item)
    }
    return result
  }
}

import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    setupFiles: ['./tests/setup.ts'],
  },
})
