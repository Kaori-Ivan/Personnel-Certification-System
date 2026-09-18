/* user 功能整併檔 */
(()=>{
const CURRENT_VIEW=document.body.dataset.view;

if(CURRENT_VIEW==="my-certifications"){try{
// Demonstration records only; replace with authorized Python API results later.
window.certificationDemo = Object.freeze({
  "cnc-001": {
    name: "CNC 車床操作", status: "in-progress", label: "進行中",
    date: "2024/05/15", dateLabel: "申請日期", stage: "資料審核中",
    description: "申請資料正在審核，後續考核尚未開始。",
    steps: [
      { title: "提交申請", state: "complete", note: "2024/05/15 已提交" },
      { title: "資料審核", state: "current", note: "等待資料審核結果" },
      { title: "學科考核", state: "waiting", note: "尚未安排" },
      { title: "術科考核", state: "waiting", note: "尚未安排" },
      { title: "最終審核", state: "waiting", note: "尚未開始" },
    ],
    records: [{ date: "2024/05/15", text: "提交 CNC 車床操作認證申請。" }],
  },
  "ecdis-001": {
    name: "ECDIS 操作", status: "pending", label: "待審核",
    date: "2024/05/18", dateLabel: "申請日期", stage: "審核中",
    description: "此項認證正在等待審核結果。詳細考核紀錄尚未提供。",
    steps: [
      { title: "提交申請", state: "complete", note: "2024/05/18 已提交" },
      { title: "審核結果", state: "current", note: "等待管理者審核" },
      { title: "認證核發", state: "waiting", note: "審核通過後辦理" },
    ],
    records: [{ date: "2024/05/18", text: "提交 ECDIS 操作認證申請。" }],
  },
});

}catch(error){console.error("certification-demo.js",error);}}

if(CURRENT_VIEW==="my-certifications"){try{
const statusButtons = document.querySelectorAll(".status-tabs button");
const certificationCards = document.querySelectorAll(".certification-card");
const labels = { certified: "已認證", "in-progress": "進行中", pending: "待審核" };

certificationCards.forEach(card => {
  const record = certificationDemo[card.dataset.id];

  // 已認證卡片沒有 data-id，不需要讀取示範資料
  if (!record) return;

  const nameElement = card.querySelector("h2");
  const statusElement = card.querySelector(":scope > span");
  const progressElement = card.querySelector(".certification-progress");
  const detailLink = card.querySelector(".detail-link");

  if (nameElement) {
    nameElement.textContent = record.name;
  }

  if (statusElement) {
    statusElement.textContent = record.label;
  }

  if (progressElement) {
    progressElement.textContent = `認證進度：${record.stage}`;
  }

  if (detailLink) {
    detailLink.setAttribute(
      "aria-label",
      `查看${record.name}的認證詳情`
    );
  }
});

function showStatus(status) {
  const selected = Object.hasOwn(labels, status) ? status : "certified";
  statusButtons.forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.status === selected));
    const count = Array.from(certificationCards).filter(card => card.dataset.status === button.dataset.status).length;
    button.textContent = `${labels[button.dataset.status]}（${count}）`;
  });
  certificationCards.forEach(card => { card.hidden = card.dataset.status !== selected; });
}

function readStatus() {
  showStatus(new URLSearchParams(window.location.search).get("status"));
}

statusButtons.forEach(button => {
  button.addEventListener("click", () => {
    const url = new URL(window.location.href);
    url.searchParams.set("status", button.dataset.status);
    if (url.href !== window.location.href) history.pushState(null, "", url);
    showStatus(button.dataset.status);
  });
});
window.addEventListener("popstate", readStatus);
readStatus();

}catch(error){console.error("my-certifications.js",error);}}

if(CURRENT_VIEW==="certification-detail"){try{
// Demonstration records only; replace with authorized Python API results later.
window.certificationDemo = Object.freeze({
  "cnc-001": {
    name: "CNC 車床操作", status: "in-progress", label: "進行中",
    date: "2024/05/15", dateLabel: "申請日期", stage: "資料審核中",
    description: "申請資料正在審核，後續考核尚未開始。",
    steps: [
      { title: "提交申請", state: "complete", note: "2024/05/15 已提交" },
      { title: "資料審核", state: "current", note: "等待資料審核結果" },
      { title: "學科考核", state: "waiting", note: "尚未安排" },
      { title: "術科考核", state: "waiting", note: "尚未安排" },
      { title: "最終審核", state: "waiting", note: "尚未開始" },
    ],
    records: [{ date: "2024/05/15", text: "提交 CNC 車床操作認證申請。" }],
  },
  "ecdis-001": {
    name: "ECDIS 操作", status: "pending", label: "待審核",
    date: "2024/05/18", dateLabel: "申請日期", stage: "審核中",
    description: "此項認證正在等待審核結果。詳細考核紀錄尚未提供。",
    steps: [
      { title: "提交申請", state: "complete", note: "2024/05/18 已提交" },
      { title: "審核結果", state: "current", note: "等待管理者審核" },
      { title: "認證核發", state: "waiting", note: "審核通過後辦理" },
    ],
    records: [{ date: "2024/05/18", text: "提交 ECDIS 操作認證申請。" }],
  },
});

}catch(error){console.error("certification-demo.js",error);}}

if(CURRENT_VIEW==="certification-detail"){try{
const id = new URLSearchParams(location.search).get("id");
const record = Object.hasOwn(certificationDemo, id) ? certificationDemo[id] : null;
if (!record) {
  document.querySelector("#missing-record").hidden = false;
} else {
  document.title = `${record.name}｜認證詳情`;

document.querySelector("#back-to-list").href =
  `user.html?view=my-certifications&status=${record.status}`;

const states = {
  complete: "已完成",
  current: "目前階段",
  waiting: "尚未開始"
};
  record.steps.forEach(step => {
    const item = document.createElement("li");
    item.dataset.state = step.state;
    if (step.state === "current") item.setAttribute("aria-current", "step");
    const title = document.createElement("strong");
    title.textContent = step.title;
    const label = document.createElement("span");
    label.className = "step-label";
    label.textContent = states[step.state];
    title.append(label);
    const note = document.createElement("p");
    note.textContent = step.note;
    item.append(title, note);
    document.querySelector("#progress-list").append(item);
  });
  document.querySelector("#record-content").hidden = false;
}

}catch(error){console.error("certification-detail.js",error);}}

if(CURRENT_VIEW==="my-certifications"){
  const buttons=[...document.querySelectorAll(".status-tabs button")];
  const cards=[...document.querySelectorAll(".certification-card")];
  const names={certified:"已認證","in-progress":"進行中",pending:"待審核"};
  const render=status=>{
    const selected=names[status]?status:"certified";
    buttons.forEach(button=>{button.setAttribute("aria-selected",String(button.dataset.status===selected));button.textContent=names[button.dataset.status]+"（"+cards.filter(card=>card.dataset.status===button.dataset.status).length+"）";});
    cards.forEach(card=>{card.hidden=card.dataset.status!==selected;});
  };
  buttons.forEach(button=>{button.onclick=()=>{const url=new URL(location.href);url.searchParams.set("view","my-certifications");url.searchParams.set("status",button.dataset.status);history.pushState(null,"",url);render(button.dataset.status);};});
  render(new URLSearchParams(location.search).get("status"));
}

})();
