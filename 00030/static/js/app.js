const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const fileList = document.getElementById('fileList');
const validateBtn = document.getElementById('validateBtn');
const resultsSection = document.getElementById('resultsSection');
const resultsContent = document.getElementById('resultsContent');
const fixSection = document.getElementById('fixSection');
const fixSuggestions = document.getElementById('fixSuggestions');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');

let uploadedFiles = [];
let validationResult = null;
let suggestions = null;

async function loadDefaultConfig() {
    try {
        const response = await fetch('/api/default-config');
        const data = await response.json();
        if (data.success && data.config && Object.keys(data.config).length > 0) {
            document.getElementById('customConfig').value = JSON.stringify(data.config, null, 2);
        }
    } catch (e) {}
}

loadDefaultConfig();

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
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function handleFiles(files) {
    for (const file of files) {
        if (file.name.endsWith('.json') || file.name.endsWith('.zip')) {
            uploadedFiles.push(file);
        }
    }
    updateFileList();
    validateBtn.disabled = uploadedFiles.length === 0;
}

function updateFileList() {
    fileList.innerHTML = '';
    uploadedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <span class="file-icon">${file.name.endsWith('.zip') ? '📦' : '📄'}</span>
                <div>
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${formatFileSize(file.size)}</div>
                </div>
            </div>
            <button class="remove-file" onclick="removeFile(${index})">删除</button>
        `;
        fileList.appendChild(fileItem);
    });
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);
    updateFileList();
    validateBtn.disabled = uploadedFiles.length === 0;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

validateBtn.addEventListener('click', async () => {
    const formData = new FormData();
    uploadedFiles.forEach(file => {
        formData.append('files[]', file);
    });
    formData.append('base_language', document.getElementById('baseLanguage').value);
    formData.append('config', document.getElementById('customConfig').value);

    loading.style.display = 'block';
    resultsSection.style.display = 'none';
    errorMessage.style.display = 'none';

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            validationResult = data.validation;
            suggestions = data.suggestions;
            displayResults();
            displayFixSuggestions();
            resultsSection.style.display = 'block';
        } else {
            showError(data.error || '校验失败');
        }
    } catch (error) {
        showError('网络错误: ' + error.message);
    } finally {
        loading.style.display = 'none';
    }
});

function displayResults() {
    const keyValidation = validationResult.key_validation;
    const contentValidation = validationResult.content_validation;

    let html = '';

    html += '<div class="result-card">';
    html += '<h3>📋 键一致性校验</h3>';
    html += `<p><strong>基准语言:</strong> ${keyValidation.base_language}</p><br>`;

    for (const lang in keyValidation.key_summary) {
        const summary = keyValidation.key_summary[lang];
        const missing = keyValidation.missing_keys[lang] || [];
        const extra = keyValidation.extra_keys[lang] || [];

        html += '<div class="lang-result">';
        html += `<h4>🌐 ${lang}</h4>`;
        html += '<div class="lang-summary">';
        html += `<div class="summary-item"><span class="summary-label">总键数:</span><span class="summary-value">${summary.total_keys}</span></div>`;
        html += `<div class="summary-item"><span class="summary-label">缺失:</span><span class="summary-value ${summary.missing_count > 0 ? 'error' : ''}">${summary.missing_count}</span></div>`;
        html += `<div class="summary-item"><span class="summary-label">多余:</span><span class="summary-value ${summary.extra_count > 0 ? 'warning' : ''}">${summary.extra_count}</span></div>`;
        html += '</div>';

        if (missing.length > 0) {
            html += '<div><strong>缺失的键:</strong><div class="key-list">';
            missing.forEach(key => {
                html += `<div class="key-item missing">❌ ${key}</div>`;
            });
            html += '</div></div>';
        }

        if (extra.length > 0) {
            html += '<div><strong>多余的键:</strong><div class="key-list">';
            extra.forEach(key => {
                html += `<div class="key-item extra">⚠️ ${key}</div>`;
            });
            html += '</div></div>';
        }

        html += '</div>';
    }
    html += '</div>';

    html += '<div class="result-card">';
    html += '<h3>🔍 内容格式校验</h3>';

    for (const lang of validationResult.languages) {
        const htmlErrors = contentValidation.html_errors[lang] || [];
        const placeholderErrors = contentValidation.placeholder_errors[lang] || [];
        const regexErrors = contentValidation.regex_errors[lang] || [];

        if (htmlErrors.length === 0 && placeholderErrors.length === 0 && regexErrors.length === 0) {
            continue;
        }

        html += '<div class="lang-result">';
        html += `<h4>🌐 ${lang}</h4>`;

        if (htmlErrors.length > 0) {
            html += '<p><strong>HTML标签错误 (' + htmlErrors.length + '):</strong></p>';
            htmlErrors.forEach(err => {
                html += '<div class="error-detail">';
                html += `<div class="error-key">${err.key}</div>`;
                html += `<div class="error-value">值: ${escapeHtml(err.value)}</div>`;
                err.errors.forEach(e => {
                    html += `<div class="error-msg">• ${e}</div>`;
                });
                html += '</div>';
            });
        }

        if (placeholderErrors.length > 0) {
            html += '<p><strong>占位符错误 (' + placeholderErrors.length + '):</strong></p>';
            placeholderErrors.forEach(err => {
                html += '<div class="error-detail">';
                html += `<div class="error-key">${err.key}</div>`;
                html += `<div class="error-value">原文: ${escapeHtml(err.base_value)}</div>`;
                html += `<div class="error-value">译文: ${escapeHtml(err.target_value)}</div>`;
                err.errors.forEach(e => {
                    html += `<div class="error-msg">• ${e}</div>`;
                });
                html += '</div>';
            });
        }

        if (regexErrors.length > 0) {
            html += '<p><strong>正则表达式错误 (' + regexErrors.length + '):</strong></p>';
            regexErrors.forEach(err => {
                html += '<div class="error-detail">';
                html += `<div class="error-key">${err.key}</div>`;
                html += `<div class="error-value">值: ${escapeHtml(err.value)}</div>`;
                html += `<div class="error-msg">• 不匹配模式: ${err.pattern}</div>`;
                html += '</div>';
            });
        }

        html += '</div>';
    }
    html += '</div>';

    resultsContent.innerHTML = html;
}

function displayFixSuggestions() {
    if (!suggestions || Object.keys(suggestions).length === 0) {
        fixSection.style.display = 'none';
        return;
    }

    fixSection.style.display = 'block';
    let html = '';

    for (const lang in suggestions) {
        const sugg = suggestions[lang];
        if (sugg.missing_keys_to_add.length === 0 && sugg.extra_keys_to_remove.length === 0) {
            continue;
        }

        html += '<div class="fix-suggestion">';
        html += `<h4>🌐 ${lang}</h4>`;

        if (sugg.missing_keys_to_add.length > 0) {
            html += '<p><strong>需要添加的缺失键:</strong></p>';
            sugg.missing_keys_to_add.forEach((item, idx) => {
                html += `<div class="fix-item">
                    <input type="checkbox" class="fix-checkbox" data-lang="${lang}" data-type="add" data-key="${item.key}" data-value='${JSON.stringify(item)}' checked>
                    <span class="fix-key">+ ${item.key}</span>
                    <span class="fix-value">→ ${escapeHtml(item.suggested_value)}</span>
                </div>`;
            });
        }

        if (sugg.extra_keys_to_remove.length > 0) {
            html += '<p><strong>需要删除的多余键:</strong></p>';
            sugg.extra_keys_to_remove.forEach((key) => {
                html += `<div class="fix-item">
                    <input type="checkbox" class="fix-checkbox" data-lang="${lang}" data-type="remove" data-key="${key}" checked>
                    <span class="fix-key" style="color: #dc3545;">- ${key}</span>
                    <span class="fix-value">删除此键</span>
                </div>`;
            });
        }

        html += '</div>';
    }

    fixSuggestions.innerHTML = html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

document.getElementById('downloadMarkdown').addEventListener('click', () => {
    window.location.href = '/api/report/markdown';
});

document.getElementById('downloadHtml').addEventListener('click', () => {
    window.location.href = '/api/report/html';
});

document.getElementById('downloadFixed').addEventListener('click', () => {
    window.location.href = '/api/download-fixed';
});

document.getElementById('applyFixes').addEventListener('click', async () => {
    const checkboxes = document.querySelectorAll('.fix-checkbox:checked');
    const fixes = {};

    checkboxes.forEach(cb => {
        const lang = cb.dataset.lang;
        const type = cb.dataset.type;

        if (!fixes[lang]) {
            fixes[lang] = {
                missing_keys_to_add: [],
                extra_keys_to_remove: []
            };
        }

        if (type === 'add') {
            fixes[lang].missing_keys_to_add.push(JSON.parse(cb.dataset.value));
        } else if (type === 'remove') {
            fixes[lang].extra_keys_to_remove.push(cb.dataset.key);
        }
    });

    loading.style.display = 'block';

    try {
        const response = await fetch('/api/fix', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fixes })
        });

        const data = await response.json();

        if (response.ok) {
            validationResult = data.validation;
            suggestions = data.suggestions;
            displayResults();
            displayFixSuggestions();
            alert('✅ 修复已成功应用！');
        } else {
            showError(data.error || '修复失败');
        }
    } catch (error) {
        showError('网络错误: ' + error.message);
    } finally {
        loading.style.display = 'none';
    }
});
