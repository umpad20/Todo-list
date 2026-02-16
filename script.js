class TodoApp {
    constructor() {
        // State
        this.tasks = [];
        this.customLists = [];
        this.currentFilter = 'all'; // 'all', 'today', 'important', 'completed', or listId
        
        // DOM Elements
        this.taskInput = document.getElementById('taskInput');
        this.addBtn = document.getElementById('addBtn');
        this.taskList = document.getElementById('taskList');
        this.emptyState = document.getElementById('emptyState');
        this.emptyStateText = document.getElementById('emptyStateText');
        this.errorMessage = document.getElementById('errorMessage');
        this.currentViewTitle = document.getElementById('currentViewTitle');
        this.currentDateElement = document.getElementById('currentDate');
        
        // Sidebar Elements
        this.sidebar = document.getElementById('sidebar');
        this.sidebarOverlay = document.getElementById('sidebarOverlay');
        this.menuBtn = document.getElementById('menuBtn');
        this.navItems = document.querySelectorAll('.nav-item');
        this.customListsContainer = document.getElementById('customLists');
        this.addListBtn = document.getElementById('addListBtn');
        
        // Counts
        this.countAll = document.getElementById('count-all');
        this.countToday = document.getElementById('count-today');
        this.countImportant = document.getElementById('count-important');
        this.countCompleted = document.getElementById('count-completed');

        // Modal Elements
        this.listModal = document.getElementById('listModal');
        this.closeListModal = document.getElementById('closeListModal');
        this.listNameInput = document.getElementById('listNameInput');
        this.saveListBtn = document.getElementById('saveListBtn');
        this.listModalError = document.getElementById('listModalError');

        // Theme
        this.themeToggle = document.getElementById('themeToggle');
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.renderDate();
        this.render();
        this.applyTheme();
    }

    loadData() {
        const storedTasks = localStorage.getItem('todohub_tasks');
        const storedLists = localStorage.getItem('todohub_lists');
        
        this.tasks = storedTasks ? JSON.parse(storedTasks) : [];
        this.customLists = storedLists ? JSON.parse(storedLists) : [];
    }

    saveData() {
        localStorage.setItem('todohub_tasks', JSON.stringify(this.tasks));
        localStorage.setItem('todohub_lists', JSON.stringify(this.customLists));
    }

    setupEventListeners() {
        // Task Input
        this.addBtn.addEventListener('click', () => this.addTask());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });
        
        // Navigation
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Handle main nav items
                const filter = item.dataset.filter;
                if (filter) {
                    this.setFilter(filter);
                    // Close sidebar on mobile
                    this.toggleSidebar(false);
                }
            });
        });

        // Sidebar Toggle
        if (this.menuBtn) {
            this.menuBtn.addEventListener('click', () => this.toggleSidebar(true));
        }
        if (this.sidebarOverlay) {
            this.sidebarOverlay.addEventListener('click', () => this.toggleSidebar(false));
        }

        // List Creation
        this.addListBtn.addEventListener('click', () => this.openListModal());
        this.closeListModal.addEventListener('click', () => this.closeModal());
        this.saveListBtn.addEventListener('click', () => this.createList());
        this.listNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createList();
        });

        // Theme
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
    }

    renderDate() {
        const date = new Date();
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        if (this.currentDateElement) {
            this.currentDateElement.textContent = date.toLocaleDateString('en-US', options);
        }
    }

    toggleSidebar(show) {
        if (show) {
            this.sidebar.classList.add('open');
            this.sidebarOverlay.classList.add('open');
        } else {
            this.sidebar.classList.remove('open');
            this.sidebarOverlay.classList.remove('open');
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update UI active state
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        
        if (['all', 'today', 'important', 'completed'].includes(filter)) {
            // Main nav
            document.querySelector(`.nav-item[data-filter="${filter}"]`).classList.add('active');
            
            // Update Title
            const titles = {
                'all': 'All Tasks',
                'today': 'My Day',
                'important': 'Important',
                'completed': 'Completed'
            };
            this.currentViewTitle.textContent = titles[filter];
        } else {
            // Custom list
            const listItem = document.getElementById(`list-${filter}`);
            if (listItem) listItem.classList.add('active');
            
            const list = this.customLists.find(l => l.id.toString() === filter.toString());
            this.currentViewTitle.textContent = list ? list.name : 'List';
        }

        this.render();
    }

    addTask() {
        const text = this.taskInput.value.trim();
        if (!text) return;

        const newTask = {
            id: Date.now(),
            text: text,
            completed: false,
            important: this.currentFilter === 'important', // Auto-mark important if in important view
            createdAt: new Date().toISOString(),
            listId: this.isCustomList(this.currentFilter) ? this.currentFilter : null,
            isToday: this.currentFilter === 'today' // Optional: mark as for today logic if needed
        };

        this.tasks.unshift(newTask);
        this.saveData();
        this.taskInput.value = '';
        this.render();
    }

    isCustomList(filter) {
        return !['all', 'today', 'important', 'completed'].includes(filter);
    }

    getFilteredTasks() {
        switch (this.currentFilter) {
            case 'all':
                return this.tasks.filter(t => !t.completed); 
            case 'completed':
                return this.tasks.filter(t => t.completed);
            case 'important':
                return this.tasks.filter(t => t.important && !t.completed);
            case 'today':
                const today = new Date().toISOString().split('T')[0];
                return this.tasks.filter(t => t.createdAt.startsWith(today) && !t.completed);
            default:
                // Custom List
                return this.tasks.filter(t => t.listId == this.currentFilter && !t.completed);
        }
    }

    render() {
        // Update Counts
        this.updateCounts();
        this.renderCustomLists();

        const filteredTasks = this.getFilteredTasks();
        this.taskList.innerHTML = '';

        if (filteredTasks.length === 0) {
            this.emptyState.classList.add('show');
            // Customize empty state message
            if (this.currentFilter === 'completed') this.emptyStateText.textContent = 'No completed tasks yet';
            else if (this.currentFilter === 'important') this.emptyStateText.textContent = 'No important tasks';
            else this.emptyStateText.textContent = 'No tasks found';
        } else {
            this.emptyState.classList.remove('show');
            filteredTasks.forEach(task => {
                this.taskList.appendChild(this.createTaskElement(task));
            });
        }
    }

    createTaskElement(task) {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        
        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => this.toggleComplete(task.id));

        // Text
        const span = document.createElement('span');
        span.className = 'task-text';
        span.textContent = task.text;

        // Important Toggle
        const starBtn = document.createElement('button');
        starBtn.className = 'delete-btn'; 
        starBtn.innerHTML = task.important ? '⭐' : '☆';
        starBtn.style.color = task.important ? '#f1c40f' : '#ccc';
        starBtn.style.fontSize = '1.2rem';
        starBtn.style.opacity = '1'; 
        starBtn.title = 'Mark as Important';
        starBtn.onclick = (e) => {
            e.stopPropagation(); 
            this.toggleImportant(task.id);
        };

        // Delete Btn
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Delete Task';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            this.deleteTask(task.id);
        };

        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(starBtn);
        li.appendChild(deleteBtn);
        
        return li;
    }

    toggleComplete(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveData();
            this.render(); 
        }
    }

    toggleImportant(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.important = !task.important;
            this.saveData();
            this.render();
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveData();
        this.render();
    }

    // --- Custom Lists Logic ---

    openListModal() {
        this.listModal.classList.add('show');
        this.listNameInput.focus();
    }

    closeModal() {
        this.listModal.classList.remove('show');
        this.listNameInput.value = '';
        this.listModalError.textContent = '';
    }

    createList() {
        const name = this.listNameInput.value.trim();
        if (!name) return;
        
        if (this.customLists.some(l => l.name.toLowerCase() === name.toLowerCase())) {
            this.listModalError.textContent = 'List already exists';
            return;
        }

        const newList = {
            id: Date.now(),
            name: name
        };
        
        this.customLists.push(newList);
        this.saveData();
        this.closeModal();
        this.renderCustomLists();
        
        // Switch to new list
        this.setFilter(newList.id);
    }

    renderCustomLists() {
        this.customListsContainer.innerHTML = '';
        this.customLists.forEach(list => {
            const li = document.createElement('li');
            li.className = `nav-item ${this.currentFilter == list.id ? 'active' : ''}`;
            li.id = `list-${list.id}`;
            li.innerHTML = `
                <span class="nav-icon">📂</span>
                <span class="nav-text">${list.name}</span>
                <span class="nav-count">${this.tasks.filter(t => t.listId == list.id && !t.completed).length}</span>
                <button class="delete-btn" style="font-size:0.8rem; margin-left:5px;">×</button>
            `;
            
            // Selection Click
            li.addEventListener('click', (e) => {
                // Determine if delete button was clicked
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                   this.deleteList(list.id, e);
                } else {
                   this.setFilter(list.id);
                   this.toggleSidebar(false);
                }
            });

            this.customListsContainer.appendChild(li);
        });
    }

    deleteList(id, event) {
        event.stopPropagation();
        if (confirm('Delete this list and all its tasks?')) {
            this.customLists = this.customLists.filter(l => l.id !== id);
            // Delete tasks in list
            this.tasks = this.tasks.filter(t => t.listId != id);
            this.saveData();
            
            if (this.currentFilter == id) {
                this.setFilter('all');
            } else {
                this.render();
            }
        }
    }

    updateCounts() {
        const today = new Date().toISOString().split('T')[0];
        
        this.countAll.textContent = this.tasks.filter(t => !t.completed).length;
        this.countToday.textContent = this.tasks.filter(t => t.createdAt.startsWith(today) && !t.completed).length;
        this.countImportant.textContent = this.tasks.filter(t => t.important && !t.completed).length;
        this.countCompleted.textContent = this.tasks.filter(t => t.completed).length;
    }

    // --- Theme ---
    toggleTheme() {
        const isDark = document.body.classList.toggle('dark');
        localStorage.setItem('todohub_theme', isDark ? 'dark' : 'light');
    }

    applyTheme() {
        const theme = localStorage.getItem('todohub_theme');
        if (localStorage.getItem('todohub_theme') === 'dark') {
            document.body.classList.add('dark');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});
