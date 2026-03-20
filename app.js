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

    // Photo Elements
    const photoInput = document.getElementById('photo-input');
    const addPhotoBtn = document.getElementById('add-photo-btn');
    const photoPreviewContainer = document.getElementById('photo-preview-container');
    const lightbox = document.getElementById('photo-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');

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
    let currentPhotos = []; // 現在フォームに添付されている写真(Base64)の配列

    // Initialize
    loadRecipes();
    renderRecipes();

    // Event Listeners
    addBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    // Photo Event Listeners
    if (addPhotoBtn) {
        addPhotoBtn.addEventListener('click', () => {
            if (currentPhotos.length >= 3) {
                showToast('写真は最大3枚までです');
                return;
            }
            photoInput.click();
        });
    }

    if (photoInput) {
        photoInput.addEventListener('change', handlePhotoSelect);
    }

    if (lightbox) {
        lightbox.addEventListener('click', () => {
            lightbox.classList.remove('active');
        });
    }

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

    // CSV / Text Export Event Listeners
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const exportTxtBtn = document.getElementById('export-txt-btn');

    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportCSV);
    }
    if (exportTxtBtn) {
        exportTxtBtn.addEventListener('click', exportText);
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
        currentPhotos = [];
        renderPhotoPreview();
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

    function getDateStr() {
        const date = new Date();
        return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    }

    function csvEscape(val) {
        if (val == null) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }

    function exportCSV() {
        if (recipes.length === 0) {
            showToast('出力するデータがありません');
            return;
        }

        const header = ['料理名', '大項目', '分類', 'たんぱく量(g)', 'URL1', 'URL2', 'URL3', 'メモ', '登録日'];
        const rows = recipes.map(r => {
            const urls = r.urls || (r.url ? [r.url] : []);
            const createdDate = r.createdAt ? new Date(r.createdAt).toLocaleDateString('ja-JP') : '';
            return [
                csvEscape(r.title),
                csvEscape(r.category),
                csvEscape(r.status),
                csvEscape(r.protein || ''),
                csvEscape(urls[0] || ''),
                csvEscape(urls[1] || ''),
                csvEscape(urls[2] || ''),
                csvEscape(r.memo || ''),
                csvEscape(createdDate)
            ].join(',');
        });

        // BOM付きUTF-8でExcelの文字化けを防止
        const bom = '\uFEFF';
        const csvContent = bom + header.join(',') + '\n' + rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `料理ストック-${getDateStr()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('CSVを出力しました');
        closeSettingsModal();
    }

    function exportText() {
        if (recipes.length === 0) {
            showToast('出力するデータがありません');
            return;
        }

        let text = '=== 料理ストック データ一覧 ===\n';
        text += `出力日: ${new Date().toLocaleDateString('ja-JP')}\n`;
        text += `登録数: ${recipes.length}件\n`;
        text += '\n' + '='.repeat(40) + '\n\n';

        recipes.forEach((r, i) => {
            const urls = r.urls || (r.url ? [r.url] : []);
            const createdDate = r.createdAt ? new Date(r.createdAt).toLocaleDateString('ja-JP') : '不明';

            text += `[▄ ${i + 1}] ${r.title}\n`;
            text += `  大項目: ${r.category || '-'}\n`;
            text += `  分類  : ${r.status || '-'}\n`;
            if (r.protein) text += `  たんぱく量: ${r.protein}g\n`;
            if (urls.length > 0) {
                urls.forEach((u, idx) => {
                    text += `  URL${idx + 1} : ${u}\n`;
                });
            }
            if (r.memo) text += `  メモ  : ${r.memo}\n`;
            if (r.photos && r.photos.length > 0) text += `  写真  : ${r.photos.length}枚添付\n`;
            text += `  登録日: ${createdDate}\n`;
            text += '-'.repeat(40) + '\n';
        });

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `料理ストック-${getDateStr()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('テキストを出力しました');
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

    // ========== Photo Functions ==========

    function compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.onload = function () {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                    resolve(dataUrl);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function handlePhotoSelect(e) {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const remaining = 3 - currentPhotos.length;
        if (remaining <= 0) {
            showToast('写真は最大3枚までです');
            photoInput.value = '';
            return;
        }

        const filesToProcess = files.slice(0, remaining);
        if (files.length > remaining) {
            showToast(`${remaining}枚まで追加できます`);
        }

        for (const file of filesToProcess) {
            try {
                const base64 = await compressImage(file);
                currentPhotos.push(base64);
            } catch (err) {
                console.error('画像の圧縮に失敗:', err);
            }
        }

        renderPhotoPreview();
        photoInput.value = '';
    }

    function renderPhotoPreview() {
        if (!photoPreviewContainer) return;
        photoPreviewContainer.innerHTML = '';

        currentPhotos.forEach((dataUrl, index) => {
            const item = document.createElement('div');
            item.className = 'photo-preview-item';
            item.innerHTML = `
                <img src="${dataUrl}" alt="写真${index + 1}">
                <button type="button" class="photo-remove-btn" data-index="${index}">&times;</button>
            `;
            photoPreviewContainer.appendChild(item);
        });

        // 削除ボタンのイベント
        photoPreviewContainer.querySelectorAll('.photo-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                currentPhotos.splice(idx, 1);
                renderPhotoPreview();
            });
        });

        // 3枚に達したらボタンを非表示
        if (addPhotoBtn) {
            addPhotoBtn.style.display = currentPhotos.length >= 3 ? 'none' : '';
        }
    }

    // ライトボックスで写真を拡大表示
    window.openLightbox = function (src) {
        if (lightbox && lightboxImg) {
            lightboxImg.src = src;
            lightbox.classList.add('active');
        }
    }

    // ========== Save Recipe ==========

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
                    memo,
                    photos: [...currentPhotos]
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
                photos: [...currentPhotos],
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

        // 既存の写真を復元
        currentPhotos = recipe.photos ? [...recipe.photos] : [];
        renderPhotoPreview();

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

                // 写真サムネイルの表示
                let photosHtml = '';
                if (r.photos && r.photos.length > 0) {
                    photosHtml = '<div class="recipe-photos">';
                    r.photos.forEach(photoSrc => {
                        photosHtml += `<img src="${photoSrc}" class="recipe-photo-thumb" alt="料理写真">`;
                    });
                    photosHtml += '</div>';
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
                    ${photosHtml}
                    ${memoHtml}
                `;
                recipeList.appendChild(card);
            });
        }

        // サムネイルクリックのイベントデリゲーション
        recipeList.addEventListener('click', function (e) {
            const thumb = e.target.closest('.recipe-photo-thumb');
            if (thumb) {
                openLightbox(thumb.src);
            }
        });
    }
});
