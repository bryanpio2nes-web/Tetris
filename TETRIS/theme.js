const themeButton = document.querySelector('.theme-button');
const savedTheme = localStorage.getItem('theme');

if (savedTheme === 'dark') document.body.classList.add('dark-theme');

function updateThemeButton() {
  const isDark = document.body.classList.contains('dark-theme');
  themeButton.textContent = isDark ? '☀' : '☾';
  themeButton.setAttribute('aria-label', isDark ? 'Ativar modo diurno' : 'Ativar modo noturno');
}

updateThemeButton();
themeButton.addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
  updateThemeButton();
});
