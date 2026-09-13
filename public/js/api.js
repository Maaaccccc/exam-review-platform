let staticDataPromise = null;

async function loadStaticData() {
  if (!staticDataPromise) {
    staticDataPromise = fetch('./data/static-db.json').then(res => {
      if (!res.ok) throw new Error('Failed to load static database bundle.');
      return res.json();
    });
  }
  return staticDataPromise;
}

export const API = {
  async getTopics() {
    try {
      const res = await fetch('/api/topics');
      if (!res.ok) throw new Error('API server error');
      return await res.json();
    } catch (err) {
      // Static fallback for GitHub Pages
      console.warn('[API] Express backend not detected. Falling back to static data bundle...');
      const staticDb = await loadStaticData();
      return staticDb.topics;
    }
  },

  async getQuestions(topicPath = '', options = {}) {
    try {
      const query = new URLSearchParams(options).toString();
      const res = await fetch(`/api/questions/${topicPath}?${query}`);
      if (!res.ok) throw new Error('API server error');
      return await res.json();
    } catch (err) {
      // Static fallback for GitHub Pages
      const staticDb = await loadStaticData();
      let questions = staticDb.questionsMap[topicPath] || [];

      if (options.order === 'random') {
        questions = [...questions].sort(() => Math.random() - 0.5);
      }

      if (options.limit && options.limit !== 'all') {
        const limitNum = parseInt(options.limit, 10);
        if (!isNaN(limitNum)) {
          questions = questions.slice(0, limitNum);
        }
      }

      return questions;
    }
  }
};