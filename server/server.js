const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const QuestionScanner = require('./scanner');

const app = express();
const PORT = process.env.PORT || 3000;
const QUESTIONS_DIR = process.env.QUESTIONS_DIR || path.join(__dirname, '../questions');

const scanner = new QuestionScanner(QUESTIONS_DIR);

app.use(cors());
app.use(express.json());

// Serve Static Frontend
app.use(express.static(path.join(__dirname, '../public')));

/**
 * GET /api/topics
 * Discovers and returns the full dynamic folder tree and total counts.
 */
app.get('/api/topics', (req, res) => {
  try {
    const hierarchy = scanner.getHierarchy();
    res.json({
      success: true,
      data: hierarchy.children || []
    });
  } catch (err) {
    console.error('[API Error] Failed to discover topics:', err);
    res.status(500).json({ success: false, error: 'Failed to scan question directory hierarchy.' });
  }
});

/**
 * GET /api/questions/*
 * Recursively fetches all validated questions for the requested path.
 * Supports query parameter filters:
 *  - limit: number of questions requested (randomly sampled if specified)
 *  - order: 'random' | 'sequential'
 */
app.get('/api/questions/*', (req, res) => {
  try {
    const topicPath = req.params[0] ? req.params[0].replace(/\/$/, '') : '';
    let questions = scanner.getQuestionsForPath(topicPath);

    if (!questions || questions.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No valid questions found for path: "${topicPath}"`
      });
    }

    const { limit, order } = req.query;

    // Apply Randomization if requested
    if (order === 'random') {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    // Apply Limit constraint if requested
    if (limit && !isNaN(limit)) {
      const parsedLimit = parseInt(limit, 10);
      if (parsedLimit > 0 && parsedLimit < questions.length) {
        questions = questions.slice(0, parsedLimit);
      }
    }

    // Re-index output for clean quiz display sequencing
    const finalizedQuestions = questions.map((q, idx) => ({
      ...q,
      quizIndex: idx + 1
    }));

    res.json({
      success: true,
      path: topicPath,
      totalAvailable: questions.length,
      count: finalizedQuestions.length,
      questions: finalizedQuestions
    });
  } catch (err) {
    console.error(`[API Error] Failed to retrieve questions for ${req.params[0]}:`, err);
    res.status(500).json({ success: false, error: 'Internal server error while fetching questions.' });
  }
});

// Fallback to index.html for SPA single-page routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Exam/Review Platform Server Active`);
  console.log(` Port: http://localhost:${PORT}`);
  console.log(` Questions Dir: ${path.resolve(QUESTIONS_DIR)}`);
  console.log(`==================================================`);
});