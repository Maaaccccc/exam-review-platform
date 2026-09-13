const fs = require('fs');
const path = require('path');
const QuestionScanner = require('../server/scanner');

const questionsDir = path.join(__dirname, '../questions');
const outputDir = path.join(__dirname, '../public/data');
const outputFile = path.join(outputDir, 'static-db.json');

console.log('[Build Static] Scanning questions folder...');
const scanner = new QuestionScanner(questionsDir);
const hierarchy = scanner.getHierarchy();

// Helper to collect all questions path by path
function getAllQuestionsMap(node, relPath = '') {
  let map = {};
  const currentQuestions = scanner.getQuestionsForPath(relPath);
  map[relPath] = currentQuestions;

  if (node.children) {
    for (const child of node.children) {
      const subPath = relPath ? `${relPath}/${child.name}` : child.name;
      const childMap = getAllQuestionsMap(child, subPath);
      map = { ...map, ...childMap };
    }
  }
  return map;
}

const questionsMap = getAllQuestionsMap(hierarchy);

const staticBundle = {
  topics: hierarchy.children || [],
  questionsMap: questionsMap
};

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputFile, JSON.stringify(staticBundle, null, 2), 'utf-8');
console.log(`[Build Static] Successfully generated static dataset at public/data/static-db.json`);