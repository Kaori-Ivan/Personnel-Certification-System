/* Frontend demo only. Python must enforce authentication and authorization later. */
(() => {
  "use strict";
  const ROUTES={"login.html":"index.html?view=login","change-password.html":"index.html?view=change-password","home.html":"user.html?view=home","my-certifications.html":"user.html?view=my-certifications","in-progress.html":"user.html?view=in-progress","pending-review.html":"user.html?view=pending-review","certification-detail.html":"user.html?view=certification-detail","question-bank.html":"question-bank.html","leader-assessment.html":"leader.html?view=leader-assessment","leader-assessment-form.html":"leader.html?view=leader-assessment-form","leader-assessment-evaluation.html":"leader.html?view=leader-assessment-evaluation","admin-dashboard.html":"admin.html?view=admin-dashboard","admin-personnel.html":"admin.html?view=admin-personnel","admin-personnel-detail.html":"admin.html?view=admin-personnel-detail","admin-certifications.html":"admin.html?view=admin-certifications","admin-review.html":"admin.html?view=admin-review"};
  const route = name => ROUTES[name] || name;
  const KEY = "personnel-auth-demo-v2";
  const EMPLOYEE = "E2025001";
  const roles = Object.freeze({ E2025001: "user", A2025001: "admin" });
  const freshAccount = () => ({ mustChange: true, salt: null, hash: null });
  const fresh = () => ({ active: null, accounts: { E2025001: freshAccount(), A2025001: freshAccount() } });
  function readStore() {
    const raw = sessionStorage.getItem(KEY);
    try {
      if (!raw) {
        const store = fresh();
        const old = JSON.parse(sessionStorage.getItem("personnel-auth-demo-v1") || "null");
        if (old?.employee === EMPLOYEE && typeof old.mustChange === "boolean" &&
            (old.mustChange || (typeof old.hash === "string" && typeof old.salt === "string"))) {
          store.accounts[EMPLOYEE] = { mustChange: old.mustChange, salt: old.salt, hash: old.hash };
          store.active = old.signedIn === true ? EMPLOYEE : null;
        }
        save(store);
        return store;
      }
      const state = JSON.parse(raw);
      if (!state.accounts || (state.active !== null && !Object.hasOwn(roles, state.active))) return fresh();
      for (const employee of Object.keys(roles)) {
        const account = state.accounts[employee];
        if (!account || typeof account.mustChange !== "boolean" ||
            (!account.mustChange && (typeof account.hash !== "string" || typeof account.salt !== "string"))) return fresh();
      }
      return state;
    } catch { return fresh(); }
  }
  function read() {
    const store = readStore();
    return { employee: store.active, role: roles[store.active] || null, signedIn: Boolean(store.active),
      ...(store.active ? store.accounts[store.active] : freshAccount()) };
  }
  function destination() {
    const state = read();
    if (!state.signedIn) return route("login.html");
    if (state.mustChange) return route("change-password.html");
    return route(state.role === "admin" ? "admin-dashboard.html" : "home.html");
  }
  function save(state) { sessionStorage.setItem(KEY, JSON.stringify(state)); }
  async function hashPassword(password, salt) {
    if (!globalThis.crypto?.subtle) throw new Error("請透過 localhost 或 HTTPS 開啟測試網站。");
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: 100000, hash: "SHA-256" }, key, 256);
    return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, "0")).join("");
  }
  function passwordError(password, employee = read().employee) {
    if (password.length < 8) return "新密碼至少需要 8 碼。";
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return "新密碼必須同時包含英文字母與數字。";
    if (password === employee) return "新密碼不可與工號（預設密碼）相同。";
    return "";
  }
  window.Auth = {
    demoEmployee: EMPLOYEE,
    read,
    destination,
    passwordError,
    async login(employee, password) {
      if (!Object.hasOwn(roles, employee)) return false;
      const store = readStore();
      const state = store.accounts[employee];
      const valid = state.mustChange ? password === employee : await hashPassword(password, state.salt) === state.hash;
      if (!valid) return false;
      store.active = employee;
      save(store);
      return true;
    },
    async changePassword(password) {
      const state = read();
      if (!state.signedIn || !state.mustChange) throw new Error("請重新登入後再修改密碼。");
      const error = passwordError(password, state.employee);
      if (error) throw new Error(error);
      const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join("");
      const hash = await hashPassword(password, salt);
      const store = readStore();
      if (store.active !== state.employee) throw new Error("登入狀態已改變，請重新登入。");
      store.accounts[state.employee] = { mustChange: false, salt, hash };
      save(store);
    },
    logout() {
      const store = readStore();
      store.active = null;
      save(store);
      location.replace(route("login.html"));
    },
  };
  const page = (document.body.dataset.view || "login") + ".html";
  try {
    const state = read();
    if (page !== "login.html") {
      if (!state.signedIn) location.replace(route("login.html"));
      else if (state.mustChange && page !== "change-password.html") location.replace(route("change-password.html"));
      else if (!state.mustChange && page === "change-password.html") location.replace(destination());
      else if (!state.mustChange && page.startsWith("admin-") && state.role !== "admin") location.replace(route("home.html"));
    } else if (state.signedIn) location.replace(destination());
  } catch {
    if (page !== "login.html") location.replace(route("login.html"));
  }
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-logout]").forEach(button => button.addEventListener("click", () => {
      try { window.Auth.logout(); } catch { location.replace(route("login.html")); }
    }));
  });
  window.addEventListener("pageshow", event => { if (event.persisted) location.reload(); });
})();

/* auth 功能整併檔 */
(()=>{
const CURRENT_VIEW=document.body.dataset.view;

if(CURRENT_VIEW==="login"){try{
const loginForm = document.querySelector("#login-form");
const accountInput = document.querySelector("#account");
const passwordInput = document.querySelector("#password");
const passwordToggle = document.querySelector(".password-toggle");
const loginMessage = document.querySelector("#login-message");

passwordToggle.addEventListener("click", () => {
  const isPasswordVisible = passwordInput.type === "text";

  passwordInput.type = isPasswordVisible ? "password" : "text";
  passwordToggle.setAttribute("aria-pressed", String(!isPasswordVisible));
  passwordToggle.setAttribute(
    "aria-label",
    isPasswordVisible ? "顯示密碼" : "隱藏密碼",
  );
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = loginForm.querySelector('[type="submit"]');
  if (submit.disabled) return;
  loginMessage.textContent = "";

  if (!accountInput.value.trim()) {
    loginMessage.textContent = "請輸入人員工號。";
    accountInput.focus();
    return;
  }

  if (!passwordInput.value) {
    loginMessage.textContent = "請輸入密碼。";
    passwordInput.focus();
    return;
  }

  submit.disabled = true;
  submit.textContent = "正在登入…";
  try {
    if (!await Auth.login(accountInput.value.trim(), passwordInput.value)) {
      loginMessage.textContent = "工號或密碼不正確，請重新輸入。";
      passwordInput.value = "";
      passwordInput.focus();
      return;
    }
    passwordInput.value = "";
    window.location.replace(Auth.destination());
  } catch {
    loginMessage.textContent = "無法登入測試模式，請確認瀏覽器允許網站儲存資料，並透過 localhost 或 HTTPS 開啟。";
  } finally {
    submit.disabled = false;
    submit.textContent = "登入";
  }
});

}catch(error){console.error("login.js",error);}}

if(CURRENT_VIEW==="change-password"){try{
const form = document.querySelector("#change-password-form");
const newPassword = document.querySelector("#new-password");
const confirmation = document.querySelector("#confirm-password");
const message = document.querySelector("#change-message");
const submit = form.querySelector('[type="submit"]');
document.querySelector("#employee-id").textContent = Auth.read().employee || "";
document.querySelectorAll("[data-toggle]").forEach(button => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.toggle);
    const visible = input.type === "password";
    input.type = visible ? "text" : "password";
    button.setAttribute("aria-pressed", String(visible));
    button.setAttribute("aria-label", `${visible ? "隱藏" : "顯示"}${input === newPassword ? "新密碼" : "確認密碼"}`);
  });
});
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (submit.disabled) return;
  message.textContent = "";
  newPassword.removeAttribute("aria-invalid");
  confirmation.removeAttribute("aria-invalid");
  const error = Auth.passwordError(newPassword.value);
  if (error) {
    message.textContent = error;
    newPassword.setAttribute("aria-invalid", "true");
    newPassword.focus();
    return;
  }
  if (newPassword.value !== confirmation.value) {
    message.textContent = "兩次輸入的密碼不一致，請重新確認。";
    confirmation.setAttribute("aria-invalid", "true");
    confirmation.focus();
    return;
  }
  submit.disabled = true;
  submit.textContent = "正在儲存…";
  try {
    await Auth.changePassword(newPassword.value);
    form.reset();
    location.replace(Auth.destination());
  } catch (error) {
    message.textContent = error.message.includes("localhost") ? error.message : "無法儲存測試設定，請確認瀏覽器允許網站儲存資料後重新登入。";
    submit.disabled = false;
    submit.textContent = "儲存密碼並進入系統";
  }
});

}catch(error){console.error("change-password.js",error);}}

})();
