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

// Estado
let notes = []; // { id, title, content, updated }
let currentId = null;
const STORAGE_KEY = 'notepad_notes_v1';

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
const loadFromStorage = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

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
}

function populateEditor(note) {
  noteTitle.value = note.title;
  editor.value = note.content;
  currentId = note.id;
}

function openNote(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  populateEditor(note);
  setStatus('Nota aberta — ' + (note.title || 'Sem título'));
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
  notes = [];
  saveToStorage();
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
      // basic validation
      const clean = imported.map(n => ({
        id: n.id || 'note_' + Math.random().toString(36).slice(2,9),
        title: n.title || '',
        content: n.content || '',
        updated: n.updated || now()
      }));
      notes = clean.concat(notes);
      saveToStorage();
  if (useFirestore()) saveNotesToFirestore();
      renderNotes();
      setStatus('Importação concluída');
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
        // load notes from firestore and merge
        const remote = await loadNotesFromFirestore();
        if (remote && remote.length) {
          // merge remote replacing local
          notes = remote;
          saveToStorage();
        }
        renderNotes();
      } else {
        currentUser = null;
        loginBtn.style.display = '';
        logoutBtn.style.display = 'none';
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
  await firebaseAuth.signOut();
  // Limpa notas locais da sessão ao sair
  notes = [];
  currentId = null;
  saveToStorage();
  renderNotes();
  noteTitle.value = '';
  editor.value = '';
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
newNoteBtn.addEventListener('click', newNote);
exportBtn.addEventListener('click', exportNotes);
importBtn.addEventListener('click', () => importInput.click());
importInput.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (f) importNotes(f);
});
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
function init() {
  notes = loadFromStorage();
  if (notes.length) {
    currentId = notes[0].id;
    populateEditor(notes[0]);
    setStatus((notes.length) + ' notas carregadas');
  } else {
    // Cria uma nota inicial e já salva
    const id = 'note_' + Math.random().toString(36).slice(2,9);
    const note = { id, title: '', content: '', updated: now() };
    notes.unshift(note);
    currentId = id;
    saveToStorage();
    populateEditor(note);
    setStatus('Sem notas — clique em + para criar');
  }
  renderNotes();
  // Inicializa Firebase (se houver configuração em firebase-config.js)
  initFirebaseIfAvailable();
}

init();
