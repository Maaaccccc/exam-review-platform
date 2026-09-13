const fs = require('fs');
const path = require('path');
const { validateQuestion } = require('./validator');

class QuestionScanner {
  constructor(baseDir) {
    this.baseDir = path.resolve(baseDir);
  }

  getHierarchy(dirPath = this.baseDir, relativePath = '') {
    if (!fs.existsSync(this.baseDir)) {
      console.error(`[Scanner Error] Questions directory not found at: ${this.baseDir}`);
      return { name: 'Root', path: '', count: 0, directCount: 0, children: [] };
    }

    const name = path.basename(dirPath);
    const children = [];

    let items = [];
    try {
      items = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (err) {
      return { name, path: relativePath, count: 0, directCount: 0, children: [] };
    }

    // Direct questions sitting right in this folder
    const directQuestions = this.getDirectQuestionsInDir(dirPath, relativePath);
    const directCount = directQuestions.length;

    // Process Subdirectories
    const subdirs = items.filter(item => item.isDirectory());
    for (const subdir of subdirs) {
      const subRelPath = relativePath ? `${relativePath}/${subdir.name}` : subdir.name;
      const childNode = this.getHierarchy(path.join(dirPath, subdir.name), subRelPath);
      if (childNode.count > 0 || childNode.children.length > 0 || childNode.directCount > 0) {
        children.push(childNode);
      }
    }

    return {
      name: relativePath === '' ? 'Root' : name,
      path: relativePath,
      count: directCount,
      directCount: directCount,
      children: children.sort((a, b) => a.name.localeCompare(b.name))
    };
  }

  /**
   * Strictly load ONLY JSON files residing directly in the requested folder.
   * Does NOT load questions from subdirectories.
   */
  getQuestionsForPath(targetRelPath = '') {
    const fullPath = path.join(this.baseDir, targetRelPath);
    if (!fs.existsSync(fullPath)) return [];

    // ONLY fetch direct JSONs in target folder (Strict Separation)
    const questions = this.getDirectQuestionsInDir(fullPath, targetRelPath);

    return questions.map((q, index) => ({
      ...q,
      id: `${targetRelPath.replace(/[\/\\]/g, '_')}_q_${index + 1}`,
      quizIndex: index + 1
    }));
  }

  getDirectQuestionsInDir(dirPath, relativePath) {
    const questions = [];
    let items = [];
    try {
      items = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (e) {
      return [];
    }

    const jsonFiles = items.filter(item => item.isFile() && item.name.endsWith('.json'));
    for (const file of jsonFiles) {
      const filePath = path.join(dirPath, file.name);
      const fileContext = `${relativePath}/${file.name}`;
      try {
        const rawData = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(rawData);
        if (Array.isArray(parsed)) {
          parsed.forEach((q, idx) => {
            const valid = validateQuestion(q, fileContext, idx);
            if (valid) questions.push(valid);
          });
        }
      } catch (err) {
        console.error(`[Scanner Error] Malformed JSON in ${fileContext}: ${err.message}`);
      }
    }
    return questions;
  }
}

module.exports = QuestionScanner;