#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';

interface Args {
  featureId: string;
  featureName: string;
  source: string;
  dest: string;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const parsed: Partial<Args> = {};

  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case '--feature-id':
        parsed.featureId = value;
        break;
      case '--feature-name':
        parsed.featureName = value;
        break;
      case '--source':
        parsed.source = value;
        break;
      case '--dest':
        parsed.dest = value;
        break;
      default:
        console.error(`Unknown flag: ${flag}`);
        process.exit(1);
    }
  }

  if (!parsed.featureId || !parsed.featureName || !parsed.source || !parsed.dest) {
    console.error('Usage: rename-video.ts --feature-id <id> --feature-name <slug> --source <path> --dest <dir>');
    process.exit(1);
  }

  return parsed as Args;
}

function formatTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
}

function main() {
  const { featureId, featureName, source, dest } = parseArgs();

  if (!fs.existsSync(source)) {
    console.error(`Source file not found: ${source}`);
    process.exit(1);
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const ext = path.extname(source);
  const timestamp = formatTimestamp();
  const newName = `${featureId}-${featureName}-${timestamp}${ext}`;
  const destPath = path.join(dest, newName);

  // `fs.renameSync` throws `EXDEV: cross-device link not permitted` when
  // the source is in `/tmp/` and the destination is on a different
  // filesystem (e.g. the repo volume). Fall back to copy + unlink
  // (which works across filesystems at the cost of one extra copy).
  try {
    fs.renameSync(source, destPath);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "EXDEV") {
      fs.copyFileSync(source, destPath);
      fs.unlinkSync(source);
    } else {
      throw e;
    }
  }

  console.log(`Video saved: ${destPath}`);

  const tmpDir = path.dirname(source);
  console.log(`\nCleanup: rm -rf "${tmpDir}"`);
}

main();
