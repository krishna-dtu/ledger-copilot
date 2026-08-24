import { startVitest } from 'vitest/node'

const vitest = await startVitest('test', [], {
  watch: false,
  run: true,
})

await vitest?.close()
process.exit(vitest?.state.getCountOfFailedTests() || 0)
