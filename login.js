// login.js - lógica da página de login

const googleBtn = document.getElementById('googleBtn');
const emailForm = document.getElementById('emailForm');
const backBtn = document.getElementById('backBtn');

function initFirebase() {
  const cfg = window.FIREBASE_CONFIG || (window.firebaseConfig || null);
  if (!cfg) {
    console.info('Firebase não configurado (login). Crie firebase-config.js');
    return null;
  }
  try {
    firebase.initializeApp(cfg);
    return firebase;
  } catch (err) {
    console.error('Erro inicializando Firebase em login:', err);
    return null;
  }
}

const fb = initFirebase();
const auth = fb ? firebase.auth() : null;

async function signInWithGoogle() {
  if (!auth) return alert('Firebase não configurado. Veja README.');
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
    window.location.href = 'index.html';
  } catch (err) {
    alert('Erro ao autenticar com Google: ' + err.message);
  }
}

async function signInWithEmail(email, password) {
  if (!auth) return alert('Firebase não configurado. Veja README.');
  try {
    await auth.signInWithEmailAndPassword(email, password);
    window.location.href = 'index.html';
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      if (confirm('Usuário não encontrado. Deseja criar uma conta com este email?')) {
        try {
          await auth.createUserWithEmailAndPassword(email, password);
          window.location.href = 'index.html';
        } catch (e) { alert('Erro ao criar conta: ' + e.message); }
      }
    } else {
      alert('Erro ao entrar: ' + err.message);
    }
  }
}

googleBtn.addEventListener('click', signInWithGoogle);

emailForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) return alert('Preencha email e senha');
  signInWithEmail(email, password);
});

backBtn.addEventListener('click', () => window.location.href = 'index.html');
