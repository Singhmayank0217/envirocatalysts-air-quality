const fs = require('fs');
const path = require('path');
const parser = require('../mobile/node_modules/@babel/parser');
const traverse = require('../mobile/node_modules/@babel/traverse').default;

const mobileDir = path.resolve(__dirname, '..', 'mobile');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    if (['node_modules', '.expo', 'dist', '.claude', 'assets'].includes(file)) return;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = getFiles(mobileDir);

const validRnRoles = new Set([
  'none', 'button', 'link', 'search', 'image', 'keyboardkey', 'text', 'header',
  'summary', 'imagebutton', 'alert', 'checkbox', 'combobox', 'menu', 'menubar',
  'menuitem', 'progressbar', 'radio', 'radiogroup', 'scrollbar', 'spinbutton',
  'switch', 'tab', 'tablist', 'timer', 'toolbar'
]);

let totalJsxElements = 0;
let pressables = [];
let allRoles = [];
let invalidRnRoles = [];
let forbiddenProjectRoles = []; // summary, note, status
let liveRegions = [];
let hitSlops = [];
let contrastMatches = {
  '#486581': { count: 0, files: new Set() },
  '#627D98': { count: 0, files: new Set() },
  '#102A43': { count: 0, files: new Set() },
  '#52606D': { count: 0, files: new Set() },
  '#334E68': { count: 0, files: new Set() },
  '#1E293B': { count: 0, files: new Set() },
  '#0F172A': { count: 0, files: new Set() }
};

const interactiveElements = new Set(['Pressable', 'TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback']);

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const rel = path.relative(mobileDir, f);

  // Contrast colors count
  Object.keys(contrastMatches).forEach(col => {
    const re = new RegExp(col, 'gi');
    const matches = content.match(re);
    if (matches) {
      contrastMatches[col].count += matches.length;
      contrastMatches[col].files.add(rel);
    }
  });

  let ast;
  try {
    ast = parser.parse(content, {
      sourceType: 'module',
      plugins: ['jsx']
    });
  } catch (err) {
    console.error(`Error parsing ${rel}:`, err.message);
    return;
  }

  traverse(ast, {
    JSXOpeningElement(pathNode) {
      totalJsxElements++;
      const elementName = pathNode.node.name.name;
      const attributes = pathNode.node.attributes;

      let role = null;
      let label = null;
      let state = null;
      let liveRegion = null;
      let hitSlop = null;

      attributes.forEach(attr => {
        if (attr.type !== 'JSXAttribute') return;
        const attrName = attr.name.name;

        if (attrName === 'accessibilityRole') {
          if (attr.value?.type === 'StringLiteral') {
            role = attr.value.value;
          }
        }
        if (attrName === 'accessibilityLabel') {
          label = true;
        }
        if (attrName === 'accessibilityState') {
          state = true;
        }
        if (attrName === 'accessibilityLiveRegion') {
          if (attr.value?.type === 'StringLiteral') {
            liveRegion = attr.value.value;
          }
        }
        if (attrName === 'hitSlop') {
          hitSlop = true;
        }
      });

      const line = pathNode.node.loc?.start.line || 0;

      if (role) {
        allRoles.push({ file: rel, line, role });

        if (role === 'summary' || role === 'note' || role === 'status') {
          forbiddenProjectRoles.push({ file: rel, line, role });
        }
        if (!validRnRoles.has(role)) {
          invalidRnRoles.push({ file: rel, line, role });
        }
      }

      if (liveRegion) {
        liveRegions.push({ file: rel, line, value: liveRegion });
      }

      if (hitSlop) {
        hitSlops.push({ file: rel, line });
      }

      if (interactiveElements.has(elementName)) {
        pressables.push({
          file: rel,
          line,
          element: elementName,
          role,
          hasLabel: Boolean(label),
          hasState: Boolean(state),
          hasHitSlop: Boolean(hitSlop)
        });
      }
    }
  });
});

console.log('================================================================');
console.log('AUTOMATED STATIC ACCESSIBILITY AUDIT (AST PARSER)');
console.log('================================================================');
console.log(`Scanned source files: ${files.length}`);
console.log(`Total JSX elements parsed: ${totalJsxElements}`);

console.log('\n--- 1. ACCESSIBILITY ROLES AUDIT ---');
console.log(`Total accessibilityRole usages: ${allRoles.length}`);
const roleCounts = {};
allRoles.forEach(r => roleCounts[r.role] = (roleCounts[r.role] || 0) + 1);
Object.keys(roleCounts).sort().forEach(r => {
  console.log(`  • ${r.padEnd(14)}: ${roleCounts[r]}`);
});

console.log(`\nInvalid React Native roles count: ${invalidRnRoles.length}`);
if (invalidRnRoles.length > 0) {
  invalidRnRoles.forEach(r => console.log(`  FAIL: ${r.file}:${r.line} has invalid role "${r.role}"`));
} else {
  console.log('  PASS: 0 invalid roles. All roles match standard React Native documented roles.');
}

console.log(`Forbidden project roles ("summary", "note", "status") count: ${forbiddenProjectRoles.length}`);
if (forbiddenProjectRoles.length > 0) {
  forbiddenProjectRoles.forEach(r => console.log(`  FAIL: ${r.file}:${r.line} uses forbidden role "${r.role}"`));
} else {
  console.log('  PASS: 0 forbidden roles. No instances of "summary", "note", or "status" as accessibilityRole.');
}

console.log('\n--- 2. INTERACTIVE CONTROLS (Pressable / Touchable) AUDIT ---');
console.log(`Total native interactive elements (<Pressable>): ${pressables.length}`);
let interactivePass = true;
pressables.forEach(p => {
  const missing = [];
  if (!p.role) missing.push('accessibilityRole');
  if (!p.hasLabel) missing.push('accessibilityLabel');
  console.log(`  • ${p.file}:${p.line} <${p.element}> role="${p.role || 'NONE'}" label=${p.hasLabel ? 'YES' : 'MISSING'} state=${p.hasState ? 'YES' : 'N/A'} hitSlop=${p.hasHitSlop ? 'YES' : 'NONE'}`);
  if (missing.length > 0) {
    interactivePass = false;
  }
});
console.log(`Interactive controls check: ${interactivePass ? 'PASS (100% have valid accessibilityRole and accessibilityLabel)' : 'FAIL'}`);

console.log('\n--- 3. SPECIFIC CONTROLS VERIFICATION ---');
const mapMarkers = pressables.filter(p => p.file.includes('CityMap.js'));
console.log(`Map City Markers in CityMap.js: ${mapMarkers.length}`);
mapMarkers.forEach(m => {
  console.log(`  • Line ${m.line}: role="${m.role}", hasLabel=${m.hasLabel}, hasState=${m.hasState}, hasHitSlop=${m.hasHitSlop}`);
});

const cityGridItems = pressables.filter(p => p.file.includes('CityMapCard.js') && p.line >= 330 && p.line <= 360);
console.log(`City Grid Items in CityMapCard.js: ${cityGridItems.length}`);
cityGridItems.forEach(g => {
  console.log(`  • Line ${g.line}: role="${g.role}", hasLabel=${g.hasLabel}, hasState=${g.hasState}`);
});

console.log('\n--- 4. DYNAMIC UPDATE LIVE REGION AUDIT ---');
console.log(`Live regions detected: ${liveRegions.length}`);
liveRegions.forEach(lr => {
  console.log(`  • ${lr.file}:${lr.line} -> accessibilityLiveRegion="${lr.value}"`);
});

console.log('\n--- 5. TOUCH TARGET / HITSLOP AUDIT ---');
console.log(`hitSlop protections declared: ${hitSlops.length}`);
hitSlops.forEach(h => {
  console.log(`  • ${h.file}:${h.line}`);
});

console.log('\n--- 6. REMEDIATED TEXT CONTRAST AUDIT ---');
console.log('Curated WCAG AA high-contrast text color occurrences:');
Object.keys(contrastMatches).forEach(col => {
  const data = contrastMatches[col];
  console.log(`  • ${col}: ${data.count} usages across ${data.files.size} files`);
});
console.log('Specifically #486581 (readable secondary text remediation):');
console.log(`  ${contrastMatches['#486581'].count} occurrences across files:`, Array.from(contrastMatches['#486581'].files));
