import { store } from './store.js';

export const Components = {
  renderBreadcrumbs(pathArray, onNavigate) {
    const container = document.getElementById('breadcrumb-list');
    if (!container) return;

    let html = `<span class="breadcrumb-link" data-path="">Home</span>`;
    let accumulatedPath = '';

    pathArray.forEach((segment, idx) => {
      accumulatedPath += (accumulatedPath ? '/' : '') + segment;
      const isLast = idx === pathArray.length - 1;
      html += ` <span class="breadcrumb-separator">/</span> `;
      if (isLast) {
        html += `<span class="breadcrumb-current">${segment}</span>`;
      } else {
        html += `<span class="breadcrumb-link" data-path="${accumulatedPath}">${segment}</span>`;
      }
    });

    container.innerHTML = html;

    container.querySelectorAll('.breadcrumb-link').forEach(el => {
      el.addEventListener('click', () => {
        onNavigate(el.getAttribute('data-path'));
      });
    });
  },

  renderTopicsGrid(nodes) {
    if (!nodes || nodes.length === 0) {
      return `
        <div class="empty-state">
          <h3>No topics discovered</h3>
          <p>Please place question JSON files inside the <code>questions/</code> folder.</p>
        </div>
      `;
    }

    const cardsHtml = nodes.map(node => {
      const hasChildren = node.children && node.children.length > 0;
      
      // If folder has subfolders and no direct questions, hide raw question count
      let subtitleHtml = '';
      if (hasChildren && node.directCount === 0) {
        subtitleHtml = `<p class="card-count" style="color: var(--text-muted);">${node.children.length} Topic Folder${node.children.length === 1 ? '' : 's'}</p>`;
      } else {
        subtitleHtml = `<p class="card-count">${node.count.toLocaleString()} Question${node.count === 1 ? '' : 's'}</p>`;
      }

      return `
        <div class="subject-card" data-path="${node.path}">
          <div>
            <h3 class="card-title">${node.name}</h3>
            ${subtitleHtml}
          </div>
          <div class="card-footer">
            <span>${hasChildren ? 'Open Folder' : 'Explore'}</span>
            <span aria-hidden="true">→</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <h2 class="view-title">Choose a Subject</h2>
      <p class="view-subtitle">Select a subject or subfolder question bank to begin reviewing</p>
      <div class="subjects-grid">
        ${cardsHtml}
      </div>
    `;
  },

  renderQuizConfig(node, totalQuestions) {
    return `
      <div class="config-card">
        <h2 class="view-title">${node.name}</h2>
        <p class="view-subtitle">${totalQuestions.toLocaleString()} Available Questions</p>
        
        <form id="quiz-config-form">
          <div class="form-group">
            <label class="form-label">Number of Questions</label>
            <div class="pill-group" id="limit-options">
              <button type="button" class="pill-btn active" data-value="all">All (${totalQuestions})</button>
              ${totalQuestions >= 10 ? '<button type="button" class="pill-btn" data-value="10">10</button>' : ''}
              ${totalQuestions >= 25 ? '<button type="button" class="pill-btn" data-value="25">25</button>' : ''}
              ${totalQuestions >= 50 ? '<button type="button" class="pill-btn" data-value="50">50</button>' : ''}
              ${totalQuestions >= 100 ? '<button type="button" class="pill-btn" data-value="100">100</button>' : ''}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Question Order</label>
            <div class="pill-group" id="order-options">
              <button type="button" class="pill-btn" data-value="sequential">Sequential</button>
              <button type="button" class="pill-btn active" data-value="random">Random</button>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
            Start Quiz
          </button>
        </form>
      </div>
    `;
  },

  renderQuizView(storeState) {
    const q = storeState.currentQuestion;
    const total = storeState.activeQuestionBank.length;
    const currentIdx = storeState.currentQuestionIndex;
    const progressPct = ((currentIdx + 1) / total) * 100;

    const isMarked = storeState.markedQuestions.has(q.id);
    const selectedAnswer = storeState.userAnswers[q.id];

    const choicesHtml = q.choices.map((choice) => {
      const isSelected = selectedAnswer === choice;
      return `
        <div class="choice-option ${isSelected ? 'selected' : ''}" data-choice="${choice}">
          <div class="choice-indicator"></div>
          <div>${choice}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="quiz-layout">
        <div class="quiz-main-card ${isMarked ? 'marked-card' : ''}" id="quiz-main-card">
          <div class="quiz-meta">
            <span>Question ${currentIdx + 1} of ${total}</span>
            <button id="mark-btn" class="btn btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.85rem; ${isMarked ? 'border-color: var(--marked-border-color); color: var(--marked-border-color); font-weight:700;' : ''}">
              ${isMarked ? '✓ Marked (Green)' : 'Mark for Review'}
            </button>
          </div>

          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${progressPct}%"></div>
          </div>

          <div class="question-text">${q.question}</div>

          <div class="choices-list" id="choices-list">
            ${choicesHtml}
          </div>

          <div class="quiz-actions">
            <div>
              <button id="prev-btn" class="btn btn-secondary" ${currentIdx === 0 ? 'disabled' : ''}>Previous</button>
              <button id="next-btn" class="btn btn-secondary" ${currentIdx === total - 1 ? 'disabled' : ''}>Next</button>
            </div>

            ${currentIdx === total - 1 ? `
              <button id="review-submit-btn" class="btn btn-primary">Review & Submit</button>
            ` : ''}
          </div>
        </div>

        <div class="quiz-sidebar">
          <h3>Questions</h3>
          <div class="drawer-legend" style="margin-top: 0.5rem; flex-wrap: wrap;">
            <span class="legend-item"><span class="badge answered">✓</span> Answered</span>
            <span class="legend-item"><span class="badge marked" style="border: 2px solid var(--marked-border-color); background: transparent;"></span> Marked</span>
          </div>
          <div class="question-grid" id="sidebar-question-grid">
            ${Components.renderGridButtons(storeState)}
          </div>
          <button id="sidebar-submit-btn" class="btn btn-primary" style="width: 100%; margin-top: 1.5rem;">
            Review Answers
          </button>
        </div>
      </div>
    `;
  },

  renderGridButtons(storeState) {
    return storeState.activeQuestionBank.map((q, idx) => {
      const isCurrent = idx === storeState.currentQuestionIndex;
      const isAnswered = Boolean(storeState.userAnswers[q.id]);
      const isMarked = storeState.markedQuestions.has(q.id);

      let classes = 'grid-num-btn';
      if (isCurrent) classes += ' active';
      if (isAnswered) classes += ' answered';
      if (isMarked) classes += ' marked';

      return `<button class="${classes}" data-index="${idx}">${idx + 1}</button>`;
    }).join('');
  },

  renderPreSubmitReview(storeState) {
    const { total, unanswered } = storeState.stats;
    const answered = total - unanswered;
    const marked = storeState.markedQuestions.size;

    return `
      <div class="config-card" style="max-width: 750px;">
        <h2 class="view-title">Review Your Answers</h2>
        <p class="view-subtitle">Verify your responses prior to finalizing submission</p>

        <div class="results-stats-grid" style="margin: 1.5rem 0;">
          <div class="stat-box">
            <div class="stat-val">${answered}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">Answered</div>
          </div>
          <div class="stat-box unanswered">
            <div class="stat-val">${unanswered}</div>
            <div style="font-size: 0.85rem; color: var(--warning-color);">Unanswered</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">${marked}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">Marked</div>
          </div>
        </div>

        ${unanswered > 0 ? `
          <div style="background-color: var(--warning-bg); border-left: 4px solid var(--warning-color); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1.5rem; text-align: left;">
            <strong>Notice:</strong> You still have <strong>${unanswered}</strong> unanswered question${unanswered === 1 ? '' : 's'}. You may go back and answer them or proceed to submit.
          </div>
        ` : ''}

        <div class="question-grid" style="margin-bottom: 2rem;">
          ${Components.renderGridButtons(storeState)}
        </div>

        <div style="display: flex; gap: 1rem; justify-content: space-between;">
          <button id="back-to-quiz-btn" class="btn btn-secondary">Back to Questions</button>
          <button id="confirm-submit-btn" class="btn btn-primary">Submit Exam</button>
        </div>
      </div>
    `;
  },

  renderResults(storeState) {
    const { correct, incorrect, unanswered, total, scorePercentage } = storeState.stats;

    return `
      <div class="results-card">
        <h2 class="view-title">Quiz Complete</h2>
        
        <div class="score-badge">${scorePercentage}%</div>
        <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-secondary);">
          ${correct} / ${total}
        </div>

        <div class="results-stats-grid">
          <div class="stat-box correct">
            <div class="stat-val">${correct}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">Correct</div>
          </div>
          <div class="stat-box incorrect">
            <div class="stat-val">${incorrect}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">Incorrect</div>
          </div>
          <div class="stat-box unanswered">
            <div class="stat-val">${unanswered}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">Unanswered</div>
          </div>
        </div>

        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-top: 2rem;">
          <button id="review-answers-btn" class="btn btn-outline">Review Answers</button>
          <button id="retake-quiz-btn" class="btn btn-primary">Take Quiz Again</button>
          <button id="back-to-topics-btn" class="btn btn-secondary">Back to Topics</button>
        </div>
      </div>
    `;
  },

  renderAnswerReviewList(storeState) {
    const itemsHtml = storeState.activeQuestionBank.map((q, idx) => {
      const userChoice = storeState.userAnswers[q.id];
      const normUser = userChoice ? userChoice.trim().toUpperCase() : '';
      const normCorrect = q.correct_answer.trim().toUpperCase();

      let isCorrect = (normUser === normCorrect);
      if (!isCorrect && normUser) {
        const prefixMatch = normUser.match(/^([A-Za-z0-9]+)[\.\)]/);
        if (prefixMatch && prefixMatch[1].toUpperCase() === normCorrect) {
          isCorrect = true;
        }
      }

      return `
        <div class="quiz-main-card" style="margin-bottom: 1.5rem; text-align: left;">
          <div class="quiz-meta">
            <span>Question ${idx + 1}</span>
            <span style="color: ${isCorrect ? 'var(--success-color)' : 'var(--error-color)'}; font-weight: 700;">
              ${isCorrect ? '✓ Correct' : '✗ Incorrect'}
            </span>
          </div>

          <div class="question-text" style="font-size: 1.05rem; margin-bottom: 1rem;">${q.question}</div>

          <div class="choices-list" style="margin-bottom: 1rem;">
            ${q.choices.map(choice => {
              const choiceSelected = userChoice === choice;
              let style = '';
              if (choiceSelected && isCorrect) style = 'background-color: var(--success-bg); border-color: var(--success-border);';
              else if (choiceSelected && !isCorrect) style = 'background-color: var(--error-bg); border-color: var(--error-border);';
              
              return `
                <div class="choice-option" style="${style} cursor: default;">
                  <div>${choice}</div>
                </div>
              `;
            }).join('')}
          </div>

          <div style="font-size: 0.9rem; margin-top: 0.5rem; color: var(--text-secondary);">
            <div><strong>Your Answer:</strong> ${userChoice || '<em>Unanswered</em>'}</div>
            <div><strong>Correct Answer:</strong> ${q.correct_answer}</div>
          </div>

          ${q.explanation ? `
            <div class="explanation-box">
              <strong>Explanation:</strong> ${q.explanation}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    return `
      <div style="max-width: 800px; margin: 0 auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h2 class="view-title">Answer Key & Review</h2>
          <button id="exit-review-btn" class="btn btn-secondary">Done</button>
        </div>
        ${itemsHtml}
      </div>
    `;
  }
};