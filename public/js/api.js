/**
 * API Service for interacting with backend endpoints
 */
export const API = {
  /**
   * Fetches full dynamic topic hierarchy tree
   */
  async getTopics() {
    try {
      const response = await fetch('/api/topics');
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }
      const result = await response.json();
      return result.data || [];
    } catch (err) {
      console.error('[API Error] Fetch topics failed:', err);
      throw err;
    }
  },

  /**
   * Fetches questions for a target subtopic path with optional count limit and ordering
   */
  async getQuestions(topicPath, options = {}) {
    try {
      const { limit, order = 'sequential' } = options;
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit);
      if (order) params.append('order', order);

      const encodedPath = topicPath.split('/').map(encodeURIComponent).join('/');
      const url = `/api/questions/${encodedPath}?${params.toString()}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load questions (HTTP ${response.status})`);
      }
      const result = await response.json();
      return result.questions || [];
    } catch (err) {
      console.error(`[API Error] Fetch questions failed for path "${topicPath}":`, err);
      throw err;
    }
  }
};