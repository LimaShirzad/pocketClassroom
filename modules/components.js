import { Utilities } from './utils.js';

export class ComponentRenderer {
    constructor() {
        this.utils = new Utilities();
    }

    renderCapsuleCard(capsule, app) {
        const progress = app.storage.getProgress(capsule.id);
        const capsuleFull = app.storage.getCapsule(capsule.id);
        
        const notesCount = capsuleFull.notes ? capsuleFull.notes.length : 0;
        const flashcardsCount = capsuleFull.flashcards ? capsuleFull.flashcards.length : 0;
        const quizCount = capsuleFull.quiz ? capsuleFull.quiz.length : 0;
        
        const knownCount = progress.knownFlashcards.length;
        const totalFlashcards = flashcardsCount;
        const flashcardProgress = totalFlashcards > 0 ? (knownCount / totalFlashcards) * 100 : 0;

        return `
            <div class="col-md-6 col-lg-4">
                <div class="card capsule-card h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title">${this.utils.escapeHtml(capsule.title)}</h5>
                            <span class="badge bg-${this.getLevelColor(capsule.level)}">
                                ${capsule.level}
                            </span>
                        </div>
                        
                        <div class="mb-3">
                            <span class="badge bg-secondary">${capsule.subject || 'General'}</span>
                            <small class="text-muted d-block mt-1">
                                Updated ${this.utils.timeAgo(capsule.updatedAt)}
                            </small>
                        </div>

                        <!-- Content Stats -->
                        <div class="mb-3">
                            <small class="text-muted d-block">
                                <i class="bi bi-journal-text"></i> ${notesCount} notes
                            </small>
                            <small class="text-muted d-block">
                                <i class="bi bi-card-checklist"></i> ${flashcardsCount} flashcards
                            </small>
                            <small class="text-muted d-block">
                                <i class="bi bi-question-circle"></i> ${quizCount} questions
                            </small>
                        </div>

                        <!-- Progress -->
                        <div class="mb-3">
                            <small class="text-muted">Quiz Best: ${progress.bestScore.toFixed(1)}%</small>
                            <div class="progress mb-2" style="height: 6px;">
                                <div class="progress-bar bg-success" style="width: ${progress.bestScore}%"></div>
                            </div>
                            
                            <small class="text-muted">Flashcards: ${knownCount}/${totalFlashcards} known</small>
                            <div class="progress" style="height: 6px;">
                                <div class="progress-bar bg-info" style="width: ${flashcardProgress}%"></div>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="capsule-actions d-flex gap-2 flex-wrap">
                            <button class="btn btn-sm btn-outline-primary" 
                                    onclick="app.selectLearnCapsule('${capsule.id}'); app.switchView('learn')">
                                <i class="bi bi-mortarboard"></i> Learn
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" 
                                    onclick="app.editCapsule('${capsule.id}')">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-success" 
                                    onclick="app.exportCapsule('${capsule.id}')">
                                <i class="bi bi-download"></i> Export
                            </button>
                            <button class="btn btn-sm btn-outline-danger" 
                                    onclick="app.deleteCapsule('${capsule.id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getLevelColor(level) {
        switch(level) {
            case 'Beginner': return 'success';
            case 'Intermediate': return 'warning';
            case 'Advanced': return 'danger';
            default: return 'secondary';
        }
    }

    addFlashcardRow() {
        const container = document.getElementById('flashcards-container');
        const rowCount = container.querySelectorAll('.flashcard-row').length;
        
        const row = document.createElement('div');
        row.className = 'flashcard-row mb-3';
        row.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <div class="row g-2">
                        <div class="col-md-5">
                            <input type="text" class="form-control" placeholder="Front of card" 
                                   oninput="app.components.updateValidationStatus()">
                        </div>
                        <div class="col-md-5">
                            <input type="text" class="form-control" placeholder="Back of card" 
                                   oninput="app.components.updateValidationStatus()">
                        </div>
                        <div class="col-md-2">
                            <button type="button" class="btn btn-outline-danger w-100" 
                                    onclick="this.closest('.flashcard-row').remove(); app.components.updateValidationStatus()">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(row);
        this.updateValidationStatus();
    }

    addQuizQuestion() {
        const container = document.getElementById('quiz-container');
        
        const question = document.createElement('div');
        question.className = 'quiz-question mb-4';
        question.innerHTML = `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">New Question</h6>
                    <button type="button" class="btn btn-sm btn-outline-danger" 
                            onclick="this.closest('.quiz-question').remove(); app.components.updateValidationStatus()">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <label class="form-label">Question</label>
                        <input type="text" class="form-control" placeholder="Enter your question" 
                               oninput="app.components.updateValidationStatus()">
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Choices</label>
                        ${['A', 'B', 'C', 'D'].map((letter, index) => `
                            <div class="input-group mb-2">
                                <span class="input-group-text">${letter}</span>
                                <input type="text" class="form-control" placeholder="Choice ${letter}" 
                                       oninput="app.components.updateValidationStatus()">
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Correct Answer</label>
                        <select class="form-select" onchange="app.components.updateValidationStatus()">
                            <option value="0">A</option>
                            <option value="1">B</option>
                            <option value="2">C</option>
                            <option value="3">D</option>
                        </select>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Explanation (Optional)</label>
                        <textarea class="form-control" rows="2" placeholder="Explain why this is correct" 
                                  oninput="app.components.updateValidationStatus()"></textarea>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(question);
        this.updateValidationStatus();
    }

    addNoteField() {
        const container = document.getElementById('notes-container');
        const textarea = container.querySelector('textarea');
        
        if (textarea) {
            textarea.rows += 2;
        }
        this.updateValidationStatus();
    }

    collectCapsuleData() {
        // Meta data
        const meta = {
            title: document.getElementById('capsuleTitle').value.trim(),
            subject: document.getElementById('capsuleSubject').value.trim(),
            level: document.getElementById('capsuleLevel').value,
            description: document.getElementById('capsuleDescription').value.trim()
        };

        // Notes
        const notesText = document.querySelector('#notes-container textarea').value.trim();
        const notes = notesText ? notesText.split('\n').filter(line => line.trim()) : [];

        // Flashcards
        const flashcards = [];
        document.querySelectorAll('.flashcard-row').forEach(row => {
            const inputs = row.querySelectorAll('input');
            const front = inputs[0].value.trim();
            const back = inputs[1].value.trim();
            
            if (front || back) {
                flashcards.push({ front, back });
            }
        });

        // Quiz questions
        const quiz = [];
        document.querySelectorAll('.quiz-question').forEach(questionEl => {
            const questionInput = questionEl.querySelector('input[type="text"]');
            const choiceInputs = questionEl.querySelectorAll('.input-group input');
            const correctSelect = questionEl.querySelector('select');
            const explanationInput = questionEl.querySelector('textarea');
            
            const question = questionInput.value.trim();
            const choices = Array.from(choiceInputs).map(input => input.value.trim());
            const correctIndex = parseInt(correctSelect.value);
            const explanation = explanationInput.value.trim();
            
            if (question && choices.some(choice => choice)) {
                quiz.push({
                    question,
                    choices,
                    correctIndex,
                    explanation: explanation || undefined
                });
            }
        });

        return { meta, notes, flashcards, quiz };
    }

    loadCapsuleIntoForm(capsule) {
        // Meta data
        document.getElementById('capsuleTitle').value = capsule.meta.title || '';
        document.getElementById('capsuleSubject').value = capsule.meta.subject || '';
        document.getElementById('capsuleLevel').value = capsule.meta.level || 'Beginner';
        document.getElementById('capsuleDescription').value = capsule.meta.description || '';

        // Notes
        const notesContainer = document.getElementById('notes-container');
        notesContainer.innerHTML = `<textarea class="form-control mb-2" rows="6">${capsule.notes ? capsule.notes.join('\n') : ''}</textarea>`;

        // Flashcards
        const flashcardsContainer = document.getElementById('flashcards-container');
        flashcardsContainer.innerHTML = '';
        if (capsule.flashcards) {
            capsule.flashcards.forEach(card => {
                this.addFlashcardRow();
                const rows = flashcardsContainer.querySelectorAll('.flashcard-row');
                const lastRow = rows[rows.length - 1];
                const inputs = lastRow.querySelectorAll('input');
                inputs[0].value = card.front || '';
                inputs[1].value = card.back || '';
            });
        }

        // Quiz questions
        const quizContainer = document.getElementById('quiz-container');
        quizContainer.innerHTML = '';
        if (capsule.quiz) {
            capsule.quiz.forEach(q => {
                this.addQuizQuestion();
                const questions = quizContainer.querySelectorAll('.quiz-question');
                const lastQuestion = questions[questions.length - 1];
                
                lastQuestion.querySelector('input[type="text"]').value = q.question || '';
                
                const choiceInputs = lastQuestion.querySelectorAll('.input-group input');
                q.choices.forEach((choice, index) => {
                    if (choiceInputs[index]) {
                        choiceInputs[index].value = choice || '';
                    }
                });
                
                lastQuestion.querySelector('select').value = q.correctIndex || 0;
                lastQuestion.querySelector('textarea').value = q.explanation || '';
            });
        }

        this.updateValidationStatus();
    }

    updateValidationStatus() {
        const titleValid = document.getElementById('capsuleTitle').value.trim().length > 0;
        const hasNotes = document.querySelector('#notes-container textarea').value.trim().length > 0;
        const hasFlashcards = document.querySelectorAll('.flashcard-row').length > 0;
        const hasQuiz = document.querySelectorAll('.quiz-question').length > 0;
        const hasContent = hasNotes || hasFlashcards || hasQuiz;

        // Update validation icons
        document.getElementById('title-valid').className = 
            titleValid ? 'bi bi-check-circle-fill text-success me-2' : 'bi bi-x-circle-fill text-danger me-2';
        
        document.getElementById('content-valid').className = 
            hasContent ? 'bi bi-check-circle-fill text-success me-2' : 'bi bi-x-circle-fill text-danger me-2';

        // Update save button state
        const saveBtn = document.getElementById('saveCapsule');
        saveBtn.disabled = !(titleValid && hasContent);
    }
}

export class UIManager {
    showToast(message, type = 'info') {
        const toastEl = document.getElementById('liveToast');
        const toastBody = toastEl.querySelector('.toast-body');
        
        // Update toast styling based on type
        const headerIcon = toastEl.querySelector('.toast-header i');
        headerIcon.className = this.getToastIcon(type) + ' me-2';
        
        toastBody.textContent = message;
        
        // Show toast
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }

    getToastIcon(type) {
        switch(type) {
            case 'success': return 'bi bi-check-circle-fill text-success';
            case 'error': return 'bi bi-exclamation-circle-fill text-danger';
            case 'warning': return 'bi bi-exclamation-triangle-fill text-warning';
            default: return 'bi bi-info-circle-fill text-info';
        }
    }

    showModal(title, content, options = {}) {
        // Remove existing modal if any
        const existingModal = document.getElementById('dynamicModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'dynamicModal';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    <div class="modal-footer">
                        ${options.cancelText ? 
                            `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${options.cancelText}</button>` : ''}
                        <button type="button" class="btn btn-${options.confirmType || 'primary'}" id="modalConfirm">
                            ${options.confirmText || 'OK'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();

        return new Promise((resolve) => {
            modal.querySelector('#modalConfirm').addEventListener('click', () => {
                modalInstance.hide();
                resolve(true);
            });
            
            modal.addEventListener('hidden.bs.modal', () => {
                modal.remove();
                resolve(false);
            });
        });
    }
}