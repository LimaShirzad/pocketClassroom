import { StorageManager } from './modules/storage.js';
import { UIManager, ComponentRenderer } from './modules/components.js';
import { Utilities } from './modules/utils.js';

class PocketClassroom {
    constructor() {
        this.storage = new StorageManager();
        this.ui = new UIManager();
        this.components = new ComponentRenderer();
        this.utils = new Utilities();
        
        this.currentCapsuleId = null;
        this.currentView = 'library';
        this.learnMode = {
            currentCapsule: null,
            flashcardIndex: 0,
            quizIndex: 0,
            quizScore: 0
        };

        this.init();
    }

    init() {
        this.initializeEventListeners();
        this.loadLibraryView();
        this.applyThemePreference();
    }

    initializeEventListeners() {
        // Navigation
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.getAttribute('data-view');
                this.switchView(view);
            });
        });

        // Library Actions
        document.getElementById('newCapsuleBtn').addEventListener('click', () => this.createNewCapsule());
        document.getElementById('createFirstCapsule').addEventListener('click', () => this.createNewCapsule());
        document.getElementById('importJsonBtn').addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile').addEventListener('change', (e) => this.importCapsule(e));

        // Author Actions
        document.getElementById('backToLibrary').addEventListener('click', () => this.switchView('library'));
        document.getElementById('saveCapsule').addEventListener('click', () => this.saveCurrentCapsule());
        
        // Learn Actions
        document.getElementById('backToLibraryFromLearn').addEventListener('click', () => this.switchView('library'));
        document.getElementById('exportCurrentCapsule').addEventListener('click', () => this.exportCurrentCapsule());
        document.getElementById('learnCapsuleSelect').addEventListener('change', (e) => this.selectLearnCapsule(e.target.value));

        // Dynamic Content
        document.getElementById('addFlashcard').addEventListener('click', () => this.components.addFlashcardRow());
        document.getElementById('addQuizQuestion').addEventListener('click', () => this.components.addQuizQuestion());
        document.getElementById('addNote').addEventListener('click', () => this.components.addNoteField());

        // Theme Toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Auto-save on input changes
        this.setupAutoSave();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    switchView(view) {
        // Hide all views
        document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
        
        // Show target view
        document.getElementById(`${view}-view`).style.display = 'block';
        
        // Update navigation
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        this.currentView = view;

        // Load appropriate data
        switch(view) {
            case 'library':
                this.loadLibraryView();
                break;
            case 'learn':
                this.loadLearnView();
                break;
            case 'author':
                if (!this.currentCapsuleId) {
                    this.createNewCapsule();
                }
                break;
        }
    }

    loadLibraryView() {
        const capsules = this.storage.getCapsulesIndex();
        const grid = document.getElementById('capsules-grid');
        const emptyState = document.getElementById('empty-library');

        if (capsules.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        grid.style.display = 'flex';
        
        grid.innerHTML = capsules.map(capsule => 
            this.components.renderCapsuleCard(capsule, this)
        ).join('');
    }

    loadLearnView() {
        const capsules = this.storage.getCapsulesIndex();
        const select = document.getElementById('learnCapsuleSelect');
        
        select.innerHTML = '<option value="">Choose a capsule...</option>' +
            capsules.map(capsule => 
                `<option value="${capsule.id}">${capsule.title}</option>`
            ).join('');
    }

    createNewCapsule() {
        this.currentCapsuleId = null;
        this.switchView('author');
        
        // Reset form
        document.getElementById('capsuleTitle').value = '';
        document.getElementById('capsuleSubject').value = '';
        document.getElementById('capsuleLevel').value = 'Beginner';
        document.getElementById('capsuleDescription').value = '';
        
        // Clear dynamic content
        document.getElementById('flashcards-container').innerHTML = '';
        document.getElementById('quiz-container').innerHTML = '';
        document.getElementById('notes-container').innerHTML = 
            '<textarea class="form-control mb-2" rows="4" placeholder="Enter your notes here (one per line)"></textarea>';
        
        this.components.updateValidationStatus();
    }

    async saveCurrentCapsule() {
        if (!this.validateCapsule()) {
            this.ui.showToast('Please fix validation errors before saving', 'error');
            return;
        }

        const capsuleData = this.components.collectCapsuleData();
        
        if (!this.currentCapsuleId) {
            this.currentCapsuleId = this.utils.generateId();
        }

        const capsule = {
            id: this.currentCapsuleId,
            meta: capsuleData.meta,
            notes: capsuleData.notes,
            flashcards: capsuleData.flashcards,
            quiz: capsuleData.quiz,
            updatedAt: new Date().toISOString(),
            schema: 'pocket-classroom/v1'
        };

        this.storage.saveCapsule(capsule);
        this.ui.showToast('Capsule saved successfully!', 'success');
        
        // Return to library view
        setTimeout(() => this.switchView('library'), 1000);
    }

    validateCapsule() {
        const title = document.getElementById('capsuleTitle').value.trim();
        const hasNotes = document.querySelector('#notes-container textarea').value.trim().length > 0;
        const hasFlashcards = document.querySelectorAll('.flashcard-row').length > 0;
        const hasQuiz = document.querySelectorAll('.quiz-question').length > 0;

        return title && (hasNotes || hasFlashcards || hasQuiz);
    }

    selectLearnCapsule(capsuleId) {
        if (!capsuleId) {
            document.getElementById('capsule-meta').style.display = 'none';
            return;
        }

        const capsule = this.storage.getCapsule(capsuleId);
        const progress = this.storage.getProgress(capsuleId);
        
        this.learnMode.currentCapsule = capsule;
        this.learnMode.flashcardIndex = 0;
        this.learnMode.quizIndex = 0;
        this.learnMode.quizScore = 0;

        // Update meta display
        document.getElementById('capsule-meta').style.display = 'block';
        document.getElementById('learn-title').textContent = capsule.meta.title;
        document.getElementById('learn-subject').textContent = capsule.meta.subject;
        document.getElementById('learn-level').textContent = capsule.meta.level;
        document.getElementById('learn-description').textContent = capsule.meta.description;

        // Update progress
        this.updateProgressDisplay(progress, capsule);

        // Load content into tabs
        this.loadNotesContent(capsule);
        this.loadFlashcardsContent(capsule, progress);
        this.loadQuizContent(capsule);
    }

    loadNotesContent(capsule) {
        const container = document.getElementById('notes-content');
        
        if (!capsule.notes || !capsule.notes.length) {
            container.innerHTML = '<p class="text-muted text-center py-4">No notes available for this capsule</p>';
            return;
        }

        const notesHtml = capsule.notes.map(note => 
            `<div class="card mb-2">
                <div class="card-body">
                    <p class="mb-0">${this.utils.escapeHtml(note)}</p>
                </div>
            </div>`
        ).join('');

        container.innerHTML = notesHtml;

        // Setup search functionality
        document.getElementById('notes-search').addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const noteCards = container.querySelectorAll('.card');
            
            noteCards.forEach(card => {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(searchTerm) ? 'block' : 'none';
            });
        });
    }

    loadFlashcardsContent(capsule, progress) {
        const container = document.getElementById('flashcards-learn');
        
        if (!capsule.flashcards || !capsule.flashcards.length) {
            container.innerHTML = '<p class="text-muted text-center py-4">No flashcards available for this capsule</p>';
            return;
        }

        this.learnMode.flashcardIndex = 0;
        this.renderCurrentFlashcard(container, capsule, progress);
    }

    renderCurrentFlashcard(container, capsule, progress) {
        const currentIndex = this.learnMode.flashcardIndex;
        const flashcard = capsule.flashcards[currentIndex];
        const isKnown = progress.knownFlashcards.includes(currentIndex);

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <span>Card ${currentIndex + 1} of ${capsule.flashcards.length}</span>
                <span class="badge ${isKnown ? 'bg-success' : 'bg-secondary'}">
                    ${isKnown ? 'Known' : 'Unknown'}
                </span>
            </div>
            
            <div class="flashcard mb-4" onclick="app.toggleFlashcard()">
                <div class="flashcard-inner">
                    <div class="flashcard-front">
                        <h4>${this.utils.escapeHtml(flashcard.front)}</h4>
                    </div>
                    <div class="flashcard-back">
                        <h4>${this.utils.escapeHtml(flashcard.back)}</h4>
                    </div>
                </div>
            </div>

            <div class="d-flex justify-content-between">
                <button class="btn btn-outline-primary" onclick="app.previousFlashcard()" 
                        ${currentIndex === 0 ? 'disabled' : ''}>
                    <i class="bi bi-arrow-left"></i> Previous
                </button>
                
                <div>
                    <button class="btn btn-success me-2" onclick="app.markFlashcardKnown()">
                        <i class="bi bi-check-circle"></i> Known
                    </button>
                    <button class="btn btn-danger" onclick="app.markFlashcardUnknown()">
                        <i class="bi bi-x-circle"></i> Unknown
                    </button>
                </div>
                
                <button class="btn btn-outline-primary" onclick="app.nextFlashcard()"
                        ${currentIndex === capsule.flashcards.length - 1 ? 'disabled' : ''}>
                    Next <i class="bi bi-arrow-right"></i>
                </button>
            </div>
        `;
    }

    toggleFlashcard() {
        const flashcard = document.querySelector('.flashcard');
        flashcard.classList.toggle('flipped');
    }

    previousFlashcard() {
        if (this.learnMode.flashcardIndex > 0) {
            this.learnMode.flashcardIndex--;
            this.renderCurrentFlashcard(
                document.getElementById('flashcards-learn'),
                this.learnMode.currentCapsule,
                this.storage.getProgress(this.learnMode.currentCapsule.id)
            );
        }
    }

    nextFlashcard() {
        if (this.learnMode.flashcardIndex < this.learnMode.currentCapsule.flashcards.length - 1) {
            this.learnMode.flashcardIndex++;
            this.renderCurrentFlashcard(
                document.getElementById('flashcards-learn'),
                this.learnMode.currentCapsule,
                this.storage.getProgress(this.learnMode.currentCapsule.id)
            );
        }
    }

    markFlashcardKnown() {
        const progress = this.storage.getProgress(this.learnMode.currentCapsule.id);
        const currentIndex = this.learnMode.flashcardIndex;
        
        if (!progress.knownFlashcards.includes(currentIndex)) {
            progress.knownFlashcards.push(currentIndex);
            this.storage.saveProgress(this.learnMode.currentCapsule.id, progress);
            this.updateProgressDisplay(progress, this.learnMode.currentCapsule);
            this.renderCurrentFlashcard(
                document.getElementById('flashcards-learn'),
                this.learnMode.currentCapsule,
                progress
            );
        }
    }

    markFlashcardUnknown() {
        const progress = this.storage.getProgress(this.learnMode.currentCapsule.id);
        const currentIndex = this.learnMode.flashcardIndex;
        
        progress.knownFlashcards = progress.knownFlashcards.filter(idx => idx !== currentIndex);
        this.storage.saveProgress(this.learnMode.currentCapsule.id, progress);
        this.updateProgressDisplay(progress, this.learnMode.currentCapsule);
        this.renderCurrentFlashcard(
            document.getElementById('flashcards-learn'),
            this.learnMode.currentCapsule,
            progress
        );
    }

    loadQuizContent(capsule) {
        const container = document.getElementById('quiz-learn');
        
        if (!capsule.quiz || !capsule.quiz.length) {
            container.innerHTML = '<p class="text-muted text-center py-4">No quiz available for this capsule</p>';
            return;
        }

        this.learnMode.quizIndex = 0;
        this.learnMode.quizScore = 0;
        this.renderCurrentQuizQuestion(container, capsule);
    }

    renderCurrentQuizQuestion(container, capsule) {
        const currentIndex = this.learnMode.quizIndex;
        const question = capsule.quiz[currentIndex];

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h5>Question ${currentIndex + 1} of ${capsule.quiz.length}</h5>
                <span class="badge bg-primary">Score: ${this.learnMode.quizScore}/${currentIndex}</span>
            </div>
            
            <div class="card mb-4">
                <div class="card-body">
                    <h6 class="card-title">${this.utils.escapeHtml(question.question)}</h6>
                </div>
            </div>

            <div class="row g-3">
                ${question.choices.map((choice, index) => `
                    <div class="col-md-6">
                        <div class="quiz-option card p-3" onclick="app.selectQuizAnswer(${index})">
                            <div class="d-flex align-items-center">
                                <span class="badge bg-secondary me-3">${String.fromCharCode(65 + index)}</span>
                                <span>${this.utils.escapeHtml(choice)}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    selectQuizAnswer(selectedIndex) {
        const question = this.learnMode.currentCapsule.quiz[this.learnMode.quizIndex];
        const options = document.querySelectorAll('.quiz-option');
        
        // Disable all options
        options.forEach(opt => opt.style.pointerEvents = 'none');
        
        // Mark correct/incorrect
        options.forEach((opt, index) => {
            if (index === question.correctIndex) {
                opt.classList.add('correct');
            } else if (index === selectedIndex && index !== question.correctIndex) {
                opt.classList.add('incorrect');
            }
        });

        // Update score
        if (selectedIndex === question.correctIndex) {
            this.learnMode.quizScore++;
        }

        // Move to next question after delay
        setTimeout(() => {
            this.learnMode.quizIndex++;
            
            if (this.learnMode.quizIndex < this.learnMode.currentCapsule.quiz.length) {
                this.renderCurrentQuizQuestion(
                    document.getElementById('quiz-learn'),
                    this.learnMode.currentCapsule
                );
            } else {
                this.showQuizResults();
            }
        }, 2000);
    }

    showQuizResults() {
        const container = document.getElementById('quiz-learn');
        const score = (this.learnMode.quizScore / this.learnMode.currentCapsule.quiz.length) * 100;
        const progress = this.storage.getProgress(this.learnMode.currentCapsule.id);
        
        // Update best score if needed
        if (score > progress.bestScore) {
            progress.bestScore = score;
            this.storage.saveProgress(this.learnMode.currentCapsule.id, progress);
        }

        container.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-trophy display-1 text-warning mb-3"></i>
                <h3>Quiz Complete!</h3>
                <div class="display-4 fw-bold text-primary mb-3">${score.toFixed(1)}%</div>
                <p class="text-muted mb-4">
                    You scored ${this.learnMode.quizScore} out of ${this.learnMode.currentCapsule.quiz.length} questions
                </p>
                <div class="d-flex justify-content-center gap-3">
                    <button class="btn btn-primary" onclick="app.restartQuiz()">
                        <i class="bi bi-arrow-repeat me-1"></i> Restart Quiz
                    </button>
                    <button class="btn btn-outline-secondary" onclick="app.switchView('library')">
                        <i class="bi bi-house me-1"></i> Back to Library
                    </button>
                </div>
            </div>
        `;

        this.updateProgressDisplay(progress, this.learnMode.currentCapsule);
    }

    restartQuiz() {
        this.loadQuizContent(this.learnMode.currentCapsule);
    }

    updateProgressDisplay(progress, capsule) {
        const quizScore = document.getElementById('quiz-score-text');
        const quizProgress = document.getElementById('quiz-progress');
        const flashcardsText = document.getElementById('flashcards-text');
        const flashcardsProgress = document.getElementById('flashcards-progress');

        // Quiz progress
        quizScore.textContent = `${progress.bestScore.toFixed(1)}%`;
        quizProgress.style.width = `${progress.bestScore}%`;

        // Flashcards progress
        const totalFlashcards = capsule.flashcards ? capsule.flashcards.length : 0;
        const knownCount = progress.knownFlashcards.length;
        const flashcardPercentage = totalFlashcards > 0 ? (knownCount / totalFlashcards) * 100 : 0;
        
        flashcardsText.textContent = `${knownCount}/${totalFlashcards} known`;
        flashcardsProgress.style.width = `${flashcardPercentage}%`;
    }

    async exportCurrentCapsule() {
        if (!this.learnMode.currentCapsule) {
            this.ui.showToast('Please select a capsule first', 'error');
            return;
        }

        const capsule = this.learnMode.currentCapsule;
        const dataStr = JSON.stringify(capsule, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.utils.slugify(capsule.meta.title)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.ui.showToast('Capsule exported successfully!', 'success');
    }

    async importCapsule(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const capsule = JSON.parse(text);

            // Validate schema
            if (capsule.schema !== 'pocket-classroom/v1') {
                throw new Error('Invalid capsule schema');
            }

            if (!capsule.meta?.title) {
                throw new Error('Capsule title is required');
            }

            if (!capsule.notes?.length && !capsule.flashcards?.length && !capsule.quiz?.length) {
                throw new Error('Capsule must contain at least one content type');
            }

            // Generate new ID to avoid collisions
            capsule.id = this.utils.generateId();
            capsule.updatedAt = new Date().toISOString();

            this.storage.saveCapsule(capsule);
            this.ui.showToast('Capsule imported successfully!', 'success');
            this.loadLibraryView();

        } catch (error) {
            this.ui.showToast(`Import failed: ${error.message}`, 'error');
        }

        // Reset file input
        event.target.value = '';
    }

    editCapsule(capsuleId) {
        this.currentCapsuleId = capsuleId;
        const capsule = this.storage.getCapsule(capsuleId);
        
        this.switchView('author');
        this.components.loadCapsuleIntoForm(capsule);
    }

    deleteCapsule(capsuleId) {
        if (confirm('Are you sure you want to delete this capsule? This action cannot be undone.')) {
            this.storage.deleteCapsule(capsuleId);
            this.ui.showToast('Capsule deleted successfully', 'success');
            this.loadLibraryView();
        }
    }

    setupAutoSave() {
        const inputs = document.querySelectorAll('#author-view input, #author-view textarea, #author-view select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.components.updateValidationStatus();
            });
        });
    }

    handleKeyboardShortcuts(event) {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

        switch(event.key) {
            case ' ':
                if (this.currentView === 'learn') {
                    event.preventDefault();
                    this.toggleFlashcard();
                }
                break;
            case '[':
                if (this.currentView === 'learn') {
                    event.preventDefault();
                    // Cycle tabs backward
                    const tabs = document.querySelectorAll('#learnTabs .nav-link');
                    const activeTab = document.querySelector('#learnTabs .nav-link.active');
                    const currentIndex = Array.from(tabs).indexOf(activeTab);
                    const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                    tabs[prevIndex].click();
                }
                break;
            case ']':
                if (this.currentView === 'learn') {
                    event.preventDefault();
                    // Cycle tabs forward
                    const tabs = document.querySelectorAll('#learnTabs .nav-link');
                    const activeTab = document.querySelector('#learnTabs .nav-link.active');
                    const currentIndex = Array.from(tabs).indexOf(activeTab);
                    const nextIndex = (currentIndex + 1) % tabs.length;
                    tabs[nextIndex].click();
                }
                break;
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-bs-theme', newTheme);
        localStorage.setItem('pocket-classroom-theme', newTheme);
        
        const icon = document.querySelector('#themeToggle i');
        icon.className = newTheme === 'dark' ? 'bi bi-moon-stars' : 'bi bi-sun';
    }

    applyThemePreference() {
        const savedTheme = localStorage.getItem('pocket-classroom-theme') || 'dark';
        document.documentElement.setAttribute('data-bs-theme', savedTheme);
        
        const icon = document.querySelector('#themeToggle i');
        icon.className = savedTheme === 'dark' ? 'bi bi-moon-stars' : 'bi bi-sun';
    }
}

// Initialize the app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new PocketClassroom();
    window.app = app; // Make app globally available for onclick handlers
});