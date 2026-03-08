let selectedFiles = [];
let currentResults = null;
let currentPageIndex = 0;
let currentSessionId = null;
let sortMode = 'ancient';
let sidebarExpanded = true;

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const welcomePanel = document.getElementById('welcomePanel');
const ocrResult = document.getElementById('ocrResult');
const pageTabs = document.getElementById('pageTabs');
const originalImage = document.getElementById('originalImage');
const textOnlyImage = document.getElementById('textOnlyImage');
const textList = document.getElementById('textList');
const copyAllBtn = document.getElementById('copyAllBtn');
const sortToggleBtn = document.getElementById('sortToggleBtn');
const newUploadBtn = document.getElementById('newUploadBtn');
const errorMessage = document.getElementById('errorMessage');
const historyList = document.getElementById('historyList');
const historyEmpty = document.getElementById('historyEmpty');
const sidebar = document.getElementById('sidebar');
const sidebarContent = document.getElementById('sidebarContent');
const collapseBtn = document.getElementById('collapseBtn');
const expandBtn = document.getElementById('expandBtn');

function toggleSidebar() {
    sidebarExpanded = !sidebarExpanded;
    sidebar.classList.toggle('collapsed', !sidebarExpanded);
    expandBtn.style.display = sidebarExpanded ? 'none' : 'flex';
}

collapseBtn.addEventListener('click', toggleSidebar);
expandBtn.addEventListener('click', toggleSidebar);

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFilesSelect(files);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFilesSelect(e.target.files);
    }
});

function handleFilesSelect(files) {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/bmp', 'application/pdf'];
    const validExtensions = ['.png', '.jpg', '.jpeg', '.bmp', '.pdf'];

    const validFiles = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.toLowerCase().split('.').pop();
        const hasValidExt = validExtensions.includes('.' + fileExt);
        const hasValidType = validTypes.includes(file.type);
        
        if (hasValidExt || hasValidType) {
            validFiles.push(file);
        }
    }

    if (validFiles.length === 0) {
        showError('不支持的文件格式，请选择图片或PDF文件');
        return;
    }

    selectedFiles = validFiles;
    processBtn.disabled = false;
    hideError();

    showFilesPreview(validFiles);
}

function showFilesPreview(files) {
    const previewSection = document.getElementById('previewSection');
    const fileCount = document.getElementById('fileCount');
    const fileSize = document.getElementById('fileSize');
    const fileList = document.getElementById('fileList');

    // Calculate total size
    let totalSize = 0;
    files.forEach(f => totalSize += f.size);

    // Update file count and size
    if (files.length === 1) {
        fileCount.textContent = files[0].name;
    } else {
        fileCount.textContent = `${files.length} 个文件`;
    }
    fileSize.textContent = formatFileSize(totalSize);

    // Show file list
    if (!fileList) {
        // Create file list container if it doesn't exist
        const listContainer = document.createElement('div');
        listContainer.className = 'file-list';
        listContainer.id = 'fileList';
        previewSection.appendChild(listContainer);
    }
    
    const fileListEl = document.getElementById('fileList');
    fileListEl.innerHTML = '';
    files.forEach((file, index) => {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.textContent = `${index + 1}. ${file.name}`;
        fileListEl.appendChild(div);
    });

    previewSection.style.display = 'block';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';

    return date.toLocaleDateString('zh-CN');
}

async function loadHistory() {
    try {
        const response = await fetch('/api/history');
        const data = await response.json();

        renderHistory(data.history || []);
    } catch (error) {
        console.error('加载历史记录失败:', error);
    }
}

function renderHistory(history) {
    if (history.length === 0) {
        historyEmpty.style.display = 'block';
        return;
    }

    historyEmpty.style.display = 'none';

    historyList.innerHTML = '';
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.dataset.sessionId = item.session_id;

        div.innerHTML = `
            <div class="history-item-info">
                <img class="history-item-thumb" src="${item.original}" alt="${item.filename}" onerror="this.style.display='none'">
                <div class="history-item-details">
                    <div class="history-item-name">${item.filename}</div>
                    <div class="history-item-time">${formatTime(item.created_time)}</div>
                </div>
            </div>
            <button class="history-item-delete" title="删除">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
            </button>
        `;

        div.addEventListener('click', (e) => {
            if (!e.target.closest('.history-item-delete')) {
                loadHistoryDetail(item.session_id);
            }
        });

        div.querySelector('.history-item-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteHistory(item.session_id);
        });

        historyList.appendChild(div);
    });
}

async function loadHistoryDetail(sessionId) {
    try {
        const response = await fetch(`/api/history/${sessionId}`);
        const data = await response.json();

        if (data.error) {
            showError(data.error);
            return;
        }

        currentSessionId = sessionId;
        currentResults = data.results;
        currentPageIndex = 0;

        document.querySelectorAll('.history-item').forEach(item => {
            item.classList.toggle('active', item.dataset.sessionId === sessionId);
        });

        displayResults();
    } catch (error) {
        console.error('加载历史详情失败:', error);
        showError('加载历史记录失败');
    }
}

async function deleteHistory(sessionId) {
    if (!confirm('确定要删除这条历史记录吗？')) return;

    try {
        const response = await fetch(`/api/history/${sessionId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            if (currentSessionId === sessionId) {
                resetView();
            }
            loadHistory();
        } else {
            showError(data.error || '删除失败');
        }
    } catch (error) {
        console.error('删除历史记录失败:', error);
        showError('删除失败');
    }
}

function resetView() {
    selectedFiles = [];
    currentResults = null;
    currentPageIndex = 0;
    currentSessionId = null;
    processBtn.disabled = true;
    welcomePanel.style.display = 'flex';
    ocrResult.style.display = 'none';
    fileInput.value = '';
    originalImage.src = '';
    textOnlyImage.src = '';

    const overlay = document.getElementById('textOverlay');
    if (overlay) {
        overlay.innerHTML = '';
    }

    const previewSection = document.getElementById('previewSection');
    if (previewSection) {
        previewSection.style.display = 'none';
    }

    document.querySelectorAll('.history-item').forEach(item => {
        item.classList.remove('active');
    });
}

newUploadBtn.addEventListener('click', () => {
    resetView();
    if (!sidebarExpanded) {
        toggleSidebar();
    }
});

processBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    const formData = new FormData();
    // Use 'files' key for batch upload (backend supports this)
    selectedFiles.forEach(file => {
        formData.append('files', file);
    });

    progressSection.style.display = 'block';
    ocrResult.style.display = 'none';
    welcomePanel.style.display = 'none';
    processBtn.disabled = true;
    progressFill.style.width = '10%';
    progressText.textContent = '上传中...';

    const previewSection = document.getElementById('previewSection');
    if (previewSection) {
        previewSection.style.display = 'none';
    }

    try {
        progressFill.style.width = '30%';
        progressText.textContent = '识别中...';

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        progressFill.style.width = '90%';

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '处理失败');
        }

        const data = await response.json();

        progressFill.style.width = '100%';
        progressText.textContent = '完成！';

        currentSessionId = data.session_id;
        currentResults = data.results;
        currentPageIndex = 0;

        setTimeout(() => {
            progressSection.style.display = 'none';
            displayResults();
            loadHistory();
        }, 500);

    } catch (error) {
        showError(error.message);
        progressSection.style.display = 'none';
        processBtn.disabled = false;
    }
});

function displayResults() {
    welcomePanel.style.display = 'none';
    ocrResult.style.display = 'flex';

    pageTabs.innerHTML = '';
    if (currentResults.length > 1) {
        currentResults.forEach((result, index) => {
            const tab = document.createElement('button');
            tab.className = `page-tab ${index === currentPageIndex ? 'active' : ''}`;
            tab.textContent = `第 ${index + 1} 页`;
            tab.addEventListener('click', () => switchPage(index));
            pageTabs.appendChild(tab);
        });
    }

    updatePageDisplay();
}

function switchPage(index) {
    currentPageIndex = index;
    document.querySelectorAll('.page-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });
    updatePageDisplay();
}

function updatePageDisplay() {
    const result = currentResults[currentPageIndex];

    originalImage.src = result.original;
    textOnlyImage.src = result.text_only;

    createClickableOverlay(result);

    loadTextResults(result);
}

async function loadTextResults(result) {
    try {
        const sessionId = currentSessionId;

        const response = await fetch(`/api/history/${sessionId}`);
        const data = await response.json();

        if (data.results && data.results[currentPageIndex]) {
            displayTextResults(data.results[currentPageIndex]);
        } else {
            displayTextResults(result);
        }
    } catch (error) {
        displayTextResults(result);
    }
}

function displayTextResults(result) {
 textList.innerHTML = '';

 if (result.texts && result.texts.length > 0) {
 const sortedTexts = [...result.texts].sort((a, b) => {
 const rightTopA = a.box[1];
 const rightTopB = b.box[1];
 if (sortMode === 'ancient') {
 const xDiff = rightTopB[0] - rightTopA[0];
 if (Math.abs(xDiff) > 10) {
 return xDiff;
 }
 return rightTopA[1] - rightTopB[1];
 } else {
 const yDiff = rightTopA[1] - rightTopB[1];
 if (Math.abs(yDiff) > 10) {
 return yDiff;
 }
 return rightTopA[0] - rightTopB[0];
 }
 });

    // Map sorted items with their original indices
    const sortedTextsWithOriginalIndex = [...result.texts].map((item, originalIdx) => ({
      item,
      originalIdx
    })).sort((a, b) => {
      const rightTopA = a.item.box[1];
      const rightTopB = b.item.box[1];
      if (sortMode === 'ancient') {
        const xDiff = rightTopB[0] - rightTopA[0];
        if (Math.abs(xDiff) > 10) {
          return xDiff;
        }
        return rightTopA[1] - rightTopB[1];
      } else {
        const yDiff = rightTopA[1] - rightTopB[1];
        if (Math.abs(yDiff) > 10) {
          return yDiff;
        }
        return rightTopA[0] - rightTopB[0];
      }
    });

    sortedTextsWithOriginalIndex.forEach(({ item, originalIdx }, displayIdx) => {
 const textItem = document.createElement('div');
 textItem.className = 'text-item';
      textItem.dataset.index = originalIdx;
 textItem.innerHTML = `
 <div class="text-item-row">
 <div class="text-content" data-text="${escapeHtml(item.text)}">${escapeHtml(item.text)}</div>
 <button class="edit-btn" title="编辑">
 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
 <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
 <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
 </svg>
 </button>
 </div>
 <div class="text-score">${(item.score * 100).toFixed(1)}%</div>
 `;
 
 // 点击文字内容复制
 const textContent = textItem.querySelector('.text-content');
 textContent.addEventListener('click', (e) => {
 e.stopPropagation();
 copyToClipboard(item.text, e.clientX, e.clientY);
 textItem.classList.add('copied');
 setTimeout(() => textItem.classList.remove('copied'), 1000);
 });
 
 // 点击编辑按钮进入编辑模式
 const editBtn = textItem.querySelector('.edit-btn');
 editBtn.addEventListener('click', (e) => {
 e.stopPropagation();
        enterEditMode(textItem, originalIdx, item.text);
 });
 
 textList.appendChild(textItem);
 });
 } else {
 textList.innerHTML = '<p style="color: #999; text-align: center; font-size: 0.8rem;">未识别到文字</p>';
 }
}

// 编辑模式相关变量
let editingItem = null;
let editingIndex = null;

function enterEditMode(textItem, index, currentText) {
 // 如果正在编辑其他项，先取消
 if (editingItem && editingItem !== textItem) {
 exitEditMode(editingItem, false);
 }
 
 editingItem = textItem;
 editingIndex = index;
 
 const textContent = textItem.querySelector('.text-content');
 const editBtn = textItem.querySelector('.edit-btn');
 const textScore = textItem.querySelector('.text-score');
 
 // 隐藏原内容
 textContent.style.display = 'none';
 editBtn.style.display = 'none';
 textScore.style.display = 'none';
 
 // 创建编辑输入框
 const inputWrapper = document.createElement('div');
 inputWrapper.className = 'edit-input-wrapper';
 inputWrapper.innerHTML = `
 <input type="text" class="edit-input" value="${escapeHtml(currentText)}" />
 <div class="edit-actions">
 <button class="edit-save-btn">保存</button>
 <button class="edit-cancel-btn">取消</button>
 </div>
 `;
 
 textItem.querySelector('.text-item-row').appendChild(inputWrapper);
 
 const input = inputWrapper.querySelector('.edit-input');
 const saveBtn = inputWrapper.querySelector('.edit-save-btn');
 const cancelBtn = inputWrapper.querySelector('.edit-cancel-btn');
 
 // 聚焦输入框
 input.focus();
 input.select();
 
 // 保存按钮点击
 saveBtn.addEventListener('click', (e) => {
 e.stopPropagation();
 saveEditText(textItem, index, input.value);
 });
 
 // 取消按钮点击
 cancelBtn.addEventListener('click', (e) => {
 e.stopPropagation();
 exitEditMode(textItem, false);
 });
 
 // Enter键保存，Escape键取消
 input.addEventListener('keydown', (e) => {
 if (e.key === 'Enter') {
 e.preventDefault();
 saveEditText(textItem, index, input.value);
 } else if (e.key === 'Escape') {
 e.preventDefault();
 exitEditMode(textItem, false);
 }
 });
}

function exitEditMode(textItem, saved) {
 const inputWrapper = textItem.querySelector('.edit-input-wrapper');
 if (inputWrapper) {
 inputWrapper.remove();
 }
 
 const textContent = textItem.querySelector('.text-content');
 const editBtn = textItem.querySelector('.edit-btn');
 const textScore = textItem.querySelector('.text-score');
 
 textContent.style.display = '';
 editBtn.style.display = '';
 textScore.style.display = '';
 
 if (!saved) {
 editingItem = null;
 editingIndex = null;
 }
}

async function saveEditText(textItem, index, newText) {
 if (!currentSessionId || !currentResults || !currentResults[currentPageIndex]) {
 showError('无法保存：缺少会话信息');
 return;
 }
 
 const pageName = currentResults[currentPageIndex].page;
 
 try {
 const response = await fetch(`/api/history/${currentSessionId}/texts`, {
 method: 'PUT',
 headers: {
 'Content-Type': 'application/json'
 },
 body: JSON.stringify({
 page: pageName,
 index: index,
 text: newText
 })
 });
 
 const data = await response.json();
 
 if (!response.ok) {
 throw new Error(data.error || '保存失败');
 }
 
 // 更新本地数据
 if (currentResults[currentPageIndex].texts[index]) {
 currentResults[currentPageIndex].texts[index].text = newText;
 }
 
 // 更新显示
 const textContent = textItem.querySelector('.text-content');
 textContent.textContent = newText;
 textContent.dataset.text = newText;
 
 // 更新预览图
 if (data.text_only_url) {
 const textOnlyImage = document.getElementById('textOnlyImage');
 if (textOnlyImage) {
 textOnlyImage.src = data.text_only_url;
 }
 }
 
 // 显示成功提示
 showSaveSuccess(textItem);
 
 // 退出编辑模式
 exitEditMode(textItem, true);
 editingItem = null;
 editingIndex = null;
 
 } catch (error) {
 console.error('保存失败:', error);
 showError('保存失败: ' + error.message);
 }
}

function showSaveSuccess(textItem) {
 const successTip = document.createElement('div');
 successTip.className = 'save-success-tip';
 successTip.textContent = '保存成功！';
 textItem.appendChild(successTip);
 
 setTimeout(() => {
 successTip.remove();
 }, 1500);
}

copyAllBtn.addEventListener('click', async () => {
    if (!currentSessionId) return;

    try {
        const response = await fetch(`/api/history/${currentSessionId}`);
        const data = await response.json();

        if (!data.results || !data.results[currentPageIndex] || !data.results[currentPageIndex].texts) {
            return;
        }

        const allText = data.results[currentPageIndex].texts.map(item => item.text).join('\n');
        copyToClipboard(allText, copyAllBtn.getBoundingClientRect().left + 50, copyAllBtn.getBoundingClientRect().top);
        copyAllBtn.textContent = '已复制！';
        setTimeout(() => copyAllBtn.textContent = '复制全部', 1500);
    } catch (error) {
        console.error('获取全部文字失败:', error);
    }
});

sortToggleBtn.addEventListener('click', () => {
    sortMode = sortMode === 'ancient' ? 'normal' : 'ancient';
    sortToggleBtn.textContent = sortMode === 'ancient' ? '古文模式' : '常规模式';
    if (currentResults && currentResults[currentPageIndex]) {
        loadTextResults(currentResults[currentPageIndex]);
    }
});

let errorTimeout;
function showError(message) {
    clearTimeout(errorTimeout);
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorTimeout = setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 3000);
}

function hideError() {
    errorMessage.style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function createClickableOverlay(result) {
    const overlay = document.getElementById('textOverlay');
    if (!overlay) return;

    overlay.innerHTML = '';

    if (!result.texts || result.texts.length === 0) return;

    function buildOverlay() {
        const imgWidth = textOnlyImage.naturalWidth;
        const imgHeight = textOnlyImage.naturalHeight;

        if (!imgWidth || !imgHeight || imgWidth === 0 || imgHeight === 0) {
            return;
        }

        const scaleX = textOnlyImage.offsetWidth / imgWidth;
        const scaleY = textOnlyImage.offsetHeight / imgHeight;

        overlay.style.width = textOnlyImage.offsetWidth + 'px';
        overlay.style.height = textOnlyImage.offsetHeight + 'px';

    result.texts.forEach((item, index) => {
            const box = item.box;
            if (!box || box.length !== 4) return;

            const clickArea = document.createElement('div');
            clickArea.className = 'clickable-text-area';

            const x_coords = box.map(p => p[0]);
            const y_coords = box.map(p => p[1]);
            const x_min = Math.min(...x_coords);
            const y_min = Math.min(...y_coords);
            const x_max = Math.max(...x_coords);
            const y_max = Math.max(...y_coords);

            const left = x_min * scaleX;
            const top = y_min * scaleY;
            const width = (x_max - x_min) * scaleX;
            const height = (y_max - y_min) * scaleY;

            clickArea.style.cssText = `
                position: absolute;
                left: ${left}px;
                top: ${top}px;
                width: ${width}px;
                height: ${height}px;
                cursor: pointer;
                z-index: 10;
      `;

      // Add edit button for image text boxes
      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn-on-image';
      editBtn.title = '编辑';
      editBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      `;
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openImageEditModal(item, index);
      });
      clickArea.appendChild(editBtn);

            clickArea.addEventListener('click', (e) => {
                e.stopPropagation();
                copyToClipboard(item.text, e.clientX, e.clientY);
                clickArea.style.background = 'rgba(102, 126, 234, 0.3)';
                setTimeout(() => clickArea.style.background = '', 300);
            });
            clickArea.addEventListener('mouseenter', () => {
                clickArea.style.background = 'rgba(102, 126, 234, 0.15)';
            });

            clickArea.addEventListener('mouseleave', () => {
                clickArea.style.background = '';
            });

            overlay.appendChild(clickArea);
        });
    }

    if (textOnlyImage.complete) {
        buildOverlay();
    } else {
        textOnlyImage.onload = buildOverlay;
    }
}

async function copyToClipboard(text, x, y) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            showCopyTooltip(x, y, '已复制！');
            return;
        }

        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
            showCopyTooltip(x, y, '已复制！');
        } else {
            showCopyTooltip(x, y, '复制失败');
        }
    } catch (err) {
        console.error('复制失败:', err);
        showCopyTooltip(x, y, '复制失败');
    }
}

function showCopyTooltip(x, y, message) {
    const tooltip = document.createElement('div');
    tooltip.textContent = message;
    tooltip.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y - 30}px;
        background: #667eea;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        z-index: 1000;
        pointer-events: none;
        animation: fadeOut 1s ease forwards;
    `;

    document.body.appendChild(tooltip);
    setTimeout(() => {
        tooltip.remove();
    }, 1000);
}

loadHistory();

// Listen for clipboard paste events
document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
            e.preventDefault();
            
            const blob = item.getAsFile();
            if (blob) {
                showPasteIndicator();
                
                const reader = new FileReader();
                reader.onload = async () => {
                    const base64Data = reader.result;
                    await processClipboardImage(base64Data);
                };
                reader.readAsDataURL(blob);
                return;
            }
        }
    }
});

function showPasteIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'pasteIndicator';
    indicator.innerHTML = '<span>📋 正在处理剪贴板图片...</span>';
    indicator.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(102, 126, 234, 0.9);
        color: white;
        padding: 20px 40px;
        border-radius: 12px;
        font-size: 16px;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        animation: pulse 1s ease-in-out infinite;
    `;
    
    if (!document.getElementById('pasteAnimationStyle')) {
        const style = document.createElement('style');
        style.id = 'pasteAnimationStyle';
        style.textContent = `@keyframes pulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.05); }
        }`;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(indicator);
}

function hidePasteIndicator() {
    const indicator = document.getElementById('pasteIndicator');
    if (indicator) {
        indicator.remove();
    }
}

async function processClipboardImage(base64Data) {
    try {
        progressSection.style.display = 'block';
        ocrResult.style.display = 'none';
        welcomePanel.style.display = 'none';
        progressFill.style.width = '20%';
        progressText.textContent = '上传中...';

        progressFill.style.width = '40%';
        progressText.textContent = '识别中...';

        const response = await fetch('/upload/clipboard', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: base64Data })
        });

        progressFill.style.width = '90%';

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '处理失败');
        }

        const data = await response.json();

        progressFill.style.width = '100%';
        progressText.textContent = '完成！';

        currentSessionId = data.session_id;
        currentResults = data.results;
        currentPageIndex = 0;

        setTimeout(() => {
            hidePasteIndicator();
            progressSection.style.display = 'none';
            displayResults();
            loadHistory();
        }, 500);

    } catch (error) {
        hidePasteIndicator();
        showError(error.message);
        progressSection.style.display = 'none';
    }
}



// ===== Image Text Edit Modal Functions =====

let currentEditItem = null;
let currentEditIndex = null;

function openImageEditModal(item, index) {
  currentEditItem = item;
  currentEditIndex = index;

  // Create modal if not exists
  let modal = document.getElementById('imageEditModal');
  if (!modal) {
    modal = createImageEditModal();
  }

  // Set current text
  const textarea = modal.querySelector('.modal-textarea');
  textarea.value = item.text;
  textarea.focus();
  textarea.select();

  // Show modal
  modal.classList.add('active');
}

function createImageEditModal() {
  const modal = document.createElement('div');
  modal.id = 'imageEditModal';
  modal.className = 'modal-overlay';

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-title">编辑文字</div>
      <textarea class="modal-textarea" placeholder="输入文字内容..."></textarea>
      <div class="modal-actions">
        <button class="modal-btn modal-btn-cancel">取消</button>
        <button class="modal-btn modal-btn-save">保存</button>
      </div>
    </div>
  `;

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeImageEditModal();
    }
  });

  // Cancel button
  const cancelBtn = modal.querySelector('.modal-btn-cancel');
  cancelBtn.addEventListener('click', closeImageEditModal);

  // Save button
  const saveBtn = modal.querySelector('.modal-btn-save');
  saveBtn.addEventListener('click', saveImageEditText);

  // Keyboard shortcuts
  const textarea = modal.querySelector('.modal-textarea');
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveImageEditText();
    } else if (e.key === 'Escape') {
      closeImageEditModal();
    }
  });

  document.body.appendChild(modal);
  return modal;
}

function closeImageEditModal() {
  const modal = document.getElementById('imageEditModal');
  if (modal) {
    modal.classList.remove('active');
  }
  currentEditItem = null;
  currentEditIndex = null;
}

async function saveImageEditText() {
  if (!currentEditItem || currentEditIndex === null) return;

  const modal = document.getElementById('imageEditModal');
  const textarea = modal.querySelector('.modal-textarea');
  const newText = textarea.value;

  const sessionId = currentSessionId;
  const pageName = currentResults[currentPageIndex].page;

  try {
    const response = await fetch(`/api/history/${sessionId}/texts`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        page: pageName,
        index: currentEditIndex,
        text: newText
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '保存失败');
    }

    const data = await response.json();

    // Update local data
    if (currentResults && currentResults[currentPageIndex]) {
      currentResults[currentPageIndex].texts[currentEditIndex].text = newText;
      currentResults[currentPageIndex].text_only = data.text_only_url;
    }

    // Refresh UI
    const result = currentResults[currentPageIndex];
    textOnlyImage.src = result.text_only + '?t=' + Date.now();
    createClickableOverlay(result);
    displayTextResults(result);

    // Close modal
    closeImageEditModal();

    // Show success message
    showSaveSuccessModal();

  } catch (error) {
    console.error('保存失败:', error);
    showError('保存失败，请重试');
  }
}













function showSaveSuccessModal() {
  const successTip = document.createElement('div');
  successTip.className = 'save-success-tip';
  successTip.textContent = '保存成功';
  successTip.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 2000;
    animation: fadeInOut 1.5s ease forwards;
  `;

  document.body.appendChild(successTip);

  setTimeout(() => {
    successTip.remove();
  }, 1500);
}
