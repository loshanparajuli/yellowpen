import { mkdirSync, statSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
if (process.platform !== 'darwin') { console.log('Native OCR is macOS-only. Manual text entry remains available.'); process.exit(0); }
mkdirSync('.native', { recursive: true });
const source='native/OCR.swift', output='.native/yellowpen-ocr';
if (existsSync(output) && statSync(output).mtimeMs >= statSync(source).mtimeMs) process.exit(0);
const result=spawnSync('swiftc',['-O','-module-cache-path','/tmp/yellowpen-swift-cache',source,'-o',output],{stdio:'inherit'});
if (result.status!==0) { console.error('Native OCR could not be built. Install Xcode Command Line Tools; manual text entry still works.'); process.exitCode=1; }
