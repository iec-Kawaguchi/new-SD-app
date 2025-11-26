window.addEventListener('DOMContentLoaded', (event) => {
	init_article();
});

//article
function init_article() {
	const header = document.querySelector('header');
	header.classList.remove('hide');
}