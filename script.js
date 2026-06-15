document.addEventListener("DOMContentLoaded", () => {
    
    // --- STATE / ХРАНИЛИЩЕ СОСТОЯНИЯ ---
    let activeProjectId = null;

    // Инициализация структуры профиля
    if (!localStorage.getItem("codidog_profile")) {
        localStorage.setItem("codidog_profile", JSON.stringify({
            name: "ROOT_USER",
            role: "System Architect",
            avatar: "🖥️"
        }));
    }

    // --- DOM ЭЛЕМЕНТЫ ---
    const sidebar = document.getElementById("sidebar");
    const toggleSidebarBtn = document.getElementById("toggle-sidebar");
    const menuItems = document.querySelectorAll(".menu-item");
    const tabs = document.querySelectorAll(".tab-content");
    const menuEditorTrigger = document.getElementById("menu-editor-trigger");
    
    const modal = document.getElementById("project-modal");
    const openModalBtn = document.getElementById("open-modal-btn");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const cancelFormBtn = document.getElementById("cancel-form-btn");
    const projectForm = document.getElementById("project-form");
    const projectsGrid = document.getElementById("projects-grid");
    const searchInput = document.getElementById("search-projects");
    const projectCountEl = document.getElementById("project-count");
    
    const activeProjectTitle = document.getElementById("active-project-title");
    const editorFileList = document.getElementById("editor-file-list");
    const newFileNameInput = document.getElementById("new-file-name");
    const addFileBtn = document.getElementById("add-file-btn");

    // --- 1. СВОРАЧИВАНИЕ САЙДБАРА ---
    toggleSidebarBtn.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
        if (window.editor) {
            setTimeout(() => window.editor.layout(), 210);
        }
    });

    // --- 2. СИСТЕМА НАВИГАЦИИ ПО ВКЛАДКАМ ---
    function switchTab(targetTabId) {
        menuItems.forEach(item => {
            if (item.getAttribute("data-tab") === targetTabId) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        tabs.forEach(tab => {
            if (tab.id === `tab-${targetTabId}`) {
                tab.classList.add("active");
            } else {
                tab.classList.remove("active");
            }
        });

        if (targetTabId === "editor" && window.editor) {
            setTimeout(() => window.editor.layout(), 10);
        }
    }

    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            switchTab(item.getAttribute("data-tab"));
        });
    });

    // --- 3. РЕДАКТОР КОДА MONACO (ВСТРОЕННЫЙ ДВИЖОК) ---
    let isSettingValue = false; // Флаг предотвращения циклических сохранений

    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], function () {
        window.editor = monaco.editor.create(document.getElementById('editor-container'), {
            value: '// Выберите проект в Хабе для начала кодинга.\n',
            language: 'javascript',
            theme: 'vs-dark',
            fontSize: 13,
            lineHeight: 20,
            automaticLayout: true,
            minimap: { enabled: false } // Отключили карту кода для экономии места
        });

        // Отслеживание изменений в редакторе -> Автосохранение
        window.editor.onDidChangeModelContent(() => {
            if (isSettingValue) return;
            const currentCode = window.editor.getValue();
            updateActiveFileCode(currentCode);
        });
    });

    // --- 4. ОПЕРАЦИИ С ПРОЕКТАМИ (LOCALSTORAGE) ---
    function getProjects() {
        const data = localStorage.getItem("codidog_projects");
        return data ? JSON.parse(data) : [];
    }

    function saveProjects(projects) {
        localStorage.setItem("codidog_projects", JSON.stringify(projects));
        renderProjects();
    }

    function renderProjects(filterText = "") {
        const projects = getProjects();
        projectsGrid.innerHTML = "";
        
        const filtered = projects.filter(p => {
            const query = filterText.toLowerCase();
            return p.name.toLowerCase().includes(query) || p.stack.toLowerCase().includes(query);
        });

        projectCountEl.textContent = filtered.length;
        updateProfileStats(projects.length);

        if (filtered.length === 0) {
            projectsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px; border: 1px dashed var(--border-color); font-size:13px;">Реестр пуст. Инициализируйте первый проект.</div>`;
            return;
        }

        filtered.forEach(p => {
            const card = document.createElement("div");
            card.className = "project-card";
            const tagsHTML = p.stack ? p.stack.split(",").map(t => `<span class="p-tag">${t.trim()}</span>`).join("") : "";
            
            card.innerHTML = `
                <div class="card-top">
                    <div class="card-meta-line">
                        <h2>${p.name}</h2>
                        <span class="badge badge-priority ${p.priority}">${p.priority}</span>
                    </div>
                    <p class="card-desc">${p.desc}</p>
                    <div class="card-tags">${tagsHTML}</div>
                </div>
                <div class="card-footer-line">
                    <span>Платформа: ${p.platform}</span>
                    <span>[ ${p.status} ]</span>
                </div>
            `;
            
            // Вход в проект при клике на карточку
            card.addEventListener("click", () => {
                selectProject(p.id);
            });

            projectsGrid.appendChild(card);
        });
    }

    function selectProject(id) {
        activeProjectId = id;
        const projects = getProjects();
        const project = projects.find(p => p.id === id);
        
        if (project) {
            activeProjectTitle.textContent = project.name;
            renderEditorFileList();
            loadActiveFileIntoEditor();
            switchTab("editor");
        }
    }

    // --- 5. ФАЙЛОВАЯ СИСТЕМА IDE ВНУТРИ ПРОЕКТА ---
    function renderEditorFileList() {
        editorFileList.innerHTML = "";
        if (!activeProjectId) return;

        const projects = getProjects();
        const project = projects.find(p => p.id === activeProjectId);
        if (!project || !project.files) return;

        project.files.forEach((file, index) => {
            const item = document.createElement("div");
            item.className = `file-item ${index === project.activeFileIndex ? 'active' : ''}`;
            
            item.innerHTML = `
                <span>📄 ${file.name}</span>
                <button class="delete-file-btn" data-index="${index}">×</button>
            `;

            // Выбор файла
            item.addEventListener("click", (e) => {
                if (e.target.classList.contains("delete-file-btn")) return;
                project.activeFileIndex = index;
                saveProjects(projects);
                selectProject(activeProjectId);
            });

            // Удаление файла
            item.querySelector(".delete-file-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                if (project.files.length === 1) {
                    alert("В проекте должен оставаться как минимум один файл.");
                    return;
                }
                project.files.splice(index, 1);
                project.activeFileIndex = 0;
                saveProjects(projects);
                selectProject(activeProjectId);
            });

            editorFileList.appendChild(item);
        });
    }

    function loadActiveFileIntoEditor() {
        if (!window.editor || !activeProjectId) return;
        
        const projects = getProjects();
        const project = projects.find(p => p.id === activeProjectId);
        if (!project || !project.files) return;

        const activeFile = project.files[project.activeFileIndex];
        if (activeFile) {
            isSettingValue = true;
            window.editor.setValue(activeFile.content);
            isSettingValue = false;
        }
    }

    function updateActiveFileCode(code) {
        if (!activeProjectId) return;
        const projects = getProjects();
        const project = projects.find(p => p.id === activeProjectId);
        if (project && project.files && project.files[project.activeFileIndex]) {
            project.files[project.activeFileIndex].content = code;
            localStorage.setItem("codidog_projects", JSON.stringify(projects));
        }
    }

    // Добавление нового файла в проект
    addFileBtn.addEventListener("click", () => {
        const name = newFileNameInput.value.trim();
        if (!activeProjectId) {
            alert("Сначала выберите проект в хабе.");
            return;
        }
        if (!name) return;

        const projects = getProjects();
        const project = projects.find(p => p.id === activeProjectId);
        
        // Проверка дубликатов नामों
        if (project.files.some(f => f.name.toLowerCase() === name.toLowerCase())) {
            alert("Файл с таким именем уже существует.");
            return;
        }

        project.files.push({ name: name, content: `// Файл ${name}\n` });
        project.activeFileIndex = project.files.length - 1;
        
        newFileNameInput.value = "";
        saveProjects(projects);
        selectProject(activeProjectId);
    });

    // --- 6. МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ ПРОЕКТА ---
    openModalBtn.addEventListener("click", () => modal.classList.add("active"));
    const closeModal = () => { modal.classList.remove("active"); projectForm.reset(); };
    closeModalBtn.addEventListener("click", closeModal);
    cancelFormBtn.addEventListener("click", closeModal);

    projectForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const newProject = {
            id: Date.now().toString(),
            name: document.getElementById("p-name").value,
            desc: document.getElementById("p-desc").value,
            stack: document.getElementById("p-stack").value,
            platform: document.getElementById("p-platform").value,
            priority: document.getElementById("p-priority").value,
            status: document.getElementById("p-status").value,
            files: [
                { name: "main.js", content: "// Среда CodiDog\nconsole.log('Инициализация успешна');\n" }
            ],
            activeFileIndex: 0
        };

        const currentProjects = getProjects();
        currentProjects.push(newProject);
        saveProjects(currentProjects);
        closeModal();
    });

    searchInput.addEventListener("input", (e) => renderProjects(e.target.value));

    // --- 7. УТИЛИТЫ И ИНСТРУМЕНТЫ (ВАЛИДАТОР И ГЕНЕРАТОР) ---
    // Форматирование JSON
    document.getElementById("btn-format-json").addEventListener("click", () => {
        const rawInput = document.getElementById("json-input").value.trim();
        const outputArea = document.getElementById("json-output");
        if (!rawInput) return;

        try {
            const parsed = JSON.parse(rawInput);
            outputArea.value = JSON.stringify(parsed, null, 4);
            outputArea.style.borderColor = "var(--border-color)";
        } catch (err) {
            outputArea.value = `СИНТАКСИЧЕСКАЯ ОШИБКА JSON:\n${err.message}`;
            outputArea.style.borderColor = "#ff3333";
        }
    });

    // Генератор UUID v4
    document.getElementById("btn-gen-uuid").addEventListener("click", () => {
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        document.getElementById("uuid-output").value = uuid;
    });

    // --- 8. ЛОГИКА УПРАВЛЕНИЯ ЛОКАЛЬНЫМ ПРОФИЛЕМ ---
    const profileForm = document.getElementById("profile-form");
    
    function loadProfileData() {
        const profile = JSON.parse(localStorage.getItem("codidog_profile"));
        
        // Рендеринг на интерфейс
        document.getElementById("prof-display-avatar").textContent = profile.avatar;
        document.getElementById("prof-display-name").textContent = profile.name;
        document.getElementById("prof-display-role").textContent = profile.role;
        
        // Заполнение полей формы ввода
        document.getElementById("input-profile-name").value = profile.name;
        document.getElementById("input-profile-role").value = profile.role;
        document.getElementById("input-profile-avatar").value = profile.avatar;
    }

    function updateProfileStats(count) {
        const totalEl = document.getElementById("stat-total");
        if (totalEl) totalEl.textContent = count;
    }

    profileForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const updatedProfile = {
            name: document.getElementById("input-profile-name").value,
            role: document.getElementById("input-profile-role").value,
            avatar: document.getElementById("input-profile-avatar").value
        };

        localStorage.setItem("codidog_profile", JSON.stringify(updatedProfile));
        loadProfileData();
    });

    // ПЕРВИЧНЫЙ СИНХРОННЫЙ ЗАПУСК
    renderProjects();
    loadProfileData();
});
