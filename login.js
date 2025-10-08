// login.js - lógica da página de login

const googleBtn = document.getElementById('googleBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showLoginBtn = document.getElementById('showLoginBtn');
const showRegisterBtn = document.getElementById('showRegisterBtn');

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


// Alternância entre formulários

function animateForm(show, hide) {
  hide.classList.remove('spring-enter');
  hide.classList.add('spring-leave');
  setTimeout(() => {
    hide.style.display = 'none';
    hide.classList.remove('spring-leave');
    show.style.display = '';
    show.classList.add('spring-enter');
    setTimeout(() => show.classList.remove('spring-enter'), 700);
  }, 400);
}

showLoginBtn.addEventListener('click', () => {
  animateForm(loginForm, registerForm);
  showLoginBtn.classList.add('primary');
  showRegisterBtn.classList.remove('primary');
});
showRegisterBtn.addEventListener('click', () => {
  animateForm(registerForm, loginForm);
  showLoginBtn.classList.remove('primary');
  showRegisterBtn.classList.add('primary');
});

googleBtn.addEventListener('click', signInWithGoogle);

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) return alert('Preencha email e senha');
  signInWithEmail(email, password);
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirm = document.getElementById('registerPasswordConfirm').value;
  if (!email || !password || !confirm) return alert('Preencha todos os campos');
  if (password !== confirm) return alert('As senhas não coincidem');
  // Validação de senha forte
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  if (!strongRegex.test(password)) {
    return alert('A senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e símbolo.');
  }
  if (!auth) return alert('Firebase não configurado. Veja README.');
  try {
    await auth.createUserWithEmailAndPassword(email, password);
    window.location.href = 'index.html';
  } catch (err) {
    alert('Erro ao criar conta: ' + err.message);
  }
});
