// Notepad - script.js
// Funcionalidades:
// - Criar/editar/excluir notas
// - Salvar em localStorage
// - Buscar notas
// - Exportar/Importar JSON
// - Baixar nota como .txt
// - Atalhos (Ctrl+N, Ctrl+S, Delete)

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

// Elementos
const newNoteBtn = $('#newNoteBtn');
const notesList = $('#notesList');
const noteItemTpl = $('#noteItemTpl');
const editor = $('#editor');
const noteTitle = $('#noteTitle');
const status = $('#status');
const searchInput = $('#search');
const exportBtn = $('#exportBtn');
const importBtn = $('#importBtn');
const importInput = $('#importInput');
const clearAllBtn = $('#clearAllBtn');
const downloadBtn = $('#downloadBtn');
const deleteBtn = $('#deleteBtn');
const sidebar = document.getElementById('sidebar');
const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
const sidebarToggleBtnMobile = document.getElementById('sidebarToggleBtnMobile');
const showSidebarBtn = document.getElementById('showSidebarBtn');

// Novos elementos de UI (menus e botões)
const accountBtn = document.getElementById('accountBtn');
const accountMenu = document.getElementById('accountMenu');
const accountMenuLogged = document.getElementById('accountMenuLogged');
const accountMenuLoggedOut = document.getElementById('accountMenuLoggedOut');
const menuExportBtn = document.getElementById('menuExportBtn');
const menuImportBtn = document.getElementById('menuImportBtn');
const menuImportInput = document.getElementById('menuImportInput');
const menuClearAllBtn = document.getElementById('menuClearAllBtn');
const menuLogoutBtn = document.getElementById('menuLogoutBtn');
const menuLoginBtn = document.getElementById('menuLoginBtn');
const statFirstLogin = document.getElementById('statFirstLogin');
const statNotesCreated = document.getElementById('statNotesCreated');
const statNotesDeleted = document.getElementById('statNotesDeleted');
const statCharsWritten = document.getElementById('statCharsWritten');

const noteActionsFab = document.getElementById('noteActionsFab');
const noteActionsMenu = document.getElementById('noteActionsMenu');
const menuDownloadBtn = document.getElementById('menuDownloadBtn');
const menuDeleteBtn = document.getElementById('menuDeleteBtn');

// Bloqueio de edição no mobile quando a sidebar está expandida
const mobileMql = window.matchMedia('(max-width: 720px)');
function isSidebarExpanded() {
  return sidebar && !sidebar.classList.contains('collapsed');
}
function setEditorLocked(locked) {
  noteTitle.readOnly = !!locked;
  editor.readOnly = !!locked;
  if (locked) {
    document.body.classList.add('editor-locked');
    if (document.activeElement === noteTitle || document.activeElement === editor) {
      document.activeElement.blur();
    }
  } else {
    document.body.classList.remove('editor-locked');
  }
}
function updateEditorInteractivityForMobile() {
  const lock = mobileMql.matches && isSidebarExpanded();
  setEditorLocked(lock);
}
// Evita foco quando travado (impede teclado móvel)
function preventFocusWhenLocked(e) {
  if (document.body.classList.contains('editor-locked')) {
    e.preventDefault();
    e.target.blur();
  }
}
noteTitle.addEventListener('focus', preventFocusWhenLocked, true);
editor.addEventListener('focus', preventFocusWhenLocked, true);
mobileMql.addEventListener?.('change', updateEditorInteractivityForMobile);

// Estado
let notes = []; // { id, title, content, updated }
let currentId = null;
const STORAGE_KEY = 'notepad_notes_v1';
const LAST_NOTE_KEY = 'notepad_last_note';
const THEME_KEY = 'notepad_theme';

// Estatísticas por usuário
const STATS_PREFIX = 'notepad_stats_';
function getStatsKey() {
  return STATS_PREFIX + (currentUser || 'guest');
}
function loadStats() {
  try {
    const raw = localStorage.getItem(getStatsKey());
    if (!raw) return null;
    return JSON.parse(raw);
  } catch(_) { return null; }
}
function saveStats(stats) {
  try { localStorage.setItem(getStatsKey(), JSON.stringify(stats)); } catch(_) {}
}
function ensureFirstLoginIfNeeded() {
  let stats = loadStats();
  if (!stats) {
    stats = { firstLogin: new Date().toISOString(), notesCreated: 0, notesDeleted: 0, charsWritten: 0 };
    saveStats(stats);
  }
}
function updateStatsUI() {
  const stats = loadStats();
  if (!stats) return;
  if (statFirstLogin) statFirstLogin.textContent = new Date(stats.firstLogin).toLocaleString();
  if (statNotesCreated) statNotesCreated.textContent = String(stats.notesCreated || 0);
  if (statNotesDeleted) statNotesDeleted.textContent = String(stats.notesDeleted || 0);
  if (statCharsWritten) statCharsWritten.textContent = String(stats.charsWritten || 0);
}
function incStat(field, incBy = 1) {
  const stats = loadStats() || { firstLogin: new Date().toISOString(), notesCreated: 0, notesDeleted: 0, charsWritten: 0 };
  stats[field] = (stats[field] || 0) + incBy;
  saveStats(stats);
  updateStatsUI();
}

// Controle de contagem de caracteres (apenas incrementos positivos)
let prevTitleLen = 0;
let prevEditorLen = 0;
function resetPrevLengths() {
  prevTitleLen = (noteTitle?.value || '').length;
  prevEditorLen = (editor?.value || '').length;
}
function handleCharCountInput(e) {
  if (!e || !e.target) return;
  if (e.target === noteTitle) {
    const len = noteTitle.value.length;
    const diff = len - prevTitleLen;
    if (diff > 0) incStat('charsWritten', diff);
    prevTitleLen = len;
  } else if (e.target === editor) {
    const len = editor.value.length;
    const diff = len - prevEditorLen;
    if (diff > 0) incStat('charsWritten', diff);
    prevEditorLen = len;
  }
}

// Firebase (opcional)
let firebaseApp = null;
let firebaseAuth = null;
let firestore = null;
let currentUser = null; // firebase user uid

const useFirestore = () => !!(firestore && currentUser);

// Helpers
const now = () => new Date().toISOString();
const formatDate = iso => {
  const d = new Date(iso);
  return d.toLocaleString();
}

const saveToStorage = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    console.warn('Storage corrompido. Limpando cache local.');
    return [];
  }
};

// Firestore helpers
async function saveNotesToFirestore() {
  if (!useFirestore()) return;
  try {
    const userNotesRef = firestore.collection('notes').doc(currentUser);
    await userNotesRef.set({ notes });
    console.info('Notas sincronizadas com Firestore');
  } catch (err) {
    console.error('Erro ao salvar no Firestore', err);
  }
}

async function loadNotesFromFirestore() {
  if (!useFirestore()) return [];
  try {
    const doc = await firestore.collection('notes').doc(currentUser).get();
    if (doc.exists) return doc.data().notes || [];
  } catch (err) {
    console.error('Erro ao carregar do Firestore', err);
  }
  return [];
}

// UI
function renderNotes(filter = '') {
  notesList.innerHTML = '';
  const frag = document.createDocumentFragment();
  const filtered = notes
    .filter(n => n.title.toLowerCase().includes(filter) || n.content.toLowerCase().includes(filter))
    .sort((a,b) => b.updated.localeCompare(a.updated));

  if (filtered.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Nenhuma nota encontrada';
    notesList.appendChild(li);
  }

  filtered.forEach(n => {
    const tpl = noteItemTpl.content.cloneNode(true);
    const li = tpl.querySelector('li');
    li.dataset.id = n.id;
    tpl.querySelector('.note-title').textContent = n.title || 'Sem título';
    tpl.querySelector('.note-meta').textContent = formatDate(n.updated);
    const openBtn = tpl.querySelector('.open-btn');
    openBtn.addEventListener('click', () => openNote(n.id));
    li.addEventListener('click', (e) => {
      if (e.target === openBtn) return; // already handled
      openNote(n.id);
    });
    frag.appendChild(tpl);
  });

  notesList.appendChild(frag);
}

function setStatus(text) {
  status.textContent = text;
}

function newNote() {
  const id = 'note_' + Math.random().toString(36).slice(2,9);
  const note = { id, title: '', content: '', updated: now() };
  notes.unshift(note);
  currentId = id;
  saveToStorage();
  if (useFirestore()) saveNotesToFirestore();
  renderNotes(searchInput.value.trim().toLowerCase());
  populateEditor(note);
  noteTitle.focus();
  setStatus('Nova nota criada');
  incStat('notesCreated', 1);
  // Ao criar e entrar na nova nota, colapsa a sidebar em qualquer viewport
  collapseSidebarInstant();
}

function populateEditor(note) {
  noteTitle.value = note.title;
  editor.value = note.content;
  currentId = note.id;
  // Reinicia baseline de contagem para não contar conteúdo carregado
  resetPrevLengths();
}

function openNote(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  populateEditor(note);
  setStatus('Nota aberta — ' + (note.title || 'Sem título'));
  // Salva última nota visitada
  if (currentUser) {
    localStorage.setItem(LAST_NOTE_KEY + '_' + currentUser, id);
  } else {
    localStorage.setItem(LAST_NOTE_KEY, id);
  }
  // Ao entrar numa nota, oculta a sidebar instantaneamente
  collapseSidebarInstant();
}

function saveCurrentNote() {
  if (!currentId) return;
  const note = notes.find(n => n.id === currentId);
  if (!note) return;
  note.title = noteTitle.value;
  note.content = editor.value;
  note.updated = now();
  // move to top
  notes = notes.filter(n => n.id !== currentId);
  notes.unshift(note);
  saveToStorage();
  if (useFirestore()) saveNotesToFirestore();
  renderNotes(searchInput.value.trim().toLowerCase());
  setStatus('Alterações salvas');
}

function deleteCurrentNote() {
  if (!currentId) return;
  const idx = notes.findIndex(n => n.id === currentId);
  if (idx === -1) return;
  if (!confirm('Excluir nota atual?')) return;
  notes.splice(idx,1);
  saveToStorage();
  incStat('notesDeleted', 1);
  if (useFirestore()) saveNotesToFirestore();
  currentId = notes.length ? notes[0].id : null;
  if (currentId) populateEditor(notes[0]); else {
    noteTitle.value = '';
    editor.value = '';
  }
  renderNotes(searchInput.value.trim().toLowerCase());
  setStatus('Nota excluída');
}

function clearAllNotes() {
  if (!confirm('Apagar todas as notas? Esta ação não pode ser desfeita.')) return;
  const deletedCount = notes.length;
  notes = [];
  saveToStorage();
  if (deletedCount > 0) incStat('notesDeleted', deletedCount);
  if (useFirestore()) saveNotesToFirestore();
  currentId = null;
  noteTitle.value = '';
  editor.value = '';
  renderNotes();
  setStatus('Todas as notas apagadas');
}

function exportNotes() {
  const data = JSON.stringify(notes, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'notas.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importNotes(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported)) throw new Error('Formato inválido');
      // saneamento básico e deduplicação por id
      const seen = new Set(notes.map(n => n.id));
      const clean = imported
        .slice(0, 2000) // evita import massivo acidental
        .map(n => ({
          id: (n && typeof n.id === 'string' && n.id.trim()) || 'note_' + Math.random().toString(36).slice(2,9),
          title: (n && typeof n.title === 'string' ? n.title : ''),
          content: (n && typeof n.content === 'string' ? n.content : ''),
          updated: (n && typeof n.updated === 'string' ? n.updated : now())
        }))
        .filter(n => {
          if (seen.has(n.id)) return false; // pula duplicados
          // limitações simples de tamanho
          if (n.title.length > 500) n.title = n.title.slice(0, 500);
          if (n.content.length > 500000) n.content = n.content.slice(0, 500000);
          seen.add(n.id);
          return true;
        });
      notes = clean.concat(notes);
      saveToStorage();
      if (useFirestore()) saveNotesToFirestore();
      renderNotes();
      setStatus('Importação concluída (' + clean.length + ' novas notas)');
    } catch (err) {
      alert('Erro ao importar: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function downloadCurrentAsTxt() {
  if (!currentId) return alert('Nenhuma nota selecionada');
  const note = notes.find(n => n.id === currentId);
  const blob = new Blob([note.content || ''], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const filename = (note.title || 'nota').replace(/[^a-z0-9\-_.]/gi, '_') + '.txt';
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Firebase Auth UI handlers
const loginBtn = $('#loginBtn');
const logoutBtn = $('#logoutBtn');

async function initFirebaseIfAvailable() {
  // firebase-config.js should set window.FIREBASE_CONFIG or define firebaseConfig
  const cfg = window.FIREBASE_CONFIG || (window.firebaseConfig || null);
  if (!cfg) return;
  try {
    firebaseApp = firebase.initializeApp(cfg);
    firebaseAuth = firebase.auth();
    firestore = firebase.firestore();

    firebaseAuth.onAuthStateChanged(async (user) => {
      if (user) {
        currentUser = user.uid;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = '';
        setStatus('Conectado como ' + (user.email || user.displayName || user.uid));
        ensureFirstLoginIfNeeded();
        updateStatsUI();
        if (accountMenuLogged && accountMenuLoggedOut) {
          accountMenuLogged.style.display = '';
          accountMenuLoggedOut.style.display = 'none';
        }
        // load notes from firestore and merge
        const remote = await loadNotesFromFirestore();
        if (remote && remote.length) {
          // merge remote replacing local
          notes = remote;
          saveToStorage();
        }
        renderNotes();
        // Redireciona para última nota visitada ou primeira
        let lastId = localStorage.getItem(LAST_NOTE_KEY + '_' + currentUser);
        if (!lastId && notes.length) lastId = notes[0].id;
        if (lastId) openNote(lastId);
      } else {
        currentUser = null;
        loginBtn.style.display = '';
        logoutBtn.style.display = 'none';
        if (accountMenuLogged && accountMenuLoggedOut) {
          accountMenuLogged.style.display = 'none';
          accountMenuLoggedOut.style.display = '';
        }
        // Limpa notas locais ao desconectar (segurança)
        notes = [];
        currentId = null;
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(LAST_NOTE_KEY);
        } catch (_) {}
        noteTitle.value = '';
        editor.value = '';
        renderNotes();
        setStatus('Desconectado');
      }
    });
  } catch (err) {
    console.error('Erro ao inicializar Firebase', err);
  }
}

async function signInWithGoogle() {
  if (!firebaseAuth) return alert('Firebase não configurado');
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await firebaseAuth.signInWithPopup(provider);
  } catch (err) {
    alert('Erro ao entrar com Google: ' + err.message);
  }
}

async function signInWithEmail(email, password) {
  if (!firebaseAuth) return alert('Firebase não configurado');
  try {
    await firebaseAuth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      // criar conta
      if (confirm('Usuário não encontrado. Criar conta com este e-mail?')) {
        try {
          await firebaseAuth.createUserWithEmailAndPassword(email, password);
        } catch (e) { alert('Erro ao criar conta: ' + e.message); }
      }
    } else {
      alert('Erro ao entrar: ' + err.message);
    }
  }
}

async function signOut() {
  if (!firebaseAuth) return;
  const prevUid = currentUser;
  await firebaseAuth.signOut();
  // Limpa dados locais imediatamente por segurança
  notes = [];
  currentId = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_NOTE_KEY);
    if (prevUid) localStorage.removeItem(LAST_NOTE_KEY + '_' + prevUid);
  } catch (_) {}
  noteTitle.value = '';
  editor.value = '';
  renderNotes();
  setStatus('Desconectado');
}

// Redireciona para a página de login dedicada
loginBtn?.addEventListener('click', () => {
  window.location.href = 'login.html';
});

logoutBtn?.addEventListener('click', async () => {
  await signOut();
  // após sair, permanecer na página ou ir para login
  window.location.href = 'index.html';
});

// Eventos
// Responsividade do menu lateral
function toggleSidebar() {
  if (!sidebar) return;
  const collapsed = sidebar.classList.toggle('collapsed');
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  if (showSidebarBtn) {
    showSidebarBtn.style.display = collapsed ? 'block' : 'none';
  }
  // Atualiza interatividade do editor no mobile
  updateEditorInteractivityForMobile();
}

// Colapsa a sidebar sem animação (uso ao entrar numa nota no mobile)
function collapseSidebarInstant() {
  if (!sidebar) return;
  if (sidebar.classList.contains('collapsed')) return;
  sidebar.classList.add('no-anim');
  sidebar.classList.add('collapsed');
  document.body.classList.add('sidebar-collapsed');
  if (showSidebarBtn) showSidebarBtn.style.display = 'block';
  // Restaurar transições no próximo frame
  requestAnimationFrame(() => {
    sidebar.classList.remove('no-anim');
  });
  updateEditorInteractivityForMobile();
}
sidebarToggleBtn?.addEventListener('click', toggleSidebar);
sidebarToggleBtnMobile?.addEventListener('click', toggleSidebar);
showSidebarBtn?.addEventListener('click', () => {
  sidebar.classList.remove('collapsed');
  document.body.classList.remove('sidebar-collapsed');
  showSidebarBtn.style.display = 'none';
  // Atualiza interatividade do editor no mobile
  updateEditorInteractivityForMobile();
});
newNoteBtn.addEventListener('click', newNote);
exportBtn.addEventListener('click', exportNotes);
importBtn.addEventListener('click', () => importInput.click());
importInput.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (f) importNotes(f);
});

// Menus: ações da nota (popup) e conta (popup)
function togglePopup(el, force) {
  if (!el) return;
  const willShow = typeof force === 'boolean' ? force : el.hasAttribute('hidden');
  if (willShow) {
    el.removeAttribute('hidden');
  } else {
    el.setAttribute('hidden', '');
  }
}
function closeAllPopups() {
  accountMenu?.setAttribute('hidden','');
  noteActionsMenu?.setAttribute('hidden','');
}
accountBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  // Ajusta qual seção mostrar baseado na autenticação
  if (currentUser) {
    accountMenuLogged.style.display = '';
    accountMenuLoggedOut.style.display = 'none';
    ensureFirstLoginIfNeeded();
    updateStatsUI();
  } else {
    accountMenuLogged.style.display = 'none';
    accountMenuLoggedOut.style.display = '';
  }
  togglePopup(accountMenu);
});

menuExportBtn?.addEventListener('click', (e) => { e.stopPropagation(); exportNotes(); });
menuImportBtn?.addEventListener('click', (e) => { e.stopPropagation(); menuImportInput?.click(); });
menuImportInput?.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (f) importNotes(f);
});
menuClearAllBtn?.addEventListener('click', (e) => { e.stopPropagation(); clearAllNotes(); });
menuLogoutBtn?.addEventListener('click', async (e) => { e.stopPropagation(); await signOut(); window.location.href = 'index.html'; });
menuLoginBtn?.addEventListener('click', (e) => { e.stopPropagation(); window.location.href = 'login.html'; });

noteActionsFab?.addEventListener('click', (e) => { e.stopPropagation(); togglePopup(noteActionsMenu); });
menuDownloadBtn?.addEventListener('click', (e) => { e.stopPropagation(); downloadCurrentAsTxt(); closeAllPopups(); });
menuDeleteBtn?.addEventListener('click', (e) => { e.stopPropagation(); deleteCurrentNote(); closeAllPopups(); });

document.addEventListener('click', () => closeAllPopups());
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllPopups(); });
clearAllBtn.addEventListener('click', clearAllNotes);
downloadBtn.addEventListener('click', downloadCurrentAsTxt);
deleteBtn.addEventListener('click', deleteCurrentNote);

// Autosave com debounce
let saveTimeout = null;
const debounceSave = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveCurrentNote();
  }, 600);
};

noteTitle.addEventListener('input', debounceSave);
editor.addEventListener('input', debounceSave);
// Atualiza estatística de caracteres digitados
noteTitle.addEventListener('input', handleCharCountInput);
editor.addEventListener('input', handleCharCountInput);

// Busca
searchInput.addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  renderNotes(q);
});

// Atalhos
window.addEventListener('keydown', (e) => {
  const cmd = (e.ctrlKey || e.metaKey);
  if (cmd && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    newNote();
  }
  if (cmd && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveCurrentNote();
  }
  if (e.key === 'Delete') {
    // delete when focus not in input?
    const active = document.activeElement;
    if (active !== editor && active !== noteTitle && active !== searchInput) {
      e.preventDefault();
      deleteCurrentNote();
    }
  }
});

// Inicialização
// Sempre aplica o tema escuro
function applyTheme() {
  document.documentElement.setAttribute('data-theme', 'dark');
}

function init() {
  notes = loadFromStorage();
  let lastId = localStorage.getItem(LAST_NOTE_KEY);
  if (notes.length) {
    // Se houver última nota, abre ela, senão a primeira
    if (lastId && notes.find(n => n.id === lastId)) {
      currentId = lastId;
      populateEditor(notes.find(n => n.id === lastId));
    } else {
      currentId = notes[0].id;
      populateEditor(notes[0]);
    }
    setStatus((notes.length) + ' notas carregadas');
  } else {
    setStatus('Sem notas — clique em + para criar');
  }
  renderNotes();
  // Inicializa Firebase (se houver configuração em firebase-config.js)
  initFirebaseIfAvailable();
  // Aplica sempre o tema escuro
  applyTheme();
  // Garante estado inicial do botão flutuante no mobile
  if (showSidebarBtn && window.matchMedia('(max-width: 720px)').matches) {
    showSidebarBtn.style.display = 'none';
  }
  // Ajusta interatividade do editor conforme estado da sidebar no mobile
  updateEditorInteractivityForMobile();
  // Atualiza também ao redimensionar
  window.addEventListener('resize', updateEditorInteractivityForMobile);
  // Baseline para contagem de caracteres
  resetPrevLengths();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
