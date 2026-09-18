/* admin 功能整併檔 */
(()=>{
const CURRENT_VIEW=document.body.dataset.view;

if(CURRENT_VIEW==="admin-personnel"){try{
(() => {
  "use strict";

  const people = [
    { id: "E2025001", name: "王小明", department: "機械課", employment: "active", certified: 6, progress: 1, pending: 1, allowance: 3000 },
    { id: "E2025002", name: "李大華", department: "機械課", employment: "active", certified: 5, progress: 1, pending: 0, allowance: 2500 },
    { id: "E2025003", name: "張志強", department: "電焊課", employment: "active", certified: 4, progress: 0, pending: 1, allowance: 2000 },
    { id: "E2025004", name: "陳小美", department: "安環課", employment: "active", certified: 3, progress: 2, pending: 0, allowance: 1600 },
    { id: "E2025005", name: "林志遠", department: "天車課", employment: "active", certified: 2, progress: 1, pending: 0, allowance: 1000 },
  ];

  const search = document.querySelector("#personnel-search");
  const departmentFilter = document.querySelector("#department-filter");
  const employmentFilter = document.querySelector("#employment-filter");
  const certificationFilter = document.querySelector("#certification-filter");
  const tableBody = document.querySelector("#personnel-table-body");
  const count = document.querySelector("#personnel-count");
  const empty = document.querySelector("#empty-personnel");
  const dialog = document.querySelector("#person-dialog");
  const form = document.querySelector("#person-form");
  const formError = document.querySelector("#person-form-error");

  const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);

  function matchesCertification(person, value) {
    if (value === "certified") return person.certified > 0;
    if (value === "in-progress") return person.progress > 0;
    if (value === "pending") return person.pending > 0;
    return true;
  }

  function getFilteredPeople() {
    const keyword = search.value.trim().toLowerCase();
    return people.filter(person => {
      const keywordMatch = !keyword || [person.name, person.id, person.department].some(value => value.toLowerCase().includes(keyword));
      const departmentMatch = departmentFilter.value === "all" || person.department === departmentFilter.options[departmentFilter.selectedIndex].text;
      const employmentMatch = employmentFilter.value === "all" || person.employment === employmentFilter.value;
      return keywordMatch && departmentMatch && employmentMatch && matchesCertification(person, certificationFilter.value);
    });
  }

  function render() {
    const filtered = getFilteredPeople();
    tableBody.innerHTML = filtered.map(person => `
      <tr>
        <td data-label="姓名">${escapeHtml(person.name)}</td>
        <td data-label="工號">${escapeHtml(person.id)}</td>
        <td data-label="部門">${escapeHtml(person.department)}</td>
        <td data-label="在職狀態">${person.employment === "active" ? "在職" : "離職"}</td>
        <td data-label="已認證">${person.certified}</td>
        <td data-label="進行中">${person.progress}</td>
        <td data-label="待審核">${person.pending}</td>
        <td data-label="每月加給">NT$ ${person.allowance.toLocaleString("zh-TW")}</td>
        <td data-label="操作"><a href="admin.html?view=admin-personnel-detail&employee=${encodeURIComponent(person.id)}">查看詳情</a></td>
      </tr>`).join("");
    count.textContent = `目前顯示 ${filtered.length} 人，共 ${people.length} 人`;
    empty.hidden = filtered.length !== 0;
    tableBody.closest(".table-wrapper").hidden = filtered.length === 0;
  }

  [search, departmentFilter, employmentFilter, certificationFilter].forEach(control => {
    control.addEventListener(control === search ? "input" : "change", render);
  });

  document.querySelector("#add-person").addEventListener("click", () => {
    form.reset();
    formError.textContent = "";
    dialog.showModal();
    document.querySelector("#new-employee-id").focus();
  });

  form.addEventListener("submit", event => {
    if (event.submitter?.value === "cancel") return;
    event.preventDefault();
    const id = document.querySelector("#new-employee-id").value.trim().toUpperCase();
    const name = document.querySelector("#new-employee-name").value.trim();
    const department = document.querySelector("#new-department").value;
    const employment = document.querySelector("#new-employment").value;
    if (!id || !name || !department) {
      formError.textContent = "請完整填寫工號、姓名與部門。";
      return;
    }
    if (!/^[A-Z0-9-]{3,20}$/.test(id)) {
      formError.textContent = "工號僅能包含英文字母、數字或連字號。";
      return;
    }
    if (people.some(person => person.id.toUpperCase() === id)) {
      formError.textContent = "此工號已存在，請確認後再試。";
      return;
    }
    people.unshift({ id, name, department, employment, certified: 0, progress: 0, pending: 0, allowance: 0 });
    dialog.close();
    search.value = "";
    departmentFilter.value = "all";
    employmentFilter.value = "all";
    certificationFilter.value = "all";
    render();
  });

  document.querySelector("#export-personnel").addEventListener("click", () => {
    const rows = getFilteredPeople();
    if (!rows.length) {
      alert("目前沒有可匯出的資料。");
      return;
    }
    const csvRows = [
      ["姓名", "工號", "部門", "在職狀態", "已認證", "進行中", "待審核", "每月加給"],
      ...rows.map(person => [person.name, person.id, person.department, person.employment === "active" ? "在職" : "離職", person.certified, person.progress, person.pending, person.allowance]),
    ];
    const csv = "\uFEFF" + csvRows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `人員清單_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  });

  render();
})();

}catch(error){console.error("admin-personnel.js",error);}}

if(CURRENT_VIEW==="admin-certifications"){try{
const searchInput=document.querySelector("#certification-search"),tabs=document.querySelectorAll(".certification-tabs button"),list=document.querySelector("#certification-list"),count=document.querySelector("#result-count"),empty=document.querySelector("#empty-message"),dialog=document.querySelector("#certification-dialog"),form=document.querySelector("#certification-form"),errorMessage=document.querySelector("#form-error");let selectedStatus="all";const rows=()=>Array.from(list.querySelectorAll("tr"));const money=value=>`NT$ ${Number(value).toLocaleString("zh-TW")}`;function filterRows(){const keyword=searchInput.value.trim().toLowerCase();let visible=0;rows().forEach(row=>{row.hidden=!((selectedStatus==="all"||row.dataset.status===selectedStatus)&&row.textContent.toLowerCase().includes(keyword));if(!row.hidden)visible++});count.textContent=`目前顯示 ${visible} 項，共 ${rows().length} 項`;empty.hidden=visible!==0}function bind(button){button.addEventListener("click",()=>openForm(button.closest("tr")))}function openForm(row=null){form.reset();errorMessage.textContent="";document.querySelector("#edit-index").value=row?rows().indexOf(row):"";document.querySelector("#dialog-title").textContent=row?"編輯認證項目":"新增認證項目";if(row){document.querySelector("#certification-name").value=row.cells[0].textContent;document.querySelector("#certification-category").value=row.cells[1].textContent;document.querySelector("#certification-years").value=parseInt(row.cells[2].textContent,10);document.querySelector("#certification-allowance").value=row.cells[3].textContent.replace(/\D/g,"");document.querySelector("#certification-status").value=row.dataset.status}dialog.showModal()}function render(data,passed=0){const row=document.createElement("tr");row.dataset.status=data.status;[data.name,data.category,`${data.years} 年`,money(data.allowance)].forEach(value=>{const cell=row.insertCell();cell.textContent=value});const statusCell=row.insertCell(),status=document.createElement("span");status.className=`status ${data.status}`;status.textContent=data.status==="active"?"啟用中":"已停產";statusCell.append(status);row.insertCell().textContent=passed;const action=row.insertCell(),button=document.createElement("button");button.type="button";button.className="detail-button";button.textContent="編輯";bind(button);action.append(button);return row}searchInput.addEventListener("input",filterRows);tabs.forEach(tab=>tab.addEventListener("click",()=>{selectedStatus=tab.dataset.status;tabs.forEach(button=>button.setAttribute("aria-selected",String(button===tab)));filterRows()}));document.querySelector("#reset-certifications").addEventListener("click",()=>{searchInput.value="";selectedStatus="all";tabs.forEach(button=>button.setAttribute("aria-selected",String(button.dataset.status==="all")));filterRows()});document.querySelector("#add-certification").addEventListener("click",()=>openForm());document.querySelectorAll(".detail-button").forEach(bind);form.addEventListener("submit",event=>{if(event.submitter?.value==="cancel")return;event.preventDefault();const data={name:document.querySelector("#certification-name").value.trim(),category:document.querySelector("#certification-category").value,years:document.querySelector("#certification-years").value,allowance:document.querySelector("#certification-allowance").value,status:document.querySelector("#certification-status").value};if(!data.name||!data.category||!data.years||data.allowance===""){errorMessage.textContent="請完整填寫所有欄位。";return}const index=document.querySelector("#edit-index").value;if(index==="")list.prepend(render(data));else{const old=rows()[Number(index)];old.replaceWith(render(data,old.cells[5].textContent))}dialog.close();filterRows()});filterRows();

}catch(error){console.error("admin-certifications.js",error);}}

if(CURRENT_VIEW==="admin-review"){try{
const search=document.querySelector("#review-search"),department=document.querySelector("#department-filter"),certification=document.querySelector("#certification-filter"),rows=Array.from(document.querySelectorAll("#review-list tr")),checks=Array.from(document.querySelectorAll(".row-check")),selectAll=document.querySelector("#select-all"),approve=document.querySelector("#batch-approve"),reject=document.querySelector("#batch-reject"),selection=document.querySelector("#selection-message"),count=document.querySelector("#review-count"),empty=document.querySelector("#empty-review"),dialog=document.querySelector("#review-dialog"),form=document.querySelector("#review-form"),title=document.querySelector("#dialog-title"),summary=document.querySelector("#dialog-summary"),reasonField=document.querySelector("#reason-field"),reason=document.querySelector("#reject-reason"),error=document.querySelector("#dialog-error"),confirmAction=document.querySelector("#confirm-action");let action="approve",targets=[];function visibleRows(){return rows.filter(row=>!row.hidden)}function updateSelection(){const selected=checks.filter(box=>box.checked);selection.textContent=selected.length?`已選取 ${selected.length} 筆申請`:"尚未選取申請";approve.disabled=reject.disabled=selected.length===0;const visible=visibleRows().map(row=>row.querySelector(".row-check"));selectAll.checked=visible.length>0&&visible.every(box=>box.checked);selectAll.indeterminate=visible.some(box=>box.checked)&&!selectAll.checked}function filterRows(){const keyword=search.value.trim().toLowerCase();let visible=0;rows.forEach(row=>{const cells=row.cells;const matchesKeyword=row.textContent.toLowerCase().includes(keyword);const matchesDepartment=department.value==="all"||cells[3].textContent===department.value;const matchesCertification=certification.value==="all"||cells[4].textContent===certification.value;row.hidden=!(matchesKeyword&&matchesDepartment&&matchesCertification);if(row.hidden)row.querySelector(".row-check").checked=false;else visible+=1});count.textContent=`目前顯示 ${visible} 筆，共 ${rows.length} 筆待審核`;empty.hidden=visible!==0;updateSelection()}function openDialog(nextAction,nextTargets){action=nextAction;targets=nextTargets;const names=targets.map(row=>`${row.cells[1].textContent}－${row.cells[4].textContent}`);title.textContent=action==="approve"?"確認通過認證":"確認駁回申請";summary.textContent=`將處理 ${targets.length} 筆申請：${names.join("、")}`;reasonField.hidden=action!=="reject";reason.value="";error.textContent="";confirmAction.textContent=action==="approve"?"確認通過":"確認駁回";dialog.showModal()}[search,department,certification].forEach(control=>control.addEventListener(control===search?"input":"change",filterRows));checks.forEach(box=>box.addEventListener("change",updateSelection));selectAll.addEventListener("change",()=>{visibleRows().forEach(row=>row.querySelector(".row-check").checked=selectAll.checked);updateSelection()});document.querySelector("#reset-review").addEventListener("click",()=>{search.value="";department.value=certification.value="all";filterRows()});approve.addEventListener("click",()=>openDialog("approve",rows.filter(row=>row.querySelector(".row-check").checked)));reject.addEventListener("click",()=>openDialog("reject",rows.filter(row=>row.querySelector(".row-check").checked)));document.querySelectorAll(".review-button").forEach(button=>button.addEventListener("click",()=>openDialog("approve",[button.closest("tr")])));form.addEventListener("submit",event=>{if(event.submitter?.value==="cancel")return;if(action==="reject"&&!reason.value.trim()){event.preventDefault();error.textContent="駁回申請時必須填寫原因。";reason.focus();return}targets.forEach(row=>row.remove());dialog.addEventListener("close",()=>{rows.splice(0,rows.length,...Array.from(document.querySelectorAll("#review-list tr")));filterRows()},{once:true})});filterRows();

}catch(error){console.error("admin-review.js",error);}}

if(CURRENT_VIEW==="admin-personnel-detail"){
  const people={
    E2025001:{name:"王小明",department:"機械課",title:"技術員",start:"2023/03/15",certified:3,progress:1,pending:1,allowance:3000},
    E2025002:{name:"李大華",department:"機械課",title:"資深技術員",start:"2022/08/01",certified:5,progress:1,pending:0,allowance:2500},
    E2025003:{name:"張志強",department:"電焊課",title:"焊接技術員",start:"2023/11/06",certified:4,progress:0,pending:1,allowance:2000},
    E2025004:{name:"陳小美",department:"安環課",title:"安全管理員",start:"2024/02/19",certified:3,progress:2,pending:0,allowance:1600},
    E2025005:{name:"林志遠",department:"天車課",title:"設備操作員",start:"2024/06/03",certified:2,progress:1,pending:0,allowance:1000}
  };
  const employee=new URLSearchParams(location.search).get("employee");
  const person=people[employee];
  const profile=document.querySelector(".person-profile");
  const layout=document.querySelector(".detail-layout");
  if(!person){
    profile.innerHTML='<div class="detail-empty"><h2>找不到人員資料</h2><p>此工號不存在或已被移除，請返回人員列表重新選擇。</p><a href="admin.html?view=admin-personnel">返回人員列表</a></div>';
    document.querySelector(".detail-tabs").hidden=true;
    layout.hidden=true;
  }else{
    document.title=person.name+"｜人員詳細資料";
    document.querySelector("#person-name").textContent=person.name;
    const values=profile.querySelectorAll("dd");
    [employee,person.department,person.title,person.start].forEach((value,index)=>values[index].textContent=value);
    const headings=layout.querySelectorAll(".certification-status > section > h2");
    if(headings[0])headings[0].textContent="已認證（"+person.certified+"）";
    if(headings[1])headings[1].textContent="進行中（"+person.progress+"）";
    if(headings[2])headings[2].textContent="待審核（"+person.pending+"）";
    const total=layout.querySelector(".person-summary section > strong");
    if(total)total.textContent="NT$ "+person.allowance.toLocaleString("zh-TW");
    const tabs=[...document.querySelectorAll(".detail-tabs button")];
    const labels=["認證狀態","基本資料","考試紀錄","組長考核紀錄","操作紀錄"];
    const renderTab=index=>{
      tabs.forEach((button,i)=>button.setAttribute("aria-selected",String(i===index)));
      if(index===0){layout.hidden=false;return;}
      layout.hidden=true;
      let panel=document.querySelector("#detail-secondary-panel");
      if(!panel){panel=document.createElement("section");panel.id="detail-secondary-panel";panel.className="detail-secondary-panel";document.querySelector(".detail-tabs").after(panel);}
      const messages=["",person.name+"的部門、職稱與到職資料已顯示於上方。","目前尚無其他考試紀錄。","目前尚無其他組長考核紀錄。","目前尚無其他操作紀錄。"];
      panel.innerHTML="<h2>"+labels[index]+"</h2><p>"+messages[index]+"</p>";
      panel.hidden=false;
    };
    tabs.forEach((button,index)=>button.addEventListener("click",()=>{const panel=document.querySelector("#detail-secondary-panel");if(panel)panel.hidden=true;renderTab(index);}));
  }
}

})();
