document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const recipeList = document.getElementById('recipe-list');
    const emptyState = document.getElementById('empty-state');
    const addBtn = document.getElementById('add-btn');
    const addModal = document.getElementById('add-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const recipeForm = document.getElementById('recipe-form');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const statusFilter = document.getElementById('status-filter');
    const toast = document.getElementById('toast');

    // Settings & Import/Export Elements
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');
    const settingsOverlay = document.getElementById('settings-overlay');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');

    // State
    let recipes = [];
    let currentCategory = 'すべて';
    let currentStatus = 'すべて';
    let editingId = null; // 編集中の料理IDを保持

    // Initialize
    loadRecipes();
    renderRecipes();

    // Event Listeners
    addBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    // Settings Event Listeners
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeSettingsModal);
    }

    if (settingsOverlay) {
        settingsOverlay.addEventListener('click', closeSettingsModal);
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }

    if (importBtn && importFile) {
        importBtn.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', importData);
    }

    recipeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveRecipe();
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabBtns.forEach(b => b.classList.remove('active'));
            const target = e.target;
            target.classList.add('active');
            currentCategory = target.dataset.category;
            renderRecipes();
        });
    });

    statusFilter.addEventListener('change', (e) => {
        currentStatus = e.target.value;
        renderRecipes();
    });

    // Functions
    function loadRecipes() {
        const stored = localStorage.getItem('recipeStockDB');
        if (stored) {
            try {
                recipes = JSON.parse(stored);
            } catch (e) {
                recipes = [];
            }
        }
    }

    function persistRecipes() {
        localStorage.setItem('recipeStockDB', JSON.stringify(recipes));
    }

    function openModal() {
        addModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // 背景スクロール防止（iOS対応）
    }

    function closeModal() {
        addModal.classList.remove('active');
        document.body.style.overflow = '';
        recipeForm.reset();
        editingId = null;
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) modalTitle.textContent = '新しい料理を登録';
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    function closeSettingsModal() {
        if (settingsModal) {
            settingsModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    function exportData() {
        const dataStr = JSON.stringify(recipes);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date();
        const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
        a.download = `recipe-stock-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('データを書き出しました。');
        closeSettingsModal();
    }

    function importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                const importedData = JSON.parse(event.target.result);
                if (!Array.isArray(importedData)) throw new Error('Invalid format');

                let addedCount = 0;
                const existingIds = recipes.map(r => r.id);

                importedData.forEach(importedRecipe => {
                    if (!existingIds.includes(importedRecipe.id)) {
                        recipes.push(importedRecipe);
                        addedCount++;
                    }
                });

                recipes.sort((a, b) => {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });

                persistRecipes();
                renderRecipes();

                showToast(`${addedCount}件の料理を読み込みました！`);
                closeSettingsModal();
            } catch (err) {
                alert('ファイルの読み込みに失敗しました。正しいデータファイルを選択してください。');
            }

            importFile.value = '';
        };
        reader.readAsText(file);
    }

    function saveRecipe() {
        const title = document.getElementById('recipe-name').value.trim();
        const category = document.getElementById('recipe-category').value;
        const status = document.getElementById('recipe-status').value;
        const protein = document.getElementById('recipe-protein').value.trim();
        const url1 = document.getElementById('recipe-url1').value.trim();
        const url2 = document.getElementById('recipe-url2').value.trim();
        const url3 = document.getElementById('recipe-url3').value.trim();
        const memo = document.getElementById('recipe-memo').value.trim();

        if (!title) return;

        if (editingId) {
            // 既存のデータを更新
            const index = recipes.findIndex(r => r.id === editingId);
            if (index !== -1) {
                recipes[index] = {
                    ...recipes[index],
                    title,
                    category,
                    status,
                    protein,
                    urls: [url1, url2, url3].filter(u => u !== ""),
                    memo
                };
            }
            editingId = null;
            const modalTitle = document.getElementById('modal-title');
            if (modalTitle) modalTitle.textContent = '新しい料理を登録';
            showToast('料理を更新しました！');
        } else {
            // 新規追加
            const newRecipe = {
                id: Date.now().toString(),
                title,
                category,
                status,
                protein,
                urls: [url1, url2, url3].filter(u => u !== ""),
                memo,
                createdAt: new Date().toISOString()
            };
            recipes.unshift(newRecipe);
            showToast('料理を登録しました！');
        }

        persistRecipes();
        renderRecipes();
        closeModal();
    }

    window.deleteRecipe = function (id) {
        if (confirm('この料理を削除してもよろしいですか？')) {
            recipes = recipes.filter(r => r.id !== id);
            persistRecipes();
            renderRecipes();
            showToast('削除しました。');
        }
    }

    window.editRecipe = function (id) {
        const recipe = recipes.find(r => r.id === id);
        if (!recipe) return;

        editingId = id;
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) modalTitle.textContent = '料理を編集';

        document.getElementById('recipe-name').value = recipe.title || '';
        document.getElementById('recipe-category').value = recipe.category || '肉料理';
        document.getElementById('recipe-status').value = recipe.status || '作る候補';
        document.getElementById('recipe-protein').value = recipe.protein || '';
        document.getElementById('recipe-url1').value = (recipe.urls && recipe.urls[0]) ? recipe.urls[0] : (recipe.url || '');
        document.getElementById('recipe-url2').value = (recipe.urls && recipe.urls[1]) ? recipe.urls[1] : '';
        document.getElementById('recipe-url3').value = (recipe.urls && recipe.urls[2]) ? recipe.urls[2] : '';
        document.getElementById('recipe-memo').value = recipe.memo || '';

        openModal();
    }

    function getCategoryEmoji(cat) {
        switch (cat) {
            case '肉料理': return '🍖';
            case '魚料理': return '🐟';
            case '副菜': return '🥗';
            case '汁物': return '🍲';
            case '麺類': return '🍜';
            default: return ''; // 過去の「主菜」などは絵文字なし
        }
    }

    function renderRecipes() {
        const filtered = recipes.filter(r => {
            // "すべて" の場合は全て表示、それ以外は一致するもの
            const matchCategory = currentCategory === 'すべて' || r.category === currentCategory;
            const matchStatus = currentStatus === 'すべて' || r.status === currentStatus;
            return matchCategory && matchStatus;
        });

        recipeList.innerHTML = '';

        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');

            filtered.forEach(r => {
                const card = document.createElement('div');
                card.className = 'recipe-card';

                // 複数URLの表示処理
                let urlsHtml = '';
                let recipeUrls = r.urls || [];
                // 過去データ等で単一urlとして保存されていた場合の互換対応
                if (r.url && recipeUrls.length === 0) {
                    recipeUrls = [r.url];
                }

                if (recipeUrls.length > 0) {
                    urlsHtml = '<div class="recipe-urls-container">';
                    recipeUrls.forEach((u, index) => {
                        // URLが1つの場合は「レシピを見る」、複数の場合は「レシピ 1」などの表記
                        const labelText = recipeUrls.length === 1 ? 'レシピを見る' : `レシピ ${index + 1}`;
                        urlsHtml += `
                        <a href="${u}" target="_blank" rel="noopener noreferrer" class="recipe-url">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                            ${labelText}
                        </a>
                        `;
                    });
                    urlsHtml += '</div>';
                }

                let proteinHtml = '';
                if (r.protein) {
                    proteinHtml = `<div class="recipe-protein">💪 たんぱく量目安: ${r.protein}g</div>`;
                }

                let memoHtml = '';
                if (r.memo) {
                    memoHtml = `<div class="recipe-memo">${r.memo.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
                }

                // カテゴリ表示用（絵文字付き）
                const emoji = getCategoryEmoji(r.category);
                const displayCategory = emoji ? `${r.category}${emoji}` : r.category;

                card.innerHTML = `
                    <div class="card-header">
                        <div style="flex: 1; padding-right: 12px;">
                            <h3 class="recipe-title">${r.title.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</h3>
                            <div class="recipe-badges">
                                <span class="badge badge-category" data-cat="${r.category}">${displayCategory}</span>
                                <span class="badge badge-status" data-stat="${r.status}">${r.status}</span>
                            </div>
                            ${urlsHtml}
                            ${proteinHtml}
                        </div>
                        <div style="display: flex; gap: 4px;">
                            <button class="edit-btn" onclick="editRecipe('${r.id}')" aria-label="編集">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                            <button class="delete-btn" onclick="deleteRecipe('${r.id}')" aria-label="削除">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    ${memoHtml}
                `;
                recipeList.appendChild(card);
            });
        }
    }
});
