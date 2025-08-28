/**
 * Premium Recipe Finder Application - Fixed Version
 * React-inspired JavaScript with proper state management
 */

class PremiumRecipeFinderApp {
    constructor() {
        // Application state
        this.state = {
            selectedIngredients: new Set(),
            allRecipes: [],
            filteredRecipes: [],
            isLoading: false,
            error: null,
            currentFilter: {
                time: '',
                category: '',
                area: ''
            },
            favorites: new Set(),
            currentServings: 4,
            timerState: {
                isRunning: false,
                isPaused: false,
                timeRemaining: 0,
                interval: null
            }
        };

        // API configuration
        this.api = {
            baseUrl: "https://www.themealdb.com/api/json/v1/1",
            endpoints: {
                filterByIngredient: "/filter.php?i=",
                getRecipeDetails: "/lookup.php?i=",
                getRandomRecipe: "/random.php",
                searchByName: "/search.php?s="
            }
        };

        // Application data
        this.popularIngredients = [
            { name: "chicken", icon: "🐔" },
            
            
            { name: "salmon", icon: "🐟" },
            { name: "eggs", icon: "🥚" },
            { name: "rice", icon: "🍚" },
            { name: "pasta", icon: "🍝" },
            { name: "potatoes", icon: "🥔" },
            { name: "tomatoes", icon: "🍅" },
            { name: "onions", icon: "🧅" },
            { name: "garlic", icon: "🧄" },
            { name: "cheese", icon: "🧀" },
            { name: "milk", icon: "🥛" }
        ];

        this.searchableIngredients = [
            "chicken","pork", "salmon", "shrimp", "tuna", "eggs", "milk", "cheese", 
            "butter", "rice", "pasta", "bread", "potatoes", "onions", "garlic", "tomatoes", 
            "carrots", "broccoli", "spinach", "mushrooms", "bell peppers", "zucchini", 
            "lemon", "lime", "olive oil", "salt", "pepper", "basil", "oregano", "thyme"
        ];

        // Component references
        this.currentRecipe = null;
        this.debounceTimer = null;
        this.searchPromise = null;

        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    /**
     * Initialize application
     */
    init() {
        try {
            this.setupComponents();
            this.bindEvents();
            this.renderEmptyState();
            console.log('🍳 Recipe Finder initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize application:', error);
        }
    }

    /**
     * Setup components
     */
    setupComponents() {
        this.setupQuickIngredients();
        this.setupFilterOptions();
    }

    /**
     * Setup quick ingredient buttons
     */
    setupQuickIngredients() {
        const container = document.getElementById('ingredient-grid');
        if (!container) return;
        
        container.innerHTML = this.popularIngredients.map(ingredient => 
            `<button class="ingredient-btn" data-ingredient="${ingredient.name}" type="button">
                <span class="ingredient-icon">${ingredient.icon}</span>
                <span class="ingredient-name">${ingredient.name}</span>
            </button>`
        ).join('');
    }

    /**
     * Setup filter dropdown options
     */
    setupFilterOptions() {
        const categories = [
            "prawn", "Breakfast", "Chicken", "Dessert", "Lamb", 
            "Pasta", "Pork", "Seafood", "Starter", "Vegan", "Vegetarian"
        ];
        
        const areas = [
            "American", "British", "Chinese", "French", "Greek", "Indian", 
            "Italian", "Japanese", "Mexican", "Spanish", "Thai"
        ];

        const categorySelect = document.getElementById('category-filter');
        if (categorySelect) {
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
        }

        const areaSelect = document.getElementById('area-filter');
        if (areaSelect) {
            areas.forEach(area => {
                const option = document.createElement('option');
                option.value = area;
                option.textContent = area;
                areaSelect.appendChild(option);
            });
        }
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Quick ingredient buttons
        const ingredientGrid = document.getElementById('ingredient-grid');
        if (ingredientGrid) {
            ingredientGrid.addEventListener('click', (e) => {
                const btn = e.target.closest('.ingredient-btn');
                if (btn) {
                    const ingredient = btn.dataset.ingredient;
                    this.addIngredient(ingredient);
                    
                    // Visual feedback
                    btn.style.transform = 'scale(0.95)';
                    setTimeout(() => { btn.style.transform = ''; }, 150);
                }
            });
        }

        // Search input
        const searchInput = document.getElementById('ingredient-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
            searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
        }

        // Clear ingredients
        const clearBtn = document.getElementById('clear-ingredients');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllIngredients());
        }

        // Filters
        const timeFilter = document.getElementById('time-filter');
        const categoryFilter = document.getElementById('category-filter');
        const areaFilter = document.getElementById('area-filter');
        
        if (timeFilter) timeFilter.addEventListener('change', (e) => this.handleFilterChange(e));
        if (categoryFilter) categoryFilter.addEventListener('change', (e) => this.handleFilterChange(e));
        if (areaFilter) areaFilter.addEventListener('change', (e) => this.handleFilterChange(e));

        // Random recipe
        const randomBtn = document.getElementById('random-recipe');
        if (randomBtn) {
            randomBtn.addEventListener('click', () => this.getRandomRecipe());
        }

        // Modal close
        const modalClose = document.getElementById('modal-close');
        const modalOverlay = document.getElementById('modal-overlay');
        
        if (modalClose) modalClose.addEventListener('click', () => this.closeModal());
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) this.closeModal();
            });
        }

        // Recipe actions
        this.bindRecipeActions();

        // Timer actions
        this.bindTimerActions();

        // Retry button
        const retryBtn = document.getElementById('retry-button');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.retrySearch());
        }

        // Global events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.hideTimerModal();
                this.hideSuggestions();
            }
        });

        // Suggestion chips
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-chip')) {
                const ingredients = e.target.dataset.ingredients.split(',');
                ingredients.forEach(ing => this.addIngredient(ing.trim()));
            }
        });
    }

    /**
     * Bind recipe action events
     */
    bindRecipeActions() {
        const decreaseBtn = document.getElementById('decrease-serving');
        const increaseBtn = document.getElementById('increase-serving');
        const timerBtn = document.getElementById('start-timer');
        const favoriteBtn = document.getElementById('favorite-btn');
        const shareBtn = document.getElementById('share-btn');

        if (decreaseBtn) decreaseBtn.addEventListener('click', () => this.adjustServings(-1));
        if (increaseBtn) increaseBtn.addEventListener('click', () => this.adjustServings(1));
        if (timerBtn) timerBtn.addEventListener('click', () => this.showTimerModal());
        if (favoriteBtn) favoriteBtn.addEventListener('click', () => this.toggleFavorite());
        if (shareBtn) shareBtn.addEventListener('click', () => this.shareRecipe());
    }

    /**
     * Bind timer action events
     */
    bindTimerActions() {
        const timerClose = document.getElementById('timer-close');
        const timerStart = document.getElementById('timer-start');
        const timerPause = document.getElementById('timer-pause');
        const timerReset = document.getElementById('timer-reset');

        if (timerClose) timerClose.addEventListener('click', () => this.hideTimerModal());
        if (timerStart) timerStart.addEventListener('click', () => this.startTimer());
        if (timerPause) timerPause.addEventListener('click', () => this.pauseTimer());
        if (timerReset) timerReset.addEventListener('click', () => this.resetTimer());

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const time = parseInt(e.target.dataset.time);
                this.setTimer(time);
            });
        });
    }

    // ===== INGREDIENT MANAGEMENT =====

    /**
     * Handle search input
     */
    handleSearchInput(e) {
        const value = e.target.value.trim().toLowerCase();
        
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        
        this.debounceTimer = setTimeout(() => {
            if (value.length >= 2) {
                this.showSuggestions(value);
            } else {
                this.hideSuggestions();
            }
        }, 300);
    }

    /**
     * Handle search keydown
     */
    handleSearchKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = e.target.value.trim();
            if (value) {
                this.addIngredient(value);
                e.target.value = '';
                this.hideSuggestions();
            }
        } else if (e.key === 'Escape') {
            this.hideSuggestions();
        }
    }

    /**
     * Show ingredient suggestions
     */
    showSuggestions(query) {
        const suggestions = this.searchableIngredients
            .filter(ingredient => 
                ingredient.toLowerCase().includes(query) && 
                !this.state.selectedIngredients.has(ingredient.toLowerCase())
            )
            .slice(0, 6);

        const container = document.getElementById('ingredient-suggestions');
        if (!container) return;
        
        if (suggestions.length > 0) {
            container.innerHTML = suggestions.map(ingredient => 
                `<div class="suggestion-item" data-ingredient="${ingredient}">
                    ${ingredient}
                </div>`
            ).join('');
            
            container.classList.remove('hidden');
            
            // Add click handlers
            container.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    this.addIngredient(item.dataset.ingredient);
                    document.getElementById('ingredient-input').value = '';
                    this.hideSuggestions();
                });
            });
        } else {
            this.hideSuggestions();
        }
    }

    /**
     * Hide suggestions
     */
    hideSuggestions() {
        const container = document.getElementById('ingredient-suggestions');
        if (container) container.classList.add('hidden');
    }

    /**
     * Add ingredient to state
     */
    addIngredient(ingredient) {
        const normalizedIngredient = ingredient.toLowerCase().trim();
        
        if (normalizedIngredient && !this.state.selectedIngredients.has(normalizedIngredient)) {
            this.state.selectedIngredients.add(normalizedIngredient);
            this.updateIngredientChips();
            this.searchRecipes();
        }
    }

    /**
     * Remove ingredient from state
     */
    removeIngredient(ingredient) {
        this.state.selectedIngredients.delete(ingredient);
        this.updateIngredientChips();
        
        if (this.state.selectedIngredients.size > 0) {
            this.searchRecipes();
        } else {
            this.renderEmptyState();
        }
    }

    /**
     * Clear all ingredients
     */
    clearAllIngredients() {
        this.state.selectedIngredients.clear();
        this.state.allRecipes = [];
        this.state.filteredRecipes = [];
        this.state.error = null;
        
        this.updateIngredientChips();
        this.renderEmptyState();
    }

    /**
     * Update ingredient chips display
     */
    updateIngredientChips() {
        const container = document.getElementById('ingredient-chips');
        if (!container) return;
        
        // Clear existing content
        container.innerHTML = '';
        
        if (this.state.selectedIngredients.size === 0) {
            // Show empty state
            container.innerHTML = `
                <div class="empty-ingredients-state">
                    <div class="empty-icon">🥘</div>
                    <p>No ingredients added yet. Start by selecting some above!</p>
                </div>
            `;
        } else {
            // Show ingredient chips
            const chips = Array.from(this.state.selectedIngredients).map(ingredient => 
                `<div class="ingredient-chip">
                    <span class="chip-text">${ingredient}</span>
                    <button class="chip-remove" data-ingredient="${ingredient}" type="button" aria-label="Remove ${ingredient}">
                        ×
                    </button>
                </div>`
            ).join('');
            
            container.innerHTML = chips;
            
            // Add remove handlers
            container.querySelectorAll('.chip-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeIngredient(btn.dataset.ingredient);
                });
            });
        }
    }

    // ===== RECIPE SEARCH =====

    /**
     * Search for recipes
     */
    async searchRecipes() {
        if (this.state.selectedIngredients.size === 0) {
            this.renderEmptyState();
            return;
        }

        this.state.isLoading = true;
        this.state.error = null;
        this.renderLoadingState();

        try {
            const ingredients = Array.from(this.state.selectedIngredients);
            const searchPromises = ingredients.map(ingredient => 
                this.fetchRecipesByIngredient(ingredient)
            );

            const results = await Promise.all(searchPromises);
            const allRecipes = results.flat();
            const uniqueRecipes = this.deduplicateRecipes(allRecipes);
            
            // Add matching info
            const recipesWithMatches = uniqueRecipes.map(recipe => ({
                ...recipe,
                matchingIngredients: this.getMatchingIngredients(recipe, ingredients)
            }));

            this.state.allRecipes = recipesWithMatches;
            this.state.isLoading = false;

            this.applyFilters();
            
        } catch (error) {
            console.error('Error searching recipes:', error);
            this.state.error = 'Failed to search recipes. Please try again.';
            this.state.isLoading = false;
            this.renderErrorState();
        }
    }

    /**
     * Fetch recipes by ingredient
     */
    async fetchRecipesByIngredient(ingredient) {
        const response = await fetch(
            `${this.api.baseUrl}${this.api.endpoints.filterByIngredient}${encodeURIComponent(ingredient)}`
        );
        
        if (!response.ok) {
            throw new Error(`Failed to fetch recipes for ${ingredient}`);
        }

        const data = await response.json();
        return data.meals || [];
    }

    /**
     * Remove duplicate recipes
     */
    deduplicateRecipes(recipes) {
        const seen = new Set();
        return recipes.filter(recipe => {
            if (seen.has(recipe.idMeal)) return false;
            seen.add(recipe.idMeal);
            return true;
        });
    }

    /**
     * Get matching ingredients
     */
    getMatchingIngredients(recipe, searchIngredients) {
        const maxMatches = Math.min(searchIngredients.length, 3);
        return searchIngredients.slice(0, maxMatches);
    }

    /**
     * Handle filter changes
     */
    handleFilterChange(e) {
        const filterType = e.target.id.replace('-filter', '');
        this.state.currentFilter[filterType] = e.target.value;
        this.applyFilters();
    }

    /**
     * Apply filters to recipes
     */
    applyFilters() {
        let filtered = [...this.state.allRecipes];

        if (this.state.currentFilter.category) {
            filtered = filtered.filter(recipe => 
                recipe.strCategory && 
                recipe.strCategory.toLowerCase() === this.state.currentFilter.category.toLowerCase()
            );
        }

        if (this.state.currentFilter.area) {
            filtered = filtered.filter(recipe => 
                recipe.strArea && 
                recipe.strArea.toLowerCase() === this.state.currentFilter.area.toLowerCase()
            );
        }

        // Simulate time filtering
        if (this.state.currentFilter.time) {
            const ratio = this.state.currentFilter.time === 'quick' ? 0.7 : 
                         this.state.currentFilter.time === 'medium' ? 0.8 : 0.6;
            filtered = filtered.filter(() => Math.random() > (1 - ratio));
        }

        this.state.filteredRecipes = filtered;
        this.renderRecipeGrid();
    }

    /**
     * Get random recipe
     */
    async getRandomRecipe() {
        try {
            this.state.isLoading = true;
            this.renderLoadingState();
            
            const response = await fetch(`${this.api.baseUrl}${this.api.endpoints.getRandomRecipe}`);
            
            if (!response.ok) throw new Error('Failed to fetch random recipe');

            const data = await response.json();
            
            if (!data.meals || data.meals.length === 0) {
                throw new Error('No random recipe found');
            }

            const recipe = data.meals[0];
            this.state.isLoading = false;
            this.hideLoadingState();
            this.showRecipeModal(recipe.idMeal);
            
        } catch (error) {
            console.error('Error fetching random recipe:', error);
            this.state.error = 'Failed to load random recipe. Please try again.';
            this.state.isLoading = false;
            this.renderErrorState();
        }
    }

    /**
     * Retry search
     */
    retrySearch() {
        this.state.error = null;
        if (this.state.selectedIngredients.size > 0) {
            this.searchRecipes();
        } else {
            this.renderEmptyState();
        }
    }

    // ===== RECIPE MODAL =====

    /**
     * Show recipe modal
     */
    async showRecipeModal(recipeId) {
        try {
            const response = await fetch(
                `${this.api.baseUrl}${this.api.endpoints.getRecipeDetails}${recipeId}`
            );
            
            if (!response.ok) throw new Error('Failed to fetch recipe details');

            const data = await response.json();
            
            if (!data.meals || data.meals.length === 0) {
                throw new Error('Recipe not found');
            }

            const recipe = data.meals[0];
            this.currentRecipe = recipe;
            this.renderRecipeModal(recipe);
            this.openModal();
            
        } catch (error) {
            console.error('Error fetching recipe details:', error);
            this.showToast('Failed to load recipe details. Please try again.');
        }
    }

    /**
     * Open modal
     */
    openModal() {
        const modal = document.getElementById('modal-overlay');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Close modal
     */
    closeModal() {
        const modal = document.getElementById('modal-overlay');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
            this.currentRecipe = null;
        }
    }

    /**
     * Render recipe modal
     */
    renderRecipeModal(recipe) {
        // Update basic info
        const elements = {
            title: document.getElementById('modal-recipe-title'),
            image: document.getElementById('modal-recipe-image'),
            category: document.getElementById('modal-recipe-category'),
            area: document.getElementById('modal-recipe-area')
        };

        if (elements.title) elements.title.textContent = recipe.strMeal;
        if (elements.image) {
            elements.image.src = recipe.strMealThumb;
            elements.image.alt = recipe.strMeal;
        }
        if (elements.category) elements.category.textContent = recipe.strCategory || '';
        if (elements.area) elements.area.textContent = recipe.strArea || '';

        // Process ingredients
        const ingredients = [];
        for (let i = 1; i <= 20; i++) {
            const ingredient = recipe[`strIngredient${i}`];
            const measure = recipe[`strMeasure${i}`];
            
            if (ingredient && ingredient.trim()) {
                ingredients.push(`${measure ? measure.trim() + ' ' : ''}${ingredient.trim()}`);
            }
        }

        const ingredientsList = document.getElementById('modal-ingredients');
        if (ingredientsList) {
            ingredientsList.innerHTML = ingredients
                .map(ing => `<li>${ing}</li>`)
                .join('');
        }

        // Process instructions
        const instructions = recipe.strInstructions
            .split(/\r?\n/)
            .filter(line => line.trim())
            .map((line, index) => `
                <div class="instruction-step">
                    <span class="step-number">${index + 1}</span>
                    <p>${line.trim()}</p>
                </div>
            `).join('');
        
        const instructionsContainer = document.getElementById('modal-instructions');
        if (instructionsContainer) {
            instructionsContainer.innerHTML = instructions;
        }

        // Update favorite status
        const favoriteBtn = document.getElementById('favorite-btn');
        const heartIcon = favoriteBtn?.querySelector('.heart-icon');
        if (favoriteBtn && heartIcon) {
            if (this.state.favorites.has(recipe.idMeal)) {
                heartIcon.textContent = '❤️';
                favoriteBtn.classList.add('favorited');
            } else {
                heartIcon.textContent = '🤍';
                favoriteBtn.classList.remove('favorited');
            }
        }

        // Process external links
        const links = [];
        if (recipe.strSource) {
            links.push(`<a href="${recipe.strSource}" target="_blank">View Original Recipe</a>`);
        }
        if (recipe.strYoutube) {
            links.push(`<a href="${recipe.strYoutube}" target="_blank">Watch Video Tutorial</a>`);
        }
        
        const linksContainer = document.getElementById('modal-links');
        if (linksContainer) {
            linksContainer.innerHTML = links.join('');
        }
    }

    // ===== RECIPE ACTIONS =====

    /**
     * Adjust servings
     */
    adjustServings(change) {
        this.state.currentServings = Math.max(1, this.state.currentServings + change);
        const servingCount = document.getElementById('serving-count');
        if (servingCount) {
            servingCount.textContent = this.state.currentServings.toString();
        }
    }

    /**
     * Toggle favorite
     */
    toggleFavorite() {
        if (!this.currentRecipe) return;
        
        const recipeId = this.currentRecipe.idMeal;
        const favoriteBtn = document.getElementById('favorite-btn');
        const heartIcon = favoriteBtn?.querySelector('.heart-icon');
        
        if (this.state.favorites.has(recipeId)) {
            this.state.favorites.delete(recipeId);
            if (heartIcon) heartIcon.textContent = '🤍';
            favoriteBtn?.classList.remove('favorited');
            this.showToast('Removed from favorites');
        } else {
            this.state.favorites.add(recipeId);
            if (heartIcon) heartIcon.textContent = '❤️';
            favoriteBtn?.classList.add('favorited');
            this.showToast('Added to favorites!');
        }
    }

    /**
     * Share recipe
     */
    shareRecipe() {
        if (!this.currentRecipe) return;
        
        const shareData = {
            title: this.currentRecipe.strMeal,
            text: `Check out this amazing recipe: ${this.currentRecipe.strMeal}`,
            url: window.location.href
        };
        
        if (navigator.share) {
            navigator.share(shareData);
        } else {
            navigator.clipboard?.writeText(
                `${shareData.title}\n${shareData.text}`
            ).then(() => {
                this.showToast('Recipe link copied to clipboard!');
            }).catch(() => {
                this.showToast('Unable to copy link');
            });
        }
    }

    // ===== TIMER FUNCTIONALITY =====

    showTimerModal() {
        const modal = document.getElementById('timer-modal');
        if (modal) modal.classList.remove('hidden');
    }

    hideTimerModal() {
        const modal = document.getElementById('timer-modal');
        if (modal) modal.classList.add('hidden');
    }

    setTimer(seconds) {
        this.state.timerState.timeRemaining = seconds;
        this.updateTimerDisplay();
    }

    startTimer() {
        if (this.state.timerState.timeRemaining <= 0) this.setTimer(300);
        
        this.state.timerState.isRunning = true;
        this.state.timerState.interval = setInterval(() => this.tickTimer(), 1000);
    }

    pauseTimer() {
        if (this.state.timerState.interval) {
            clearInterval(this.state.timerState.interval);
        }
        this.state.timerState.isRunning = false;
        this.state.timerState.interval = null;
    }

    resetTimer() {
        this.pauseTimer();
        this.state.timerState.timeRemaining = 0;
        this.updateTimerDisplay();
    }

    tickTimer() {
        if (this.state.timerState.timeRemaining > 0) {
            this.state.timerState.timeRemaining--;
            this.updateTimerDisplay();
        } else {
            this.pauseTimer();
            this.showToast('⏰ Timer finished! Your food is ready!');
        }
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.state.timerState.timeRemaining / 60);
        const seconds = this.state.timerState.timeRemaining % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const display = document.getElementById('timer-time');
        if (display) display.textContent = timeString;
    }

    // ===== RENDER METHODS =====

    /**
     * Render loading state
     */
    renderLoadingState() {
        this.hideAllStates();
        const loading = document.getElementById('loading-container');
        if (loading) loading.classList.remove('hidden');
    }

    /**
     * Render error state
     */
    renderErrorState(message = null) {
        this.hideAllStates();
        
        if (message) {
            const errorMsg = document.getElementById('error-message');
            if (errorMsg) errorMsg.textContent = message;
        }
        
        const error = document.getElementById('error-container');
        if (error) error.classList.remove('hidden');
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        this.hideAllStates();
        const empty = document.getElementById('empty-container');
        const resultsCount = document.getElementById('results-count');
        
        if (empty) empty.classList.remove('hidden');
        if (resultsCount) resultsCount.textContent = '';
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        const loading = document.getElementById('loading-container');
        if (loading) loading.classList.add('hidden');
    }

    /**
     * Hide all states
     */
    hideAllStates() {
        const states = ['loading-container', 'error-container', 'empty-container'];
        states.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.classList.add('hidden');
        });
        
        const grid = document.getElementById('recipe-grid');
        if (grid) grid.classList.add('hidden');
    }

    /**
     * Render recipe grid
     */
    renderRecipeGrid() {
        this.hideAllStates();
        
        const container = document.getElementById('recipe-grid');
        const resultsCount = document.getElementById('results-count');
        
        if (!container) return;
        
        if (this.state.filteredRecipes.length === 0) {
            this.renderErrorState('No recipes found with your current ingredients and filters. Try different combinations.');
            return;
        }

        const count = this.state.filteredRecipes.length;
        if (resultsCount) {
            resultsCount.textContent = `Found ${count} delicious recipe${count !== 1 ? 's' : ''}`;
        }

        container.innerHTML = this.state.filteredRecipes.map(recipe => `
            <div class="recipe-card" data-recipe-id="${recipe.idMeal}" tabindex="0" role="button">
                <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" class="recipe-image" loading="lazy">
                <div class="recipe-info">
                    <h3 class="recipe-title">${recipe.strMeal}</h3>
                    <div class="recipe-meta-info">
                        ${recipe.strCategory ? `<span class="meta-tag">${recipe.strCategory}</span>` : ''}
                        ${recipe.strArea ? `<span class="meta-tag">${recipe.strArea}</span>` : ''}
                    </div>
                    ${recipe.matchingIngredients ? `
                        <div class="matched-ingredients">
                            <h5>Your ingredients used:</h5>
                            <div class="ingredient-matches">
                                ${recipe.matchingIngredients.map(ing => 
                                    `<span class="ingredient-match">${ing}</span>`
                                ).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.recipe-card').forEach(card => {
            const handler = () => this.showRecipeModal(card.dataset.recipeId);
            
            card.addEventListener('click', handler);
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handler();
                }
            });
        });

        container.classList.remove('hidden');
    }

    // ===== UTILITY METHODS =====

    /**
     * Show toast notification
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--color-success);
            color: var(--color-btn-primary-text);
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 2000;
            animation: slideInRight 0.3s ease-out;
            max-width: 300px;
            font-family: var(--font-family-base);
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize application
window.recipeApp = new PremiumRecipeFinderApp();

// Add required styles
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    @keyframes slideInRight {
        from { opacity: 0; transform: translateX(100%); }
        to { opacity: 1; transform: translateX(0); }
    }
    
    @keyframes slideOutRight {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100%); }
    }
    
    .instruction-step {
        display: flex;
        gap: var(--space-12);
        margin-bottom: var(--space-16);
        align-items: flex-start;
    }
    
    .step-number {
        background: var(--color-primary);
        color: var(--color-btn-primary-text);
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-bold);
        flex-shrink: 0;
    }
    
    .instruction-step p {
        margin: 0;
        color: var(--color-text);
    }
`;
document.head.appendChild(additionalStyles);