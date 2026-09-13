class StateStore {
  constructor() {
    this.topics = [];
    this.currentPath = [];
    this.activeQuestionBank = [];
    this.currentQuestionIndex = 0;
    this.userAnswers = {};
    this.markedQuestions = new Set();
    this.examSubmitted = false;
    this.config = {
      limit: 'all',
      order: 'random'
    };
    this.listeners = [];

    // Default to Dark Mode
    this.theme = localStorage.getItem('theme_pref') || 'dark';
    this.applyTheme(this.theme);
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(eventKey = null) {
    this.listeners.forEach(fn => fn(this, eventKey));
  }

  setTheme(theme) {
    this.theme = theme;
    localStorage.setItem('theme_pref', theme);
    this.applyTheme(theme);
    this.notify('THEME_CHANGE');
  }

  applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }

  toggleTheme() {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
  }

  setTopics(topics) {
    this.topics = topics;
    this.notify('TOPICS_LOADED');
  }

  setBreadcrumbPath(pathArray) {
    this.currentPath = pathArray;
    this.notify('NAVIGATION');
  }

  startQuiz(questions, config) {
    this.activeQuestionBank = questions;
    this.config = config;
    this.currentQuestionIndex = 0;
    this.userAnswers = {};
    this.markedQuestions = new Set();
    this.examSubmitted = false;
    this.notify('QUIZ_START');
  }

  setAnswer(questionId, choice) {
    this.userAnswers[questionId] = choice;
    this.notify('ANSWER_SELECTED');
  }

  toggleMarkQuestion(questionId) {
    if (this.markedQuestions.has(questionId)) {
      this.markedQuestions.delete(questionId);
    } else {
      this.markedQuestions.add(questionId);
    }
    this.notify('MARK_TOGGLED');
  }

  goToQuestion(index) {
    if (index >= 0 && index < this.activeQuestionBank.length) {
      this.currentQuestionIndex = index;
      this.notify('QUESTION_CHANGED');
    }
  }

  submitExam() {
    this.examSubmitted = true;
    this.notify('SUBMIT');
  }

  resetQuiz() {
    this.userAnswers = {};
    this.markedQuestions = new Set();
    this.currentQuestionIndex = 0;
    this.examSubmitted = false;
    this.notify('QUIZ_RESET');
  }

  get currentQuestion() {
    return this.activeQuestionBank[this.currentQuestionIndex] || null;
  }

  get stats() {
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    this.activeQuestionBank.forEach(q => {
      const userChoice = this.userAnswers[q.id];
      if (!userChoice) {
        unanswered++;
        return;
      }

      const normUser = userChoice.trim().toUpperCase();
      const normCorrect = q.correct_answer.trim().toUpperCase();

      let isCorrect = (normUser === normCorrect);
      if (!isCorrect) {
        const prefixMatch = normUser.match(/^([A-Za-z0-9]+)[\.\)]/);
        if (prefixMatch && prefixMatch[1].toUpperCase() === normCorrect) {
          isCorrect = true;
        }
      }

      if (isCorrect) correct++;
      else incorrect++;
    });

    const total = this.activeQuestionBank.length;
    const scorePercentage = total > 0 ? Math.round((correct / total) * 100) : 0;

    return { correct, incorrect, unanswered, total, scorePercentage };
  }
}

export const store = new StateStore();