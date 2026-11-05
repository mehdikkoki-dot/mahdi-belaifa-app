# رنّلي — Rennli customer app (test build)

Native iOS companion for the Rennli pager prototype. Connects to an existing
ticket on https://rennli.basatbelaifa7.workers.dev, shows the order status,
starts an iOS **Live Activity** (lock screen + Dynamic Island), and rings
in-app when the order is ready.

## Build (unsigned IPA via GitHub Actions)

1. Push this folder to a GitHub repo.
2. The `Build unsigned IPA` workflow runs XcodeGen + xcodebuild with signing
   disabled and uploads `Rennli-unsigned.ipa` as a build artifact.
3. Sign the IPA with your own certificate + provisioning profile (the profile's
   bundle id must match `PRODUCT_BUNDLE_IDENTIFIER` in `project.yml`, and the
   widget extension id must be `<bundle-id>.widgets`) and install it.

## What this build can and cannot do

- WORKS ad-hoc: install, ticket status, in-app ringing, Live Activity that
  starts and updates while the app is used.
- Needs a paid Apple Developer account later: App Clip from QR scan, APNs
  remote updates to the Live Activity while the app is closed, App Store
  distribution.

Bundle ids in `project.yml` are placeholders (`com.example.rennli`) — replace
them with the ids tied to your signing certificate before building.
