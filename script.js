document.addEventListener("DOMContentLoaded", () => {
    
    // --- ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ ---
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
    const statTotalEl = document.getElementById("stat-total");

    // --- 1. СВОРАЧИВАНИЕ САЙДБАРА ---
    toggleSidebarBtn.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
        // Перерисовываем редактор кода, так как область изменилась
        if (window.editor) {
            setTimeout(() => window.editor.layout(), 260);
        }
    });

    // --- 2. ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ---
    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            menuItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            tabs.forEach(tab => tab.classList.remove("active"));
            const targetTab = item.getAttribute("data-tab");
            document.getElementById(`tab-${targetTab}`).classList.add("active");
            
            // Запуск рендеринга Monaco при открытии вкладки редактора
            if (targetTab === "editor" && window.editor) {
                setTimeout(() => window.editor.layout(), 10);
            }
        });
    });

    // --- 3. ИНИЦИАЛИЗАЦИЯ И ПОЛНОЭКРАННЫЙ РЕДАКТОР MONACO ---
    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], function () {
        window.editor = monaco.editor.create(document.getElementById('editor-container'), {
            value: [
                '// ХАБ ИНЖЕНЕРНЫХ РЕШЕНИЙ // CODIDOG CORE',
                '// Локальный редактор открыт на весь экран',
                '',
                'class ProjectCore {',
                '    constructor() {',
                '        this.status = "OFFLINE_MODE";',
                '    }',
                '}'
            ].join('\n'),
            language: 'javascript',
            theme: 'vs-dark', // Базовая темная тема
            fontSize: 14,
            lineHeight: 22,
            automaticLayout: true,
            minimap: { enabled: true }
        });
    });

    // --- 4. ЛОГИКА ХРАНИЛИЩА ПРОЕКТОВ (LOCALSTORAGE) ---
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
            return p.name.toLowerCase().includes(query) || 
                   p.desc.toLowerCase().includes(query) || 
                   p.stack.toLowerCase().includes(query);
        });

        // Обновляем счетчики на панелях
        projectCountEl.textContent = filtered.length;
        if(statTotalEl) statTotalEl.textContent = projects.length;

        if (filtered.length === 0) {
            projectsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px; border: 1px dashed var(--border-color)">Реестр пуст. Добавьте первый проект.</div>`;
            return;
        }

        filtered.forEach((p, index) => {
            const card = document.createElement("div");
            card.className = "project-card";
            
            // Обработка тегов стека
            const tagsHTML = p.stack ? p.stack.split(",").map(t => `<span class="p-tag">${t.trim()}</span>`).join("") : "";
            
            card.innerHTML = `
                <div class="card-top">
                    <div class="card-meta-line">
                        <h2>${p.name}</h2>
                        <span class="badge badge-priority ${p.priority}">${p.priority}</span>
                    </div>
                    <p class="card-desc">${p.desc}</p>
                    ${p.notes ? `<div class="card-notes">${p.notes}</div>` : ''}
                    <div class="card-tags">${tagsHTML}</div>
                </div>
                <div class="card-links">
                    ${p.github ? `<a href="${p.github}" target="_blank" class="gh-link">📁 GitHub Repo</a>` : '<span></span>'}
                    <span class="card-status-text">[ STATUS: ${p.status} ]</span>
                </div>
            `;
            projectsGrid.appendChild(card);
        });
    }

    // --- 5. УПРАВЛЕНИЕ МОДАЛЬНЫМ ОКНОМ ФОРМЫ ---
    openModalBtn.addEventListener("click", () => modal.classList.add("active"));
    
    const closeModal = () => {
        modal.classList.remove("active");
        projectForm.reset();
    };
    
    closeModalBtn.addEventListener("click", closeModal);
    cancelFormBtn.addEventListener("click", closeModal);

    projectForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const newProject = {
            name: document.getElementById("p-name").value,
            desc: document.getElementById("p-desc").value,
            stack: document.getElementById("p-stack").value,
            platform: document.getElementById("p-platform").value,
            priority: document.getElementById("p-priority").value,
            status: document.getElementById("p-status").value,
            github: document.getElementById("p-github").value,
            notes: document.getElementById("p-notes").value
        };

        const currentProjects = getProjects();
        currentProjects.push(newProject);
        saveProjects(currentProjects);
        closeModal();
    });

    // Живой поиск
    searchInput.addEventListener("input", (e) => {
        renderProjects(e.target.value);
    });

    // --- 6. РАБОТА С УТИЛИТАМИ (BASE64) ---
    document.getElementById("btn-encode").addEventListener("click", () => {
        const input = document.getElementById("tool-input").value;
        document.getElementById("tool-output").value = btoa(unescape(encodeURIComponent(input)));
    });

    document.getElementById("btn-decode").addEventListener("click", () => {
        const input = document.getElementById("tool-input").value;
        try {
            document.getElementById("tool-output").value = decodeURIComponent(escape(atob(input)));
        } catch(err) {
            document.getElementById("tool-output").value = "Ошибка декодирования: невалидный Base64";
        }
    });

    // Первый запуск рендеринга данных из браузера
    renderProjects();
});
