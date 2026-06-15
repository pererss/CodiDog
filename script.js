document.addEventListener("DOMContentLoaded", () => {
    
    // --- СОСТОЯНИЕ (STATE) ---
    let activeProjectId = null;
    let isResizing = false;
    let autoSaveIntervalId = null;

    // ПЕРВИЧНАЯ ИНИЦИАЛИЗАЦИЯ КЭША БРАУЗЕРА
    if (!localStorage.getItem("codidog_profile")) {
        localStorage.setItem("codidog_profile", JSON.stringify({ name: "DEV_USER", role: "Software Engineer", avatar: "🖥️" }));
    }
    if (!localStorage.getItem("codidog_settings")) {
        localStorage.setItem("codidog_settings", JSON.stringify({
            fontSize: 13, wordWrap: "on", lineNumbers: "on", minimap: "hide", tabSize: 4, density: "comfortable", autosaveTime: "60000", logging: "active", defaultPriority: "MEDIUM"
        }));
    }

    // --- DOM СВЯЗИ ---
    const sidebar = document.getElementById("sidebar");
    const toggleSidebarBtn = document.getElementById("toggle-sidebar");
    const menuItems = document.querySelectorAll(".menu-item");
    const tabs = document.querySelectorAll(".tab-content");
    
    const modal = document.getElementById("project-modal");
    const openModalBtn = document.getElementById("open-modal-btn");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const cancelFormBtn = document.getElementById("cancel-form-btn");
    const projectForm = document.getElementById("project-form");
    const projectsGrid = document.getElementById("projects-grid");
    const searchInput = document.getElementById("search-projects");
    const projectCountEl = document.getElementById("project-count");

    // Панель спецификации проекта
    const editProjectForm = document.getElementById("edit-project-form");
    const detTitle = document.getElementById("det-title");
    const detDesc = document.getElementById("det-desc");
    const detStack = document.getElementById("det-stack");
    const detPlatform = document.getElementById("det-platform");
    const detPriority = document.getElementById("det-priority");
    const detStatus = document.getElementById("det-status");
    const detNotes = document.getElementById("det-notes");
    const detOpenEditorBtn = document.getElementById("det-open-editor-btn");
    const deleteProjectBtn = document.getElementById("delete-project-btn");

    // IDE Слайдер и файлы
    const leftPane = document.getElementById("editor-left-pane");
    const resizer = document.getElementById("editor-resizer");
    const activeProjectTitle = document.getElementById("active-project-title");
    const editorFileList = document.getElementById("editor-file-list");
    const newFileNameInput = document.getElementById("new-file-name");
    const addFileBtn = document.getElementById("add-file-btn");

    // Kanban элементы
    const newTaskText = document.getElementById("new-task-text");
    const addTaskBtn = document.getElementById("add-task-btn");

    // --- СВОРАЧИВАНИЕ МЕНЮ ---
    toggleSidebarBtn.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
        triggerEditorLayout();
    });

    // --- СИСТЕМА НАВИГАЦИИ ПО ТАБАМ ---
    function switchTab(targetTabId) {
        menuItems.forEach(i => i.getAttribute("data-tab") === targetTabId ? i.classList.add("active") : i.classList.remove("active"));
        tabs.forEach(t => t.id === `tab-${targetTabId}` ? t.classList.add("active") : t.classList.remove("active"));
        if (targetTabId === "editor") triggerEditorLayout();
    }

    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            switchTab(item.getAttribute("data-tab"));
        });
    });

    document.getElementById("back-to-hub").addEventListener("click", () => switchTab("hub"));

    // --- ИЗМЕНЯЕМЫЙ РАЗМЕР ПАНЕЛЕЙ (DRAGGABLE SPLITTER) ---
    resizer.addEventListener("mousedown", (e) => {
        isResizing = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", (e) => {
        if (!isResizing) return;
        let offsetLeft = e.clientX - sidebar.offsetWidth;
        if (offsetLeft > 100 && offsetLeft < 500) {
            leftPane.style.width = `${offsetLeft}px`;
        }
    });

    document.addEventListener("mouseup", () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = "default";
            document.body.style.userSelect = "auto";
            triggerEditorLayout();
        }
    });

    function triggerEditorLayout() {
        if (window.editor) setTimeout(() => window.editor.layout(), 50);
    }

    // --- КОРНЕВОЙ ДВИЖОК РЕДАКТОРА MONACO ---
    let isSettingCodeValue = false;
    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], function () {
        const config = JSON.parse(localStorage.getItem("codidog_settings"));
        window.editor = monaco.editor.create(document.getElementById('editor-container'), {
            value: '// Выберите или создайте инженерный юнит в Хабе.\n',
            language: 'javascript',
            theme: 'vs-dark',
            fontSize: parseInt(config.fontSize),
            wordWrap: config.wordWrap,
            lineNumbers: config.lineNumbers,
            tabSize: parseInt(config.tabSize),
            minimap: { enabled: config.minimap === "show" },
            automaticLayout: false
        });

        window.editor.onDidChangeModelContent(() => {
            if (isSettingCodeValue) return;
            updateActiveFileContent(window.editor.getValue());
        });
    });

    // --- ИНТЕГРАЦИЯ С ХРАНИЛИЩЕМ (PROJECTS ENGINE) ---
    function getProjects() { return JSON.parse(localStorage.getItem("codidog_projects")) || []; }
    function saveProjects(projects) { localStorage.setItem("codidog_projects", JSON.stringify(projects)); renderProjects(); }

    function renderProjects(filter = "") {
        const projects = getProjects();
        projectsGrid.innerHTML = "";
        const filtered = projects.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || p.stack.toLowerCase().includes(filter.toLowerCase()));
        
        projectCountEl.textContent = filtered.length;

        if (!filtered.length) {
            projectsGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:30px; border:1px dashed var(--border-color); font-size:13px;">Реестр чист. Инициализируйте единицу.</div>`;
            return;
        }

        filtered.forEach(p => {
            const card = document.createElement("div");
            card.className = "project-card";
            const tags = p.stack ? p.stack.split(",").map(t => `<span class="p-tag">${t.trim()}</span>`).join("") : "";
            card.innerHTML = `
                <div class="card-top">
                    <div class="card-meta-line"><h2>${p.name}</h2><span class="badge badge-priority ${p.priority}">${p.priority}</span></div>
                    <p class="card-desc">${p.desc}</p><div class="card-tags">${tags}</div>
                </div>
                <div class="card-footer-line"><span>${p.platform}</span><span>[ ${p.status} ]</span></div>
            `;
            card.addEventListener("click", () => openProjectSpecification(p.id));
            projectsGrid.appendChild(card);
        });
    }

    // --- ЭКРАН 1.5: СТРАНИЦА СПЕЦИФИКАЦИИ И ИЗМЕНЕНИЯ ПРОЕКТА ---
    function openProjectSpecification(id) {
        activeProjectId = id;
        const p = getProjects().find(proj => proj.id === id);
        if (!p) return;

        detTitle.textContent = p.name.toUpperCase();
        detDesc.value = p.desc;
        detStack.value = p.stack;
        detPlatform.value = p.platform;
        detPriority.value = p.priority;
        detStatus.value = p.status;
        detNotes.value = p.notes || "";

        renderKanban();
        switchTab("project-detail");
    }

    editProjectForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const projects = getProjects();
        const idx = projects.findIndex(p => p.id === activeProjectId);
        if (idx === -1) return;

        projects[idx].desc = detDesc.value;
        projects[idx].stack = detStack.value;
        projects[idx].platform = detPlatform.value;
        projects[idx].priority = detPriority.value;
        projects[idx].status = detStatus.value;
        projects[idx].notes = detNotes.value;

        saveProjects(projects);
        logSystem("Спецификация проекта успешно обновлена.");
    });

    deleteProjectBtn.addEventListener("click", () => {
        if (!confirm("Удалить проект окончательно? Восстановление невозможно.")) return;
        const projects = getProjects().filter(p => p.id !== activeProjectId);
        saveProjects(projects);
        switchTab("hub");
    });

    detOpenEditorBtn.addEventListener("click", () => {
        if (!activeProjectId) return;
        const p = getProjects().find(proj => proj.id === activeProjectId);
        activeProjectTitle.textContent = p.name;
        renderFileList();
        loadActiveFileCode();
        switchTab("editor");
    });

    // --- ВНУТРЕННЯЯ IDE СТРУКТУРА ФАЙЛОВ ---
    function renderFileList() {
        editorFileList.innerHTML = "";
        const p = getProjects().find(proj => proj.id === activeProjectId);
        if (!p || !p.files) return;

        p.files.forEach((file, idx) => {
            const item = document.createElement("div");
            item.className = `file-item ${idx === p.activeFileIndex ? 'active' : ''}`;
            item.innerHTML = `<span>📄 ${file.name}</span><button class="delete-file-btn" data-idx="${idx}">×</button>`;
            
            item.addEventListener("click", (e) => {
                if (e.target.classList.contains("delete-file-btn")) return;
                const projects = getProjects();
                projects.find(proj => proj.id === activeProjectId).activeFileIndex = idx;
                localStorage.setItem("codidog_projects", JSON.stringify(projects));
                renderFileList();
                loadActiveFileCode();
            });

            item.querySelector(".delete-file-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                const projects = getProjects();
                const curP = projects.find(proj => proj.id === activeProjectId);
                if (curP.files.length === 1) return alert("Нельзя удалить единственный файл.");
                curP.files.splice(idx, 1);
                curP.activeFileIndex = 0;
                localStorage.setItem("codidog_projects", JSON.stringify(projects));
                renderFileList();
                loadActiveFileCode();
            });

            editorFileList.appendChild(item);
        });
    }

    function loadActiveFileCode() {
        if (!window.editor || !activeProjectId) return;
        const p = getProjects().find(proj => proj.id === activeProjectId);
        if (!p) return;
        const f = p.files[p.activeFileIndex || 0];
        if (f) {
            isSettingCodeValue = true;
            window.editor.setValue(f.content);
            isSettingCodeValue = false;
        }
    }

    function updateActiveFileContent(text) {
        if (!activeProjectId) return;
        const projects = getProjects();
        const p = projects.find(proj => proj.id === activeProjectId);
        if (p && p.files[p.activeFileIndex]) {
            p.files[p.activeFileIndex].content = text;
            localStorage.setItem("codidog_projects", JSON.stringify(projects));
        }
    }

    addFileBtn.addEventListener("click", () => {
        const name = newFileNameInput.value.trim();
        if (!name || !activeProjectId) return;
        const projects = getProjects();
        const p = projects.find(proj => proj.id === activeProjectId);
        if (p.files.some(f => f.name.toLowerCase() === name.toLowerCase())) return alert("Файл существует.");
        
        p.files.push({ name: name, content: `// Module ${name}\n` });
        p.activeFileIndex = p.files.length - 1;
        newFileNameInput.value = "";
        localStorage.setItem("codidog_projects", JSON.stringify(projects));
        renderFileList();
        loadActiveFileCode();
    });

    // --- МОДАЛКА: НОВЫЙ ПРОЕКТ ---
    openModalBtn.addEventListener("click", () => modal.classList.add("active"));
    const closeM = () => { modal.classList.remove("active"); projectForm.reset(); };
    closeModalBtn.addEventListener("click", closeM);
    cancelFormBtn.addEventListener("click", closeM);

    projectForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const config = JSON.parse(localStorage.getItem("codidog_settings"));
        const newP = {
            id: Date.now().toString(),
            name: document.getElementById("p-name").value,
            desc: document.getElementById("p-desc").value,
            stack: document.getElementById("p-stack").value,
            platform: document.getElementById("p-platform").value,
            priority: document.getElementById("p-priority").value || config.defaultPriority,
            status: document.getElementById("p-status").value,
            notes: document.getElementById("p-notes").value,
            files: [{ name: "index.js", content: "// Initialized by CodiDog Hub\nconsole.log('Core Engine Online');\n" }],
            activeFileIndex: 0,
            tasks: []
        };
        const projs = getProjects();
        projs.push(newP);
        saveProjects(projs);
        closeM();
    });

    searchInput.addEventListener("input", (e) => renderProjects(e.target.value));

    // --- ИНСТРУМЕНТ ОТ AI: СИСТЕМА КАНБАН (ЗАДАЧИ ВНУТРИ ПРОЕКТА) ---
    function renderKanban() {
        const p = getProjects().find(proj => proj.id === activeProjectId);
        document.getElementById("tasks-todo").innerHTML = "";
        document.getElementById("tasks-progress").innerHTML = "";
        document.getElementById("tasks-done").innerHTML = "";
        if (!p || !p.tasks) return;

        p.tasks.forEach((t) => {
            const card = document.createElement("div");
            card.className = "task-item";
            let actions = "";
            if (t.status === "todo") actions = `<button class="task-btn" onclick="moveTask('${t.id}', 'progress')">В работу →</button>`;
            if (t.status === "progress") actions = `<button class="task-btn" onclick="moveTask('${t.id}', 'done')">Готово ✓</button>`;
            if (t.status === "done") actions = `<span style="color:var(--text-muted)">Завершено</span>`;

            card.innerHTML = `<div>${t.text}</div><div class="task-actions">${actions}<button class="task-btn" style="color:#ff5555" onclick="deleteTask('${t.id}')">×</button></div>`;
            document.getElementById(`tasks-${t.status}`).appendChild(card);
        });
    }

    addTaskBtn.addEventListener("click", () => {
        const text = newTaskText.value.trim();
        if (!text) return;
        const projects = getProjects();
        const p = projects.find(proj => proj.id === activeProjectId);
        if (!p.tasks) p.tasks = [];
        p.tasks.push({ id: Date.now().toString(), text: text, status: "todo" });
        localStorage.setItem("codidog_projects", JSON.stringify(projects));
        newTaskText.value = "";
        renderKanban();
    });

    window.moveTask = function(taskId, newStatus) {
        const projects = getProjects();
        const p = projects.find(proj => proj.id === activeProjectId);
        const task = p.tasks.find(t => t.id === taskId);
        if (task) task.status = newStatus;
        localStorage.setItem("codidog_projects", JSON.stringify(projects));
        renderKanban();
    };

    window.deleteTask = function(taskId) {
        const projects = getProjects();
        const p = projects.find(proj => proj.id === activeProjectId);
        p.tasks = p.tasks.filter(t => t.id !== taskId);
        localStorage.setItem("codidog_projects", JSON.stringify(projects));
        renderKanban();
    };

    // --- ПАК ПРОФЕССИОНАЛЬНЫХ ИНСТРУМЕНТОВ РАЗРАБОТЧИКА ---
    // JSON
    document.getElementById("btn-format-json").addEventListener("click", () => {
        const areaIn = document.getElementById("json-input");
        const areaOut = document.getElementById("json-output");
        try {
            areaOut.value = JSON.stringify(JSON.parse(areaIn.value.trim()), null, 4);
            areaOut.style.borderColor = "var(--border-color)";
        } catch (e) {
            areaOut.value = `Синтаксический сбой:\n${e.message}`;
            areaOut.style.borderColor = "#ff4444";
        }
    });

    // Base64 & URL Codecs
    const cIn = document.getElementById("codec-input");
    const cOut = document.getElementById("codec-output");
    document.getElementById("btn-b64-enc").addEventListener("click", () => cOut.value = btoa(unescape(encodeURIComponent(cIn.value))));
    document.getElementById("btn-b64-dec").addEventListener("click", () => { try { cOut.value = decodeURIComponent(escape(atob(cIn.value))); } catch { cOut.value = "Ошибка декодирования!"; }});
    document.getElementById("btn-url-enc").addEventListener("click", () => cOut.value = encodeURIComponent(cIn.value));
    document.getElementById("btn-url-dec").addEventListener("click", () => cOut.value = decodeURIComponent(cIn.value));

    // UUID
    document.getElementById("btn-gen-uuid").addEventListener("click", () => {
        document.getElementById("uuid-output").value = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0; return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    });

    // JWT Decoder
    document.getElementById("btn-decode-jwt").addEventListener("click", () => {
        const token = document.getElementById("jwt-input").value.trim();
        const jwtOut = document.getElementById("jwt-output");
        try {
            const parts = token.split('.');
            if(parts.length !== 3) throw new Error("Невалидный формат токена");
            jwtOut.value = JSON.stringify(JSON.parse(decodeURIComponent(escape(atob(parts[1])))), null, 4);
        } catch(e) {
            jwtOut.value = `Ошибка чтения структуры JWT токена.`;
        }
    });

    // --- КОНФИГУРАТОР НАСТРОЕК (10 ПАРАМЕТРОВ НА ЛЕТУ) ---
    function syncSettingsUI() {
        const c = JSON.parse(localStorage.getItem("codidog_settings"));
        document.getElementById("sett-font-size").value = c.fontSize;
        document.getElementById("sett-word-wrap").value = c.wordWrap;
        document.getElementById("sett-line-numbers").value = c.lineNumbers;
        document.getElementById("sett-minimap").value = c.minimap;
        document.getElementById("sett-tab-size").value = c.tabSize;
        document.getElementById("sett-density").value = c.density;
        document.getElementById("sett-autosave-time").value = c.autosaveTime;
        document.getElementById("sett-logging").value = c.logging;
        document.getElementById("sett-default-priority").value = c.defaultPriority;

        // Плотность верстки
        document.body.className = c.density;
        
        // Переинициализация таймера автосохранения
        setupAutoSaveTimer(parseInt(c.autosaveTime));
    }

    function readAndSaveSettings() {
        const newC = {
            fontSize: document.getElementById("sett-font-size").value,
            wordWrap: document.getElementById("sett-word-wrap").value,
            lineNumbers: document.getElementById("sett-line-numbers").value,
            minimap: document.getElementById("sett-minimap").value,
            tabSize: document.getElementById("sett-tab-size").value,
            density: document.getElementById("sett-density").value,
            autosaveTime: document.getElementById("sett-autosave-time").value,
            logging: document.getElementById("sett-logging").value,
            defaultPriority: document.getElementById("sett-default-priority").value
        };
        localStorage.setItem("codidog_settings", JSON.stringify(newC));
        syncSettingsUI();

        // Передача параметров внутрь Monaco Editor
        if (window.editor) {
            window.editor.updateOptions({
                fontSize: parseInt(newC.fontSize),
                wordWrap: newC.wordWrap,
                lineNumbers: newC.lineNumbers,
                tabSize: parseInt(newC.tabSize),
                minimap: { enabled: newC.minimap === "show" }
            });
        }
        logSystem("Настройки ядра изменены и применены.");
    }

    const settingsInputs = ["sett-font-size", "sett-word-wrap", "sett-line-numbers", "sett-minimap", "sett-tab-size", "sett-density", "sett-autosave-time", "sett-logging", "sett-default-priority"];
    settingsInputs.forEach(id => document.getElementById(id).addEventListener("change", readAndSaveSettings));

    document.getElementById("btn-clear-storage").addEventListener("click", () => {
        if(confirm("Полностью стереть локальную базу данных?")) {
            localStorage.clear();
            window.location.reload();
        }
    });

    // --- ФОНОВОЕ АВТОСОХРАНЕНИЕ ПО ХРОНОМЕТРАЖУ ---
    function setupAutoSaveTimer(ms) {
        if(autoSaveIntervalId) clearInterval(autoSaveIntervalId);
        autoSaveIntervalId = setInterval(() => {
            if(activeProjectId && window.editor) {
                updateActiveFileContent(window.editor.getValue());
            }
            const footerStatus = document.getElementById("sys-status");
            footerStatus.textContent = "[AUTOSAVE: OK]";
            setTimeout(() => footerStatus.textContent = "SYS: ACTIVE", 2500);
            logSystem("Фоновое ежеминутное автосохранение выполнено.");
        }, ms);
    }

    // --- ПРОФИЛЬ И СИСТЕМНОЕ ЛОГИРОВАНИЕ ---
    const profileForm = document.getElementById("profile-form");
    function loadProfile() {
        const p = JSON.parse(localStorage.getItem("codidog_profile"));
        document.getElementById("prof-display-avatar").textContent = p.avatar;
        document.getElementById("prof-display-name").textContent = p.name;
        document.getElementById("prof-display-role").textContent = p.role;
        document.getElementById("input-profile-name").value = p.name;
        document.getElementById("input-profile-role").value = p.role;
        document.getElementById("input-profile-avatar").value = p.avatar;
    }

    profileForm.addEventListener("submit", (e) => {
        e.preventDefault();
        localStorage.setItem("codidog_profile", JSON.stringify({
            name: document.getElementById("input-profile-name").value,
            role: document.getElementById("input-profile-role").value,
            avatar: document.getElementById("input-profile-avatar").value
        }));
        loadProfile();
        logSystem("Профиль обновлен.");
    });

    function logSystem(msg) {
        const c = JSON.parse(localStorage.getItem("codidog_settings"));
        if(c && c.logging === "active") console.log(`[CODIDOG_SYS]: ${msg}`);
    }

    // ПЕРВЫЙ ЗАПУСК
    renderProjects();
    loadProfile();
    syncSettingsUI();
});
