export class StorageManager {
    constructor() {
        this.storageKeys = {
            INDEX: 'pc_capsules_index',
            CAPSULE_PREFIX: 'pc_capsule_',
            PROGRESS_PREFIX: 'pc_progress_'
        };
    }

    getCapsulesIndex() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKeys.INDEX)) || [];
        } catch (error) {
            console.error('Error reading capsules index:', error);
            return [];
        }
    }

    saveCapsulesIndex(index) {
        try {
            localStorage.setItem(this.storageKeys.INDEX, JSON.stringify(index));
            return true;
        } catch (error) {
            console.error('Error saving capsules index:', error);
            return false;
        }
    }

    getCapsule(id) {
        try {
            return JSON.parse(localStorage.getItem(`${this.storageKeys.CAPSULE_PREFIX}${id}`));
        } catch (error) {
            console.error(`Error reading capsule ${id}:`, error);
            return null;
        }
    }

    saveCapsule(capsule) {
        try {
            // Save capsule data
            localStorage.setItem(
                `${this.storageKeys.CAPSULE_PREFIX}${capsule.id}`,
                JSON.stringify(capsule)
            );

            // Update index
            const index = this.getCapsulesIndex();
            const existingIndex = index.findIndex(item => item.id === capsule.id);
            
            const indexEntry = {
                id: capsule.id,
                title: capsule.meta.title,
                subject: capsule.meta.subject,
                level: capsule.meta.level,
                updatedAt: capsule.updatedAt
            };

            if (existingIndex >= 0) {
                index[existingIndex] = indexEntry;
            } else {
                index.push(indexEntry);
            }

            this.saveCapsulesIndex(index);
            return true;
        } catch (error) {
            console.error(`Error saving capsule ${capsule.id}:`, error);
            return false;
        }
    }

    deleteCapsule(id) {
        try {
            // Remove from index
            const index = this.getCapsulesIndex();
            const filteredIndex = index.filter(item => item.id !== id);
            this.saveCapsulesIndex(filteredIndex);

            // Remove capsule data
            localStorage.removeItem(`${this.storageKeys.CAPSULE_PREFIX}${id}`);

            // Remove progress data
            localStorage.removeItem(`${this.storageKeys.PROGRESS_PREFIX}${id}`);

            return true;
        } catch (error) {
            console.error(`Error deleting capsule ${id}:`, error);
            return false;
        }
    }

    getProgress(id) {
        try {
            const progress = JSON.parse(
                localStorage.getItem(`${this.storageKeys.PROGRESS_PREFIX}${id}`)
            );
            
            return progress || {
                bestScore: 0,
                knownFlashcards: []
            };
        } catch (error) {
            console.error(`Error reading progress for ${id}:`, error);
            return {
                bestScore: 0,
                knownFlashcards: []
            };
        }
    }

    saveProgress(id, progress) {
        try {
            localStorage.setItem(
                `${this.storageKeys.PROGRESS_PREFIX}${id}`,
                JSON.stringify(progress)
            );
            return true;
        } catch (error) {
            console.error(`Error saving progress for ${id}:`, error);
            return false;
        }
    }

    // Utility method to get capsule with progress
    getCapsuleWithProgress(id) {
        const capsule = this.getCapsule(id);
        const progress = this.getProgress(id);
        
        return {
            capsule,
            progress
        };
    }

    // Export all data (for backup)
    exportAllData() {
        const capsules = this.getCapsulesIndex().map(item => 
            this.getCapsule(item.id)
        );
        
        const progress = this.getCapsulesIndex().map(item => ({
            id: item.id,
            progress: this.getProgress(item.id)
        }));

        return {
            capsules,
            progress,
            exportedAt: new Date().toISOString()
        };
    }

    // Clear all data (for testing/reset)
    clearAllData() {
        try {
            // Clear index
            localStorage.removeItem(this.storageKeys.INDEX);

            // Clear all capsules
            const index = this.getCapsulesIndex();
            index.forEach(item => {
                localStorage.removeItem(`${this.storageKeys.CAPSULE_PREFIX}${item.id}`);
                localStorage.removeItem(`${this.storageKeys.PROGRESS_PREFIX}${item.id}`);
            });

            return true;
        } catch (error) {
            console.error('Error clearing all data:', error);
            return false;
        }
    }
}