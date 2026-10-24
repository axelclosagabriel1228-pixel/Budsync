# Budsync release check

Use two browsers or devices signed into the same Budsync account and the same Google Drive account. Keep a JSON backup before testing restore or conflict choices.

## Money records

- [ ] Start with known opening balances. Add income, expense, adjustment, and transfer entries. Check each wallet and the combined balance after every entry.
- [ ] Edit an entry with a reason. Confirm the balance preview matches the saved result and the edit reason appears in history.
- [ ] Delete and restore an entry. Confirm balances and monthly reports change only once.
- [ ] Filter transactions by wallet and date, then clear the filters.

## Receipts and Drive

- [ ] On device A, take a photo and choose an existing image in separate tests. Confirm merchant, date, amount, wallet, and crop before saving.
- [ ] Confirm each image first says it is saved on this device, then says it is in Google Drive. Check the image file in `Budsync/<wallet>/<folder>/`.
- [ ] On device B, connect Drive and download changes. Confirm both receipt images and linked wallet expenses appear once.
- [ ] Attach an image to an existing amount. Confirm the expense is not deducted again.
- [ ] Disconnect the network, save an image, reconnect, and use Retry upload. Confirm the status reaches Google Drive.
- [ ] Reconnect Drive after its browser token expires. Confirm queued images upload.
- [ ] Delete a receipt on device A and sync both devices. Confirm its image is removed from the active Drive folder and its expense is reversed once.

## Account, backup, and phone UI

- [ ] Refresh both devices and confirm wallet changes sync. Review a conflict without losing either copy before choosing one.
- [ ] Download a JSON backup, inspect the restore summary, and restore it in a disposable workspace. Confirm balances match. Receipt images must be restored separately from Drive.
- [ ] Check the receipt flow and transaction form at 320 px and 390 px widths, in light and dark themes, with keyboard focus and larger browser text.
- [ ] Run `npm test`, `npm run lint`, and `npm run build` before deployment. After deployment, check the live page and repeat one photo upload and one device B restore.
