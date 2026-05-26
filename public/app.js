const STORAGE_KEY = 'ac_journal_entries';
let entries = [];
let selectedEntryId = null;
let imageDataUrl = '';
let editMode = false;

const form = document.querySelector('#entry-form');
const titleInput = document.querySelector('#entry-title');
const moodSelect = document.querySelector('#entry-mood');
const dateInput = document.querySelector('#entry-date');
const textInput = document.querySelector('#entry-text');
const imageInput = document.querySelector('#entry-image');
const imagePreview = document.querySelector('#image-preview');
const previewArea = document.querySelector('#entry-preview');
const listContainer = document.querySelector('#journal-list');
const formHeader = document.querySelector('#form-header');
const submitButton = document.querySelector('#submit-button');
const resetButton = document.querySelector('#reset-button');
const notification = document.querySelector('#notification');
const clearImageButton = document.querySelector('#clear-image');
const searchInput = document.querySelector('#search-input');

function showNotification(message) {
    notification.textContent = message;
    notification.style.display = 'flex';
    window.clearTimeout(notification.hideTimeout);
    notification.hideTimeout = window.setTimeout(() => {
        notification.style.display = 'none';
    }, 2400);
}

function loadEntries() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
        entries = JSON.parse(raw);
    } catch (error) {
        console.warn('Could not parse saved entries.', error);
        entries = [];
    }
}

function saveEntries() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function createId() {
    return `entry-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function getSelectedEntry() {
    if (!selectedEntryId) return null;
    return entries.find((entry) => entry.id === selectedEntryId) || null;
}

function renderPreview(entry) {
    if (!entry) {
        previewArea.innerHTML = `
            <div class="empty-state">
                <div>
                    <strong>오늘의 일기를 선택하거나 새로 작성해보세요!</strong>
                    <span>사진과 함께 귀여운 기록을 꾸밀 수 있어요.</span>
                </div>
            </div>
        `;
        return;
    }

    previewArea.innerHTML = `
        <div class="preview-card">
            <div class="meta">
                <span>${formatDate(entry.date)}</span>
                <span class="tag">${entry.mood}</span>
            </div>
            <h3>${entry.title}</h3>
            ${entry.image ? `<img class="preview-image" src="${entry.image}" alt="일기 이미지" />` : ''}
            <div class="preview-body">${entry.text ? escapeHtml(entry.text) : '<em>내용이 비어있어요.</em>'}</div>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}

function renderEntryList(filter = '') {
    const normalizedFilter = filter.trim().toLowerCase();
    const shownEntries = entries
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .filter((entry) => {
            if (!normalizedFilter) return true;
            return (
                entry.title.toLowerCase().includes(normalizedFilter) ||
                entry.text.toLowerCase().includes(normalizedFilter) ||
                entry.mood.toLowerCase().includes(normalizedFilter)
            );
        });

    listContainer.innerHTML = '';

    if (shownEntries.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <div>
                    <strong>아직 작성된 기록이 없어요.</strong>
                    <span>새로운 일기를 써서 목록에 추가해보세요.</span>
                </div>
            </div>
        `;
        return;
    }

    shownEntries.forEach((entry) => {
        const snippetSource = entry.text || '사진과 함께 행복한 하루를 기록해보세요.';
        const snippet = escapeHtml(snippetSource.slice(0, 120));

        const card = document.createElement('div');
        card.className = 'list-item' + (entry.id === selectedEntryId ? ' selected' : '');
        card.innerHTML = `
            <div class="item-title">${entry.title}</div>
            <div class="item-meta">
                <span>${formatDate(entry.date)}</span>
                <span>${entry.mood}</span>
            </div>
            <div class="item-snippet">${snippet}</div>
        `;
        card.addEventListener('click', () => selectEntry(entry.id));

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'secondary danger';
        deleteButton.textContent = '삭제';
        deleteButton.style.padding = '12px 16px';
        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation();
            deleteEntry(entry.id);
        });

        const wrapper = document.createElement('div');
        wrapper.style.display = 'grid';
        wrapper.style.gap = '8px';
        wrapper.appendChild(card);

        const controlArea = document.createElement('div');
        controlArea.style.display = 'flex';
        controlArea.style.justifyContent = 'flex-end';
        controlArea.appendChild(deleteButton);
        wrapper.appendChild(controlArea);

        listContainer.appendChild(wrapper);
    });
}

function selectEntry(id) {
    selectedEntryId = id;
    const entry = getSelectedEntry();
    if (!entry) return;
    renderPreview(entry);
    renderEntryList(searchInput.value);
    editMode = true;
    populateForm(entry);
}

function populateForm(entry) {
    titleInput.value = entry.title;
    moodSelect.value = entry.mood;
    dateInput.value = entry.date;
    textInput.value = entry.text;
    imageDataUrl = entry.image || '';
    renderImagePreview(imageDataUrl);
    editMode = true;
    formHeader.textContent = '일기 수정하기';
    submitButton.textContent = '저장하기';
}

function deleteEntry(id) {
    const confirmed = window.confirm('해당 기록을 삭제하시겠어요?');
    if (!confirmed) return;

    entries = entries.filter((entry) => entry.id !== id);
    if (selectedEntryId === id) {
        selectedEntryId = null;
    }
    saveEntries();
    renderEntryList(searchInput.value);
    renderPreview(getSelectedEntry());
    if (selectedEntryId === null) {
        resetForm();
    }
    showNotification('기록이 삭제되었어요.');
}

function renderImagePreview(src) {
    if (!src) {
        imagePreview.innerHTML = '<div class="empty-state"><span>이미지를 선택하면 미리보기가 여기에 표시됩니다.</span></div>';
        return;
    }
    imagePreview.innerHTML = `<img src="${src}" alt="미리보기 이미지" class="preview-image" />`;
}

function resetForm() {
    form.reset();
    imageDataUrl = '';
    editMode = false;
    selectedEntryId = null;
    renderImagePreview('');
    formHeader.textContent = '새 일기 작성하기';
    submitButton.textContent = '추가하기';
    dateInput.value = new Date().toISOString().split('T')[0];
    renderPreview(null);
    renderEntryList(searchInput.value);
}

function handleFormSubmit(event) {
    event.preventDefault();

    const title = titleInput.value.trim() || '제목 없는 하루';
    const mood = moodSelect.value;
    const date = dateInput.value || new Date().toISOString().split('T')[0];
    const text = textInput.value.trim();

    if (editMode && selectedEntryId) {
        entries = entries.map((entry) => {
            if (entry.id !== selectedEntryId) return entry;
            return {
                ...entry,
                title,
                mood,
                date,
                text,
                image: imageDataUrl,
            };
        });
        showNotification('일기가 안전하게 수정되었어요.');
    } else {
        const entry = {
            id: createId(),
            title,
            mood,
            date,
            text,
            image: imageDataUrl,
            createdAt: new Date().toISOString(),
        };
        entries.push(entry);
        selectedEntryId = entry.id;
        showNotification('새 일기가 저장되었어요.');
    }

    saveEntries();
    renderEntryList(searchInput.value);
    renderPreview(getSelectedEntry());
    editMode = true;
    formHeader.textContent = '일기 수정하기';
    submitButton.textContent = '저장하기';
}

function handleImageUpload() {
    const file = imageInput.files[0];
    if (!file) {
        imageDataUrl = '';
        renderImagePreview('');
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        imageDataUrl = reader.result;
        renderImagePreview(imageDataUrl);
    };
    reader.readAsDataURL(file);
}

function handleClearImage() {
    imageInput.value = '';
    imageDataUrl = '';
    renderImagePreview('');
}

function handleSearch(event) {
    renderEntryList(event.target.value);
}

form.addEventListener('submit', handleFormSubmit);
imageInput.addEventListener('change', handleImageUpload);
clearImageButton.addEventListener('click', handleClearImage);
resetButton.addEventListener('click', (event) => {
    event.preventDefault();
    resetForm();
});
searchInput.addEventListener('input', handleSearch);

function init() {
    loadEntries();
    resetForm();
    if (entries.length > 0) {
        const sortedEntries = entries.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
        selectedEntryId = sortedEntries[0].id;
    }
    renderEntryList();
    renderPreview(getSelectedEntry());
}

init();
