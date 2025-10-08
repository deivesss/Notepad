Notepad — Black & Purple

Projeto simples: um notepad online com tema escuro preto e roxo.

Funcionalidades:
- Criar múltiplas notas
- Editar e salvar automaticamente (localStorage)
- Buscar notas
- Exportar/Importar notas (.json)
- Baixar nota como .txt
- Atalhos: Ctrl+N (nova nota), Ctrl+S (salvar), Delete (apagar nota selecionada)

Como usar:
1. Abra `index.html` no navegador.
2. Clique em + para criar uma nota.
3. Use o campo de busca para filtrar notas.
4. Exportar/Importar no rodapé da sidebar.

Observações:
- As notas são salvas no armazenamento local do navegador (localStorage).
- Importar adiciona as notas do arquivo ao topo da lista.

Autenticação (opcional) - Firebase
---------------------------------
Para permitir login por Google ou e-mail/senha e sincronizar notas por usuário, siga estes passos:

1. Crie um projeto no Firebase (https://console.firebase.google.com/).
2. Ative Authentication -> Sign-in method -> Google e Email/Password.
3. Ative Firestore Database em modo de teste (ou configure regras apropriadas).
4. Copie as configurações do projeto (Project settings -> SDK) e crie um arquivo `firebase-config.js` na raiz do projeto com o conteúdo:

```js
window.FIREBASE_CONFIG = {
	apiKey: "...",
	authDomain: "your-project.firebaseapp.com",
	projectId: "your-project-id",
	storageBucket: "your-project.appspot.com",
	messagingSenderId: "...",
	appId: "1:...:web:..."
};
```

Ou copie `firebase-config.sample.js` para `firebase-config.js` e cole as credenciais.

Ao abrir `index.html`, se o Firebase estiver configurado, o botão "Entrar" permitirá login via Google ou via e-mail/senha.

Com o usuário logado, as notas serão sincronizadas no Firestore (coleção `notes`, documento por UID do usuário). Se não houver configuração do Firebase, o app continuará usando apenas o `localStorage`.
