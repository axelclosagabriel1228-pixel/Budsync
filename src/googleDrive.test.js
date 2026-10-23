import assert from 'node:assert/strict'
import test from 'node:test'
import { listChildren, trashFile, uploadFile } from './googleDrive.js'

test('Drive listing follows pages and keeps app file metadata', async () => {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options })
    return Response.json(calls.length === 1
      ? { files: [{ id: 'folder-1', appProperties: { budsyncKind: 'folder' } }], nextPageToken: 'second' }
      : { files: [{ id: 'folder-2' }] })
  }
  try {
    const files = await listChildren('token', 'wallet-1')
    assert.deepEqual(files.map((file) => file.id), ['folder-1', 'folder-2'])
    assert.match(calls[0].url, /wallet-1/)
    assert.match(calls[1].url, /pageToken=second/)
    assert.equal(calls[0].options.headers.Authorization, 'Bearer token')
  } finally { globalThis.fetch = original }
})

test('Drive creates receipt metadata and moves deleted files to Trash', async () => {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options })
    return Response.json({ id: 'file-1' })
  }
  try {
    await uploadFile('token', null, 'folder-1', 'receipt.json', '{"amount":1000}', 'application/json',
      { budsyncKind: 'receiptMeta', budsyncId: 'receipt-1' })
    await trashFile('token', 'file-1')
    assert.match(calls[0].url, /uploadType=multipart/)
    assert.match(calls[0].options.headers['Content-Type'], /multipart\/related/)
    const body = await calls[0].options.body.text()
    assert.match(body, /receipt-1/)
    assert.match(body, /"amount":1000/)
    assert.deepEqual(JSON.parse(calls[1].options.body), { trashed: true })
  } finally { globalThis.fetch = original }
})
