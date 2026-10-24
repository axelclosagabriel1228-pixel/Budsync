import assert from 'node:assert/strict'
import test from 'node:test'
import { blankData } from './data.js'
import { decodeSnapshot, encodeSnapshot, nextSnapshot } from './cloudSnapshot.js'

test('Firebase snapshot preserves empty wallet activity and rejects stale revisions', () => {
  const data = blankData()
  const payload = encodeSnapshot(data)
  const first = nextSnapshot(null, 0, payload)
  assert.equal(first.revision, 1)
  assert.deepEqual(decodeSnapshot(first).data.entries, [])
  assert.equal(nextSnapshot(null, 5, payload).revision, 1)
  assert.equal(nextSnapshot({ revision: 5, payload }, 5, payload).revision, 6)
  assert.equal(nextSnapshot({ revision: 6, payload }, 5, payload), undefined)
  assert.equal(nextSnapshot(first, 0, payload), undefined)
  assert.equal(nextSnapshot(first, 1, payload).revision, 2)
})
