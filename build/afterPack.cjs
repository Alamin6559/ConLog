// electron-builder afterPack hook.
//
// Apple Silicon requires every binary to carry at least an ad-hoc signature.
// electron-builder signs the bundle for us, but that signing step fails
// silently if any file in the tree carries extended attributes — iCloud Drive
// and some sync tools attach `com.apple.FinderInfo` and
// `com.apple.fileprovider.*`, and `codesign` refuses to sign a bundle that has
// them ("resource fork, Finder information, or similar detritus not allowed").
//
// The result is an .app with no Contents/_CodeSignature at all. It runs on the
// machine that built it, but once it has been downloaded and quarantined macOS
// reports "ConLog is damaged and can't be opened" — which removing the
// quarantine attribute does not fix.
//
// So: strip extended attributes, then ad-hoc sign, then verify. A failure here
// fails the build rather than shipping a broken bundle.

const { execFileSync, spawnSync } = require('child_process')
const path = require('path')

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  )

  const run = (bin, args) =>
    execFileSync(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString()

  console.log(`  • stripping extended attributes  path=${appPath}`)
  run('/usr/bin/xattr', ['-cr', appPath])

  // Only ad-hoc sign when electron-builder has not already applied a real
  // Developer ID signature; re-signing would throw that identity away.
  // Note: `codesign -dv` reports on stderr, not stdout.
  const probe = spawnSync('/usr/bin/codesign', ['-dvv', appPath], { encoding: 'utf8' })
  const desc = `${probe.stdout || ''}${probe.stderr || ''}`
  const hasRealIdentity =
    probe.status === 0 && /^Authority=/m.test(desc) && !/Signature=adhoc/.test(desc)

  if (hasRealIdentity) {
    console.log('  • real signing identity present, leaving signature alone')
  } else {
    console.log('  • ad-hoc signing')
    run('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', appPath])
  }

  run('/usr/bin/codesign', ['--verify', '--deep', '--strict', appPath])
  console.log('  • signature verified')
}
