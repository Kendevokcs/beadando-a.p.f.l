// fireplace conf:
 //Replace these placeholder values with your real Firebase Project credentials 
 //from Firebase Console (Project Settings -> General -> Your apps -> Web app).


const firebaseConfig = {
  apiKey: "AIzaSyC7fMGHjNsg8RwQ_b60K00YRfn3QudgJqc",
  authDomain: "beadando-apfl.firebaseapp.com",
  projectId: "beadando-apfl",
  storageBucket: "beadando-apfl.firebasestorage.app",
  messagingSenderId: "703398267373",
  appId: "1:703398267373:web:06635b9b1042ff8dbd3fe4",
  measurementId: "G-CBM66TM8J1"
};

// firebase initialization
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// app state
let currentUser = null;
let unsubscribeTodos = null;
let currentAuthMode = "login"; // 'login' or 'signup'

// color
let selectedColor = "default";
const createColorOptions = document.getElementById("create-color-options");


// DOM elements
const loggedOutView = document.getElementById("logged-out-view");
const loggedInView = document.getElementById("logged-in-view");
const userDisplay = document.getElementById("user-display");
const btnOpenLogin = document.getElementById("btn-open-login");
const btnOpenSignup = document.getElementById("btn-open-signup");
const btnLogout = document.getElementById("btn-logout");

const authModal = document.getElementById("auth-modal");
const btnCloseModal = document.getElementById("btn-close-modal");
const modalTitle = document.getElementById("modal-title");
const tabLogin = document.getElementById("tab-login");
const tabSignup = document.getElementById("tab-signup");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authError = document.getElementById("auth-error");
const btnGuestLogin = document.getElementById("btn-guest-login");

const todoForm = document.getElementById("todo-form");
const todoInput = document.getElementById("todo-input");
const todoList = document.getElementById("todo-list");
const todoStatusMessage = document.getElementById("todo-status-message");
const todoFooter = document.getElementById("todo-footer");
const itemsLeft = document.getElementById("items-left");
const btnClearCompleted = document.getElementById("btn-clear-completed");

// authentication logic

// Firebase auth state changes
auth.onAuthStateChanged((user) => {
  currentUser = user;

  if (user) {
    loggedOutView.classList.add("hidden");
    loggedInView.classList.remove("hidden");
    userDisplay.textContent = user.isAnonymous 
      ? "Guest User" 
      : (user.email || "User");
    closeModal();
    listenToTodos(user.uid);
  } else {
    loggedOutView.classList.remove("hidden");
    loggedInView.classList.add("hidden");
    if (unsubscribeTodos) unsubscribeTodos();
    renderTasks([]);
    todoStatusMessage.textContent = "Please log in or sign up to save your tasks.";
    todoStatusMessage.classList.remove("hidden");
    todoFooter.classList.add("hidden");
  }
});

function setAuthMode(mode) {
  currentAuthMode = mode;
  authError.classList.add("hidden");
  authError.textContent = "";

  if (mode === "login") {
    modalTitle.textContent = "Log In";
    authSubmitBtn.textContent = "Log In";
    tabLogin.classList.add("active");
    tabSignup.classList.remove("active");
  } else {
    modalTitle.textContent = "Sign Up";
    authSubmitBtn.textContent = "Sign Up";
    tabSignup.classList.add("active");
    tabLogin.classList.remove("active");
  }
}

function openModal(mode = "login") {
  setAuthMode(mode);
  authForm.reset();
  authModal.classList.remove("hidden");
}

function closeModal() {
  authModal.classList.add("hidden");
  authError.classList.add("hidden");
}

// modal event listeners
btnOpenLogin.addEventListener("click", () => openModal("login"));
btnOpenSignup.addEventListener("click", () => openModal("signup"));
btnCloseModal.addEventListener("click", closeModal);
tabLogin.addEventListener("click", () => setAuthMode("login"));
tabSignup.addEventListener("click", () => setAuthMode("signup"));

// close modal if background overlay clicked
authModal.addEventListener("click", (e) => {
  if (e.target === authModal) closeModal();
});

// handle email and password
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.classList.add("hidden");
  const email = authEmail.value.trim();
  const password = authPassword.value;

  try {
    if (currentAuthMode === "login") {
      await auth.signInWithEmailAndPassword(email, password);
    } else {
      await auth.createUserWithEmailAndPassword(email, password);
    }
  } catch (err) {
    authError.textContent = err.message || "Authentication failed. Try again.";
    authError.classList.remove("hidden");
  }
});

// guest login (anym auth)
btnGuestLogin.addEventListener("click", async () => {
  try {
    await auth.signInAnonymously();
  } catch (err) {
    authError.textContent = err.message || "Failed to sign in as guest.";
    authError.classList.remove("hidden");
  }
});

// logout / singout
btnLogout.addEventListener("click", () => {
  auth.signOut();
});

// firestore database and to-do logic


function getTodosRef(userId) {
  // own 'todos' for each user
  return db.collection("users").doc(userId).collection("todos");
}

// real time sync
function listenToTodos(userId) {
  todoStatusMessage.textContent = "Loading tasks...";
  todoStatusMessage.classList.remove("hidden");

  if (unsubscribeTodos) unsubscribeTodos();

  unsubscribeTodos = getTodosRef(userId)
    .orderBy("createdAt", "desc")
    .onSnapshot(
      (snapshot) => {
        const todos = [];
        snapshot.forEach((doc) => {
          todos.push({ id: doc.id, ...doc.data() });
        });
        renderTasks(todos);
      },
      (error) => {
        console.error("Firestore error:", error);
        todoStatusMessage.textContent = "Error loading tasks.";
        todoStatusMessage.classList.remove("hidden");
      }
    );
}

// new task
todoForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = todoInput.value.trim();
  if (!text) return;

  if (!currentUser) {
    openModal("login");
    return;
  }

  try {
    await getTodosRef(currentUser.uid).add({
      text: text,
      completed: false,
      color: selectedColor,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    todoInput.value = "";
  } catch (err) {
    console.error("Error adding task:", err);
    alert("Could not save task. Please try again.");
  }
});
// color
createColorOptions.addEventListener("click", (e) => {
  const btn = e.target.closest(".color-btn");
  if (!btn) return;

  createColorOptions.querySelectorAll(".color-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  selectedColor = btn.dataset.color || "default";
});
// render ui elements
function renderTasks(todos) {
  todoList.innerHTML = "";

  if (todos.length === 0) {
    todoStatusMessage.textContent = currentUser ? "No tasks yet." : "Please log in to save your tasks.";
    todoStatusMessage.classList.remove("hidden");
    todoFooter.classList.add("hidden");
    return;
  }

  todoStatusMessage.classList.add("hidden");
  todoFooter.classList.remove("hidden");

  let activeCount = 0;

  todos.forEach((todo) => {
    if (!todo.completed) activeCount++;

    const li = document.createElement("li");
    // apply color present
    const colorClass = todo.color && todo.color !== "default" ? `theme-${todo.color}` : "";
    li.className = `todo-item ${todo.completed ? "completed" : ""} ${colorClass}`.trim();

    // leftside
    const left = document.createElement("div");
    left.className = "todo-left";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!todo.completed;
    checkbox.addEventListener("change", () => toggleTodo(todo.id, !todo.completed));

    const span = document.createElement("span");
    span.className = "todo-text";
    span.textContent = todo.text;

    left.appendChild(checkbox);
    left.appendChild(span);

    // right side
    const right = document.createElement("div");
    right.className = "todo-right";

    const inlinePicker = document.createElement("div");
    inlinePicker.className = "inline-color-picker";

    const colors = ["default", "blue", "green", "red", "yellow"];
    colors.forEach((c) => {
      const dot = document.createElement("button");
      dot.className = `inline-color-dot color-${c === "default" ? "none" : c}`;
      dot.title = `Change to ${c}`;
      dot.type = "button";
      dot.addEventListener("click", () => updateTodoColor(todo.id, c));
      inlinePicker.appendChild(dot);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-delete";
    deleteBtn.innerHTML = "&times;";
    deleteBtn.title = "Delete task";
    deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

    right.appendChild(inlinePicker);
    right.appendChild(deleteBtn);

    li.appendChild(left);
    li.appendChild(right);
    todoList.appendChild(li);
  });

  itemsLeft.textContent = `${activeCount} item${activeCount === 1 ? "" : "s"} left`;
}

// toggle task status
async function toggleTodo(id, completed) {
  if (!currentUser) return;
  try {
    await getTodosRef(currentUser.uid).doc(id).update({ completed });
  } catch (err) {
    console.error("Error updating status:", err);
  }
}

// delete taks
async function deleteTodo(id) {
  if (!currentUser) return;
  try {
    await getTodosRef(currentUser.uid).doc(id).delete();
  } catch (err) {
    console.error("Error deleting task:", err);
  }
}

// update exist. task color
async function updateTodoColor(id, color) {
  if (!currentUser) return;
  try {
    await getTodosRef(currentUser.uid).doc(id).update({ color });
  } catch (err) {
    console.error("Error updating task color:", err);
  }
}

// clear completed tasks
btnClearCompleted.addEventListener("click", async () => {
  if (!currentUser) return;
  try {
    const snapshot = await getTodosRef(currentUser.uid)
      .where("completed", "==", true)
      .get();

    const batch = db.batch();
    snapshot.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  } catch (err) {
    console.error("Error clearing tasks:", err);
  }
});
