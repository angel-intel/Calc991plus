// ---------- Data ----------
// Everything is stored in the browser's localStorage under this key.
const STORAGE_KEY = 'sheet-music-progress';

// The learning stages a section can be in, and how much each counts toward progress.
const STAGES = [
  { label: 'Not started', percent: 0 },
  { label: 'Reading notes', percent: 25 },
  { label: 'Slow & steady', percent: 50 },
  { label: 'Up to tempo', percent: 75 },
  { label: 'Performance ready', percent: 100 },
];

// pieces = [{ id, title, composer, sections: [{ id, name, bars, stage }] }]
let pieces = load();
let currentPieceId = null;

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pieces));
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// A piece's progress is the average of its sections' progress.
function pieceProgress(piece) {
  if (piece.sections.length === 0) return 0;
  const total = piece.sections.reduce((sum, s) => sum + STAGES[s.stage].percent, 0);
  return Math.round(total / piece.sections.length);
}

// ---------- Rendering ----------
const $ = (id) => document.getElementById(id);

function render() {
  const piece = pieces.find((p) => p.id === currentPieceId);
  $('list-view').hidden = !!piece;
  $('piece-view').hidden = !piece;
  if (piece) renderPiece(piece);
  else renderList();
}

function renderList() {
  const list = $('piece-list');
  list.innerHTML = '';
  if (pieces.length === 0) {
    list.innerHTML = '<p class="empty">No pieces yet. Add your first one above!</p>';
    return;
  }
  for (const piece of pieces) {
    const percent = pieceProgress(piece);
    const card = document.createElement('div');
    card.className = 'card piece-item';
    card.innerHTML = `
      <h2></h2>
      <p class="muted"></p>
      <div class="progress"><div style="width:${percent}%"></div></div>
      <p class="muted">${percent}% · ${piece.sections.length} section(s)</p>`;
    // textContent (not innerHTML) so titles with < or & display safely
    card.querySelector('h2').textContent = piece.title;
    card.querySelector('p').textContent = piece.composer || '';
    card.onclick = () => { currentPieceId = piece.id; render(); };
    list.appendChild(card);
  }
}

function renderPiece(piece) {
  const percent = pieceProgress(piece);
  $('piece-title').textContent = piece.title;
  $('piece-composer').textContent = piece.composer || '';
  $('piece-progress-bar').style.width = percent + '%';
  $('piece-progress-text').textContent = `${percent}% complete`;

  const list = $('section-list');
  list.innerHTML = '';
  if (piece.sections.length === 0) {
    list.innerHTML = '<p class="empty">Split this piece into sections to track them one by one.</p>';
    return;
  }
  for (const section of piece.sections) {
    const row = document.createElement('div');
    row.className = 'card';
    row.innerHTML = `
      <div class="section-row">
        <span class="name"></span>
        <span class="muted bars"></span>
        <select></select>
        <button class="remove" title="Remove section">✕</button>
      </div>
      <div class="progress"><div style="width:${STAGES[section.stage].percent}%"></div></div>`;
    row.querySelector('.name').textContent = section.name;
    row.querySelector('.bars').textContent = section.bars ? `bars ${section.bars}` : '';

    const select = row.querySelector('select');
    STAGES.forEach((stage, i) => select.add(new Option(stage.label, i, false, i === section.stage)));
    select.onchange = () => { section.stage = Number(select.value); save(); render(); };

    row.querySelector('.remove').onclick = () => {
      if (!confirm(`Remove section "${section.name}"?`)) return;
      piece.sections = piece.sections.filter((s) => s.id !== section.id);
      save(); render();
    };
    list.appendChild(row);
  }
}

// ---------- Actions ----------
$('add-piece-form').onsubmit = (e) => {
  e.preventDefault();
  const form = e.target;
  pieces.push({
    id: newId(),
    title: form.title.value.trim(),
    composer: form.composer.value.trim(),
    sections: [],
  });
  form.reset();
  save(); render();
};

$('add-section-form').onsubmit = (e) => {
  e.preventDefault();
  const form = e.target;
  const piece = pieces.find((p) => p.id === currentPieceId);
  piece.sections.push({
    id: newId(),
    name: form.name.value.trim(),
    bars: form.bars.value.trim(),
    stage: 0,
  });
  form.reset();
  save(); render();
};

$('back-btn').onclick = () => { currentPieceId = null; render(); };

$('delete-piece-btn').onclick = () => {
  const piece = pieces.find((p) => p.id === currentPieceId);
  if (!confirm(`Delete "${piece.title}" and all its sections?`)) return;
  pieces = pieces.filter((p) => p.id !== currentPieceId);
  currentPieceId = null;
  save(); render();
};

// Backup: download all data as a JSON file
$('export-btn').onclick = () => {
  const blob = new Blob([JSON.stringify(pieces, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `sheet-music-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
};

// Restore: load a previously exported JSON file
$('import-input').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data)) throw new Error();
    if (!confirm('Replace your current data with this backup?')) return;
    pieces = data;
    currentPieceId = null;
    save(); render();
  } catch {
    alert('That file is not a valid backup.');
  }
  e.target.value = '';
};

render();
