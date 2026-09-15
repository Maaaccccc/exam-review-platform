import { API } from './api.js';
import { store } from './store.js';
import { Components } from './components.js';

let currentMode = 'BROWSE';
let selectedTopicNode = null;

document.addEventListener('DOMContentLoaded', async () => {
  initGlobalControls();

  store.subscribe((state, eventKey) => {
    if (eventKey === 'ANSWER_SELECTED' && currentMode === 'QUIZ') {
      updateQuizSelectionDOM();
    } else if (eventKey === 'MARK_TOGGLED' && currentMode === 'QUIZ') {
      updateQuizMarkDOM();
    } else {
      renderApp();
    }
  });

  try {
    const topics = await API.getTopics();
    store.setTopics(topics);
    navigatePath('');
  } catch (err) {
    showErrorState('Failed to connect to backend server. Make sure the Node server is running.');
  }
});

function initGlobalControls() {
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => store.toggleTheme());
  }
}

function navigatePath(pathString) {
  const segments = pathString ? pathString.split('/').filter(Boolean) : [];
  store.setBreadcrumbPath(segments);

  if (segments.length === 0) {
    currentMode = 'BROWSE';
    renderApp();
    return;
  }

  let currentChildren = store.topics;
  let matchedNode = null;

  for (const seg of segments) {
    matchedNode = currentChildren.find(child => child.name === seg);
    if (matchedNode) {
      currentChildren = matchedNode.children || [];
    } else {
      break;
    }
  }

  if (matchedNode) {
    selectedTopicNode = matchedNode;
    // IF node has subfolders (children), stay in BROWSE mode so user can pick subfolders
    // ONLY enter CONFIG (Quiz Setup) mode if it is a leaf subfolder (no children)
    if (matchedNode.children && matchedNode.children.length > 0) {
      currentMode = 'BROWSE';
    } else {
      currentMode = 'CONFIG';
    }
  } else {
    currentMode = 'BROWSE';
  }

  renderApp();
}

function renderApp() {
  const root = document.getElementById('view-root');
  if (!root) return;

  Components.renderBreadcrumbs(store.currentPath, (targetPath) => navigatePath(targetPath));

  switch (currentMode) {
    case 'BROWSE':
      renderBrowseView(root);
      break;
    case 'CONFIG':
      renderConfigView(root);
      break;
    case 'QUIZ':
      renderQuizView(root);
      break;
    case 'PRE_SUBMIT':
      renderPreSubmitView(root);
      break;
    case 'RESULTS':
      renderResultsView(root);
      break;
    case 'REVIEW_KEY':
      renderAnswerKeyView(root);
      break;
    default:
      renderBrowseView(root);
  }
}

function getCurrentSubnodes() {
  if (store.currentPath.length === 0) return store.topics;

  let currentChildren = store.topics;
  for (const seg of store.currentPath) {
    const found = currentChildren.find(child => child.name === seg);
    if (found) currentChildren = found.children || [];
  }
  return currentChildren;
}

function renderBrowseView(container) {
  const subnodes = getCurrentSubnodes();
  container.innerHTML = Components.renderTopicsGrid(subnodes);

  container.querySelectorAll('.subject-card').forEach(card => {
    card.addEventListener('click', () => {
      const path = card.getAttribute('data-path');
      navigatePath(path);
    });
  });
}

function renderConfigView(container) {
  if (!selectedTopicNode) return navigatePath('');

  container.innerHTML = Components.renderQuizConfig(selectedTopicNode, selectedTopicNode.count);

  let selectedLimit = 'all';
  let selectedOrder = 'random';

  const limitBtns = container.querySelectorAll('#limit-options .pill-btn');
  limitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      limitBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedLimit = btn.getAttribute('data-value');
    });
  });

  const orderBtns = container.querySelectorAll('#order-options .pill-btn');
  orderBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      orderBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedOrder = btn.getAttribute('data-value');
    });
  });

  const form = container.querySelector('#quiz-config-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    container.innerHTML = `
      <div class="loading-spinner-container">
        <div class="spinner"></div>
        <p>Preparing question bank...</p>
      </div>
    `;

    try {
      const questions = await API.getQuestions(selectedTopicNode.path, {
        limit: selectedLimit === 'all' ? null : selectedLimit,
        order: selectedOrder
      });

      if (questions.length === 0) {
        showErrorState('No valid questions found in this topic folder.');
        return;
      }

      store.startQuiz(questions, { limit: selectedLimit, order: selectedOrder });
      currentMode = 'QUIZ';
      renderApp();
    } catch (err) {
      showErrorState('Failed to load questions from backend.');
    }
  });
}

function renderQuizView(container) {
  container.innerHTML = Components.renderQuizView(store);

  container.querySelectorAll('.choice-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const choice = opt.getAttribute('data-choice');
      store.setAnswer(store.currentQuestion.id, choice);
    });
  });

  // Listener for Reveal Answer Button
  container.querySelector('#reveal-answer-btn')?.addEventListener('click', (e) => {
    const currentQ = store.currentQuestion;
    if (!currentQ) return;

    // Highlight the correct answer choice
    container.querySelectorAll('#choices-list .choice-option').forEach(opt => {
      if (opt.getAttribute('data-choice') === currentQ.correct_answer) {
        opt.style.backgroundColor = '#ecfdf5';
        opt.style.borderColor = '#10b981';
        opt.style.color = '#065f46';
        opt.style.fontWeight = '600';

        const badge = opt.querySelector('.correct-badge');
        if (badge) badge.style.display = 'inline-block';
      }
    });

    // Reveal explanation container if present
    const expBox = container.querySelector('#explanation-box');
    if (expBox) expBox.style.display = 'block';

    // Hide the toggle button after revelation
    e.currentTarget.style.display = 'none';
  });

  container.querySelector('#prev-btn')?.addEventListener('click', () => {
    store.goToQuestion(store.currentQuestionIndex - 1);
  });

  container.querySelector('#next-btn')?.addEventListener('click', () => {
    store.goToQuestion(store.currentQuestionIndex + 1);
  });

  container.querySelector('#mark-btn')?.addEventListener('click', () => {
    store.toggleMarkQuestion(store.currentQuestion.id);
  });

  const submitBtn = container.querySelector('#review-submit-btn') || container.querySelector('#sidebar-submit-btn');
  submitBtn?.addEventListener('click', () => {
    currentMode = 'PRE_SUBMIT';
    renderApp();
  });

  bindGridClicks(container.querySelector('#sidebar-question-grid'));
}

function updateQuizSelectionDOM() {
  const currentQ = store.currentQuestion;
  const selectedAnswer = store.userAnswers[currentQ.id];

  const choices = document.querySelectorAll('#choices-list .choice-option');
  choices.forEach(opt => {
    if (opt.getAttribute('data-choice') === selectedAnswer) {
      opt.classList.add('selected');
    } else {
      opt.classList.remove('selected');
    }
  });

  const btn = document.querySelector(`.grid-num-btn[data-index="${store.currentQuestionIndex}"]`);
  if (btn) btn.classList.add('answered');
}

function updateQuizMarkDOM() {
  const currentQ = store.currentQuestion;
  const isMarked = store.markedQuestions.has(currentQ.id);

  const card = document.getElementById('quiz-main-card');
  const markBtn = document.getElementById('mark-btn');
  const gridBtn = document.querySelector(`.grid-num-btn[data-index="${store.currentQuestionIndex}"]`);

  if (isMarked) {
    card?.classList.add('marked-card');
    if (markBtn) {
      markBtn.innerText = '✓ Marked (Green)';
      markBtn.style.borderColor = 'var(--marked-border-color)';
      markBtn.style.color = 'var(--marked-border-color)';
      markBtn.style.fontWeight = '700';
    }
    gridBtn?.classList.add('marked');
  } else {
    card?.classList.remove('marked-card');
    if (markBtn) {
      markBtn.innerText = 'Mark for Review';
      markBtn.style.borderColor = '';
      markBtn.style.color = '';
      markBtn.style.fontWeight = '';
    }
    gridBtn?.classList.remove('marked');
  }
}

/**
 * Grid navigation click handler: Jump to question and ensure Quiz view is active
 */
function bindGridClicks(parentEl) {
  if (!parentEl) return;
  parentEl.querySelectorAll('.grid-num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      store.goToQuestion(idx);
      if (currentMode !== 'QUIZ') {
        currentMode = 'QUIZ';
        renderApp();
      }
    });
  });
}

function renderPreSubmitView(container) {
  container.innerHTML = Components.renderPreSubmitReview(store);
  bindGridClicks(container);

  container.querySelector('#back-to-quiz-btn')?.addEventListener('click', () => {
    currentMode = 'QUIZ';
    renderApp();
  });

  container.querySelector('#confirm-submit-btn')?.addEventListener('click', () => {
    store.submitExam();
    currentMode = 'RESULTS';
    renderApp();
  });
}

function renderResultsView(container) {
  container.innerHTML = Components.renderResults(store);

  container.querySelector('#review-answers-btn')?.addEventListener('click', () => {
    currentMode = 'REVIEW_KEY';
    renderApp();
  });

  container.querySelector('#retake-quiz-btn')?.addEventListener('click', () => {
    store.resetQuiz();
    currentMode = 'QUIZ';
    renderApp();
  });

  container.querySelector('#back-to-topics-btn')?.addEventListener('click', () => {
    navigatePath('');
  });
}

function renderAnswerKeyView(container) {
  container.innerHTML = Components.renderAnswerReviewList(store);
  container.querySelector('#exit-review-btn')?.addEventListener('click', () => {
    currentMode = 'RESULTS';
    renderApp();
  });
}

function showErrorState(msg) {
  const root = document.getElementById('view-root');
  if (root) {
    root.innerHTML = `
      <div class="empty-state" style="padding: 3rem; text-align: center;">
        <h3 style="color: var(--error-color); margin-bottom: 0.5rem;">Error Encountered</h3>
        <p>${msg}</p>
        <button id="error-retry-btn" class="btn btn-primary" style="margin-top: 1rem;">Return Home</button>
      </div>
    `;
    document.getElementById('error-retry-btn')?.addEventListener('click', () => navigatePath(''));
  }
}