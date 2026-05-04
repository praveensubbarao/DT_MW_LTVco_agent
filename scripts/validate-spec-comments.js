import fs from 'fs';
import path from 'path';

/**
 * Validate that all test() blocks have // Steps: comments
 */
function validateSpecComments() {
  const testDir = path.join(process.cwd(), 'src/tests');
  const specFiles: string[] = [];

  function walkDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (file.endsWith('.spec.ts')) {
        specFiles.push(fullPath);
      }
    }
  }

  walkDir(testDir);

  let hasErrors = false;
  const errors: string[] = [];

  for (const file of specFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Match test() blocks
      if (line.match(/^\s*test\s*\(/)) {
        // Check if previous non-empty line is a Steps comment
        let j = i - 1;
        while (j >= 0 && !lines[j].trim()) {
          j--;
        }
        if (j < 0 || !lines[j].includes('// Steps:')) {
          hasErrors = true;
          errors.push(`${file}:${i + 1} - Missing "// Steps:" comment above test block`);
        }
      }
    }
  }

  if (hasErrors) {
    console.error('❌ Spec comment validation failed:\n');
    errors.forEach(err => console.error(err));
    process.exit(1);
  }

  console.log('✓ All test blocks have step comments');
  process.exit(0);
}

validateSpecComments();
