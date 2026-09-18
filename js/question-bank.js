/* question 功能整併檔 */
(()=>{
const CURRENT_VIEW=document.body.dataset.view;

if(CURRENT_VIEW==="question-bank"){try{
const searchInput = document.querySelector("#question-search");
const categorySelect = document.querySelector("#question-category");
const questionCards = document.querySelectorAll(".question-card");

function filterQuestionCards() {
  const searchText = searchInput.value.trim().toLowerCase();
  const selectedCategory = categorySelect.value;

  questionCards.forEach((card) => {
    const name = card.querySelector("h2").textContent.toLowerCase();
    const matchesName = name.includes(searchText);
    const matchesCategory =
      selectedCategory === "all" || card.dataset.category === selectedCategory;

    card.hidden = !matchesName || !matchesCategory;
  });
}

searchInput.addEventListener("input", filterQuestionCards);
categorySelect.addEventListener("change", filterQuestionCards);

}catch(error){console.error("question-bank.js",error);}}

})();
