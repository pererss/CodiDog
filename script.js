document.addEventListener("DOMContentLoaded", () => {
    
    // 1. ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК (САЙДБАР)
    const menuItems = document.querySelectorAll(".menu-item");
    const tabs = document.querySelectorAll(".tab-content");

    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            
            // Убираем активный класс у всех кнопок меню
            menuItems.forEach(i => i.classList.remove("active"));
            // Добавляем активный класс нажатой кнопке
            item.classList.add("active");

            // Прячем все вкладки
            tabs.forEach(tab => tab.classList.remove("active"));
            
            // Показываем нужную вкладку
            const targetTab = item.getAttribute("data-tab");
            document.getElementById(`tab-${targetTab}`).classList.add("active");
            
            // Если переключились на редактор — обновляем его размеры
            if (targetTab === "editor" && window.editor) {
                setTimeout(() => window.editor.layout(), 10);
            }
        });
    });

    // 2. ПОД КЛЮЧЕНИЕ НАСТОЯЩЕГО РЕДАКТОРА КОДА (MONACO)
    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
    
    require(['vs/editor/editor.main'], function () {
        // Создаем редактор внутри нашего контейнера
        window.editor = monaco.editor.create(document.getElementById('editor-container'), {
            value: [
                '// Добро пожаловать в CodiDog Workspace!',
                'function initCodiDog() {',
                '    console.log("Пес на страже твоего кода! 🐕‍🦺");',
                '    let projectStatus = "In Progress";',
                '    return projectStatus;',
                '}',
                '',
                'initCodiDog();'
            ].join('\n'),
            language: 'javascript',
            theme: 'vs-dark', // Профессиональная темная тема
            fontSize: 14,
            automaticLayout: true, // Сам подстраивается под размеры экрана
            minimap: { enabled: true } // Карта кода справа
        });
    });

    // 3. ИМИТАЦИЯ КНОПОК ДЛЯТЕСТА
    document.getElementById("add-project-btn").addEventListener("click", () => {
        alert("Здесь мы сделаем красивое всплывающее окно, где ты опишешь свой новый проект, и он добавится на экран!");
    });

    document.getElementById("gh-login").addEventListener("click", () => {
        alert("Тут будет магия Supabase: перенаправление на сайт GitHub и авторизация твоего аккаунта!");
    });
});
