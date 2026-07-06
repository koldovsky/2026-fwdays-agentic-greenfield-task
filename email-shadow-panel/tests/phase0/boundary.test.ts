import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

const projectRoot = process.cwd();
const srcRoot = resolve(projectRoot, "src");
const forbiddenRoots = [
  resolve(projectRoot, "server"),
  resolve(projectRoot, "api"),
  resolve(projectRoot, "scripts"),
];

function walkFiles(entryPath: string): string[] {
  const stat = statSync(entryPath);
  if (stat.isFile()) {
    return [entryPath];
  }

  return readdirSync(entryPath).flatMap((child) => walkFiles(resolve(entryPath, child)));
}

function normalizeSpecifier(filePath: string, specifier: string): string | null {
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return resolve(dirname(filePath), specifier);
  }

  if (specifier.startsWith("@/")) {
    return resolve(srcRoot, specifier.slice(2));
  }

  return null;
}

test("browser code under src does not import server, api, or scripts modules", () => {
  const sourceFiles = walkFiles(srcRoot).filter((filePath) => /\.(ts|tsx)$/.test(filePath));
  const violations: string[] = [];

  for (const filePath of sourceFiles) {
    const sourceFile = ts.createSourceFile(
      filePath,
      readFileSync(filePath, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );

    sourceFile.forEachChild((node) => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const normalized = normalizeSpecifier(filePath, node.moduleSpecifier.text);
        if (normalized && forbiddenRoots.some((root) => normalized.startsWith(root))) {
          violations.push(`${filePath}: ${node.moduleSpecifier.text}`);
        }
      }
    });
  }

  assert.deepEqual(violations, []);
});
