import { createFolder, downloadFile, findRoot, listChildren, trashFile, updateFolder, uploadFile } from './googleDrive.js'
import { clearDriveDelete, listDriveDeletes, listReceiptFolders, listReceipts, putReceipt, putReceiptFolder } from './receiptStore.js'

const kind = (file, value) => file.appProperties?.budsyncKind === value
const idOf = (file) => file.appProperties?.budsyncId
const stamp = (item) => item.updatedAt || item.createdAt || ''
const metadata = (item) => JSON.stringify(Object.fromEntries(Object.entries(item).filter(([key]) => !['blob', 'key', 'scope'].includes(key))))
const match = (files, type, id) => files.find((file) => kind(file, type) && idOf(file) === id)

async function rootFor(token, scope, create) {
  const existing = await findRoot(token, scope)
  if (existing || !create) return existing
  return createFolder(token, 'Budsync', null, { budsyncKind: 'root', budsyncOwner: scope })
}

async function inventory(token, root) {
  const top = await listChildren(token, root.id)
  const wallets = top.filter((file) => kind(file, 'wallet'))
  const walletChildren = await Promise.all(wallets.map(async (wallet) => [wallet.id, await listChildren(token, wallet.id)]))
  return { wallets, children: new Map(walletChildren) }
}

async function applyDeletes(token, scope, remote) {
  const deletes = await listDriveDeletes(scope)
  for (const item of deletes) {
    if (item.kind === 'folder') {
      const file = [...remote.children.values()].flat().find((candidate) => match([candidate], 'folder', item.id))
      if (file) await trashFile(token, file.id)
    } else {
      for (const children of remote.children.values()) {
        for (const folder of children.filter((file) => kind(file, 'folder'))) {
          const files = await listChildren(token, folder.id)
          for (const file of files.filter((candidate) => idOf(candidate) === item.id && ['receiptMeta', 'receiptImage'].some((type) => kind(candidate, type)))) {
            await trashFile(token, file.id)
          }
        }
      }
    }
    await clearDriveDelete(scope, item.kind, item.id)
  }
}

export async function restoreFromDrive(token, scope, wallets) {
  const root = await rootFor(token, scope, false)
  if (!root) return { folders: 0, receipts: 0, skipped: 0 }
  const localFolders = await listReceiptFolders(scope)
  const localReceipts = await listReceipts(scope)
  const deletes = await listDriveDeletes(scope)
  const deleted = new Set(deletes.map((item) => `${item.kind}:${item.id}`))
  const knownFolders = new Set(localFolders.map((item) => item.id))
  const knownReceipts = new Set(localReceipts.map((item) => item.id))
  const remote = await inventory(token, root)
  const restored = []
  let folderCount = 0
  let skipped = 0
  for (const wallet of remote.wallets) {
    const walletId = idOf(wallet)
    if (!wallets.some((item) => item.id === walletId)) { skipped += 1; continue }
    for (const folderFile of (remote.children.get(wallet.id) || []).filter((file) => kind(file, 'folder'))) {
      if (deleted.has(`folder:${idOf(folderFile)}`)) continue
      const files = await listChildren(token, folderFile.id)
      const folderMeta = match(files, 'folderMeta', idOf(folderFile))
      if (!folderMeta) { skipped += 1; continue }
      const folder = JSON.parse(await (await downloadFile(token, folderMeta.id)).text())
      if (!folder.id || folder.walletId !== walletId) { skipped += 1; continue }
      if (!knownFolders.has(folder.id)) { await putReceiptFolder(scope, folder); knownFolders.add(folder.id); folderCount += 1 }
      for (const file of files.filter((item) => kind(item, 'receiptMeta'))) {
        if (deleted.has(`receipt:${idOf(file)}`) || knownReceipts.has(idOf(file))) continue
        const receipt = JSON.parse(await (await downloadFile(token, file.id)).text())
        if (!receipt.id || receipt.folderId !== folder.id || !receipt.entryId || !Number.isFinite(receipt.amount)) { skipped += 1; continue }
        const image = match(files, 'receiptImage', receipt.id)
        if (image) receipt.blob = await downloadFile(token, image.id)
        await putReceipt(scope, receipt)
        knownReceipts.add(receipt.id)
        restored.push({ receipt, folder })
      }
    }
  }
  return { folders: folderCount, receipts: restored.length, skipped, restored }
}

export async function syncToDrive(token, scope, wallets) {
  const root = await rootFor(token, scope, true)
  const remote = await inventory(token, root)
  await applyDeletes(token, scope, remote)
  const localFolders = await listReceiptFolders(scope)
  const localReceipts = await listReceipts(scope)
  let uploaded = 0
  for (const wallet of wallets) {
    const folders = localFolders.filter((item) => item.walletId === wallet.id)
    if (!folders.length) continue
    let walletFile = match(remote.wallets, 'wallet', wallet.id)
    if (!walletFile) walletFile = await createFolder(token, wallet.name, root.id, { budsyncKind: 'wallet', budsyncId: wallet.id })
    else if (walletFile.name !== wallet.name) await updateFolder(token, walletFile, wallet.name)
    const children = remote.children.get(walletFile.id) || await listChildren(token, walletFile.id)
    for (const folder of folders) {
      let folderFile = [...remote.children.values()].flat().find((file) => kind(file, 'folder') && idOf(file) === folder.id)
      if (!folderFile) folderFile = await createFolder(token, folder.name, walletFile.id, { budsyncKind: 'folder', budsyncId: folder.id })
      else if (folderFile.name !== folder.name || !children.some((file) => file.id === folderFile.id)) {
        const oldWallet = [...remote.children.entries()].find(([, files]) => files.some((file) => file.id === folderFile.id))?.[0]
        folderFile = await updateFolder(token, folderFile, folder.name, walletFile.id, oldWallet)
      }
      const files = await listChildren(token, folderFile.id)
      const properties = { budsyncKind: 'folderMeta', budsyncId: folder.id, budsyncRevision: stamp(folder) }
      const previous = match(files, 'folderMeta', folder.id)
      if (!previous || (previous.appProperties?.budsyncRevision || '') < stamp(folder)) {
        await uploadFile(token, previous?.id, folderFile.id, 'folder.json', metadata(folder), 'application/json', properties)
        uploaded += 1
      }
      for (const receipt of localReceipts.filter((item) => item.folderId === folder.id)) {
        const receiptProperties = { budsyncKind: 'receiptMeta', budsyncId: receipt.id, budsyncRevision: stamp(receipt) }
        const oldMeta = match(files, 'receiptMeta', receipt.id)
        if (oldMeta && (oldMeta.appProperties?.budsyncRevision || '') > stamp(receipt)) continue
        if (!oldMeta || (oldMeta.appProperties?.budsyncRevision || '') < stamp(receipt)) {
          await uploadFile(token, oldMeta?.id, folderFile.id, `${receipt.id}.json`, metadata(receipt), 'application/json', receiptProperties)
          uploaded += 1
        }
        const oldImage = match(files, 'receiptImage', receipt.id)
        if (receipt.blob && (!oldImage || (oldImage.appProperties?.budsyncRevision || '') < stamp(receipt))) {
          await uploadFile(token, oldImage?.id, folderFile.id, `${receipt.id}.jpg`, receipt.blob, receipt.blob.type || 'image/jpeg',
            { budsyncKind: 'receiptImage', budsyncId: receipt.id, budsyncRevision: stamp(receipt) })
          uploaded += 1
        } else if (!receipt.blob && oldImage) await trashFile(token, oldImage.id)
      }
    }
  }
  return { uploaded }
}
