// scripts/patch-android-signing.js
// Roda DEPOIS do `expo prebuild`. Faz 3 coisas:
//  1. Escreve MYAPP_UPLOAD_* no android/gradle.properties (idempotente)
//  2. Injeta signingConfigs.release no android/app/build.gradle (se faltar)
//  3. Aponta buildTypes.release para signingConfigs.release

const fs = require('fs');

const PROPS = {
  MYAPP_UPLOAD_STORE_FILE: 'upload-keystore.jks',
  MYAPP_UPLOAD_KEY_ALIAS: process.env.KEY_ALIAS,
  MYAPP_UPLOAD_STORE_PASSWORD: process.env.KEYSTORE_PASSWORD,
  MYAPP_UPLOAD_KEY_PASSWORD: process.env.KEY_PASSWORD,
};

for (const [k, v] of Object.entries(PROPS)) {
  if (!v) {
    console.error(`[patch-signing] variavel de ambiente ausente: ${k}`);
    process.exit(1);
  }
}

// ---------- 1. gradle.properties ----------
const propsPath = 'android/gradle.properties';
const keys = Object.keys(PROPS);

if (!fs.existsSync(propsPath)) {
  console.error(`[patch-signing] ${propsPath} nao encontrado - prebuild rodou?`);
  process.exit(1);
}

let props = fs.readFileSync(propsPath, 'utf8');
props = props
  .split('\n')
  .filter((l) => !keys.some((k) => l.trim().startsWith(k + '=')))
  .join('\n')
  .replace(/\n*$/, '\n');
for (const k of keys) props += `${k}=${PROPS[k]}\n`;
fs.writeFileSync(propsPath, props);

// Verificacao: rele o arquivo e confirma que as chaves estao la
const check = fs.readFileSync(propsPath, 'utf8');
const missing = keys.filter((k) => !check.includes(`${k}=`));
if (missing.length) {
  console.error(`[patch-signing] FALHOU ao gravar em gradle.properties: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`[patch-signing] gradle.properties OK (${keys.length} chaves MYAPP_UPLOAD_*)`);

// ---------- 2. signingConfigs.release ----------
const gradlePath = 'android/app/build.gradle';
if (!fs.existsSync(gradlePath)) {
  console.error(`[patch-signing] ${gradlePath} nao encontrado`);
  process.exit(1);
}

let gradle = fs.readFileSync(gradlePath, 'utf8');

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
  console.log('[patch-signing] signingConfigs.release injetado');
} else {
  console.log('[patch-signing] signingConfigs.release ja existia');
}

// ---------- 3. buildTypes.release -> signingConfigs.release ----------
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
