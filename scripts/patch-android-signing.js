// scripts/patch-android-signing.js
// Garante que build.gradle tem signingConfigs.release e buildTypes.release aponta para ele

const fs = require('fs');

const gradlePath = 'android/app/build.gradle';
let gradle = fs.readFileSync(gradlePath, 'utf8');

// 1. Garante que existe um signingConfigs.release
const hasReleaseConfig = /signingConfigs\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?storeFile/s.test(gradle);

if (!hasReleaseConfig) {
  const anchor = gradle.match(/signingConfigs\s*\{\s*\n/);
  if (!anchor) {
    console.error('[patch-signing] signingConfigs block not found');
    process.exit(1);
  }
  gradle = gradle.replace(
    anchor[0],
    anchor[0] + `        release {
            storeFile file(MYAPP_UPLOAD_STORE_FILE)
            storePassword MYAPP_UPLOAD_STORE_PASSWORD
            keyAlias MYAPP_UPLOAD_KEY_ALIAS
            keyPassword MYAPP_UPLOAD_KEY_PASSWORD
        }
`
  );
}

// 2. Aponta buildTypes.release para signingConfigs.release
const btIndex = gradle.indexOf('buildTypes');
if (btIndex === -1) {
  console.error('[patch-signing] buildTypes block not found');
  process.exit(1);
}

const head = gradle.slice(0, btIndex);
const tail = gradle.slice(btIndex);
const patchedTail = tail.replace(
  /(release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
  '$1signingConfig signingConfigs.release'
);

if (patchedTail === tail && !tail.includes('signingConfig signingConfigs.release')) {
  console.error('[patch-signing] release signingConfig assignment not found');
  process.exit(1);
}

fs.writeFileSync(gradlePath, head + patchedTail);
console.log('[patch-signing] build.gradle pronto para assinatura release');