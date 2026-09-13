/**
 * Validates and normalizes raw question objects from JSON files.
 * Uses rawObj.number for error logging to ensure 1-based alignment with JSON files.
 */
function validateQuestion(rawObj, fileContext, arrayIndex) {
  if (!rawObj || typeof rawObj !== 'object') {
    return null;
  }

  // 1-based display number: preference given to rawObj.number, fallback to (arrayIndex + 1)
  const displayNum = rawObj.number !== undefined ? rawObj.number : (arrayIndex + 1);

  // 1. Resolve Question Text
  const questionText = rawObj.question || rawObj.q || rawObj.title || rawObj.Question;
  if (!questionText || typeof questionText !== 'string' || !questionText.trim()) {
    console.warn(`[Validator] Skipping Q#${displayNum} in ${fileContext}: Missing valid question text.`);
    return null;
  }

  // 2. Resolve Choices Array
  let choices = rawObj.choices || rawObj.options || rawObj.Choices || rawObj.Options;
  if (!Array.isArray(choices) || choices.length < 2) {
    console.warn(`[Validator] Skipping Q#${displayNum} in ${fileContext}: Needs at least 2 choices.`);
    return null;
  }

  choices = choices.map(c => String(c).trim()).filter(Boolean);
  if (choices.length < 2) return null;

  // 3. Extract Raw Correct Answer Key
  let rawCorrect = undefined;
  const keyMap = ['correct_answer', 'correctAnswer', 'answer', 'correct', 'ans', 'key', 'Correct_Answer'];
  for (const k of keyMap) {
    if (rawObj[k] !== undefined && rawObj[k] !== null) {
      rawCorrect = rawObj[k];
      break;
    }
  }

  if (rawCorrect === undefined) {
    const foundKey = Object.keys(rawObj).find(k => {
      const cleanKey = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      return ['correctanswer', 'answer', 'correct', 'ans', 'key'].includes(cleanKey);
    });
    if (foundKey) rawCorrect = rawObj[foundKey];
  }

  if (rawCorrect === undefined || rawCorrect === null || String(rawCorrect).trim() === '') {
    console.warn(`[Validator] Skipping Q#${displayNum} in ${fileContext}: Missing or empty correct_answer.`);
    return null;
  }

  let correctAnswerStr = String(rawCorrect).trim();
  let resolvedAnswer = null;

  // Strategy A: Direct exact match with a choice string
  if (choices.includes(correctAnswerStr)) {
    resolvedAnswer = correctAnswerStr;
  }

  // Strategy B: If answer string contains a question number prefix (e.g. "80. 10000 ohms" or "80 10000 ohms")
  if (!resolvedAnswer) {
    const cleanedAnswerStr = correctAnswerStr.replace(/^\d+[\.\)\s:-]+\s*/, '').trim();
    if (cleanedAnswerStr && choices.includes(cleanedAnswerStr)) {
      resolvedAnswer = cleanedAnswerStr;
    }
  }

  // Strategy C: Extract standalone target letter ("A", "B", "C", "D")
  if (!resolvedAnswer) {
    const letterMatch = correctAnswerStr.match(/(?:^|\b|\d+\s*)([A-Da-d])(?:\b|\.|\s*|$)/);
    if (letterMatch) {
      const letter = letterMatch[1].toUpperCase();
      const targetIdx = letter.charCodeAt(0) - 65;

      const prefixedChoice = choices.find(c => {
        const m = c.match(/^([A-Za-z])[\.\)\-\s]/);
        return m && m[1].toUpperCase() === letter;
      });

      if (prefixedChoice) {
        resolvedAnswer = prefixedChoice;
      } else if (choices[targetIdx]) {
        resolvedAnswer = choices[targetIdx];
      }
    }
  }

  // Strategy D: Numeric choice index (e.g. "1", "2", "3", "4")
  if (!resolvedAnswer && /^\d+$/.test(correctAnswerStr)) {
    const numIdx = parseInt(correctAnswerStr, 10) - 1;
    if (choices[numIdx]) {
      resolvedAnswer = choices[numIdx];
    }
  }

  // Strategy E: Text comparison ignoring choice prefixes
  if (!resolvedAnswer) {
    const normKey = correctAnswerStr.toLowerCase().replace(/^\d+[\.\)\s:-]+\s*/, '');
    const matchedChoice = choices.find(c => {
      const normChoice = c.replace(/^[A-Za-z][\.\)\-\s]+\s*/, '').toLowerCase().trim();
      return normChoice === normKey || c.toLowerCase().includes(normKey);
    });

    if (matchedChoice) {
      resolvedAnswer = matchedChoice;
    }
  }

  if (!resolvedAnswer) {
    console.warn(`[Validator] Skipping Q#${displayNum} in ${fileContext}: Could not match correct_answer "${correctAnswerStr}" to choices.`);
    return null;
  }

  return {
    question: String(questionText).trim(),
    choices: choices,
    correct_answer: resolvedAnswer,
    explanation: rawObj.explanation ? String(rawObj.explanation).trim() : ''
  };
}

module.exports = { validateQuestion };