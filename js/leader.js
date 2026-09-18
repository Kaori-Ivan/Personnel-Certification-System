/* leader 功能整併檔 */
(()=>{
const CURRENT_VIEW=document.body.dataset.view;

if(CURRENT_VIEW==="leader-assessment"){try{
const assessmentTabs = document.querySelectorAll(".assessment-tabs button");
const employeeSearch = document.querySelector("#employee-search");
const employeeCards = document.querySelectorAll(".employee-card");

let selectedStatus = "pending";

function filterEmployees() {
  const searchText = employeeSearch.value.trim().toLowerCase();

  employeeCards.forEach((card) => {
    const matchesStatus = card.dataset.status === selectedStatus;
    const matchesSearch = card.textContent.toLowerCase().includes(searchText);

    card.hidden = !matchesStatus || !matchesSearch;
  });
}

assessmentTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    selectedStatus = tab.dataset.status;

    assessmentTabs.forEach((button) => {
      button.setAttribute("aria-selected", String(button === tab));
    });

    filterEmployees();
  });
});

employeeSearch.addEventListener("input", filterEmployees);

}catch(error){console.error("leader-assessment.js",error);}}

if(CURRENT_VIEW==="leader-assessment-form"){try{
const scoreInputs = document.querySelectorAll(".score-row input");
const totalScore = document.querySelector("#total-score");

function calculateTotalScore() {
  let total = 0;

  scoreInputs.forEach((input) => {
    total += Number(input.value) || 0;
  });

  totalScore.value = total;
  totalScore.textContent = total;
}

scoreInputs.forEach((input) => {
  input.addEventListener("input", calculateTotalScore);
});

calculateTotalScore();

}catch(error){console.error("leader-assessment-form.js",error);}}

if(CURRENT_VIEW==="leader-assessment-evaluation"){try{
const evaluationForm = document.querySelector("#evaluation-form");

evaluationForm.addEventListener("submit", (event) => {
  event.preventDefault();

  window.alert("考核結果已送出。這是前端測試，資料尚未正式儲存。");
  window.location.href = "leader.html?view=leader-assessment";
});

}catch(error){console.error("leader-assessment-evaluation.js",error);}}

})();
