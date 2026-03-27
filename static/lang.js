function changeLang(lang) {
    localStorage.setItem('preferredLang', lang); // 언어 기억
    fetch(`/static/i18n/${lang}.json`)
        .then((response) => response.json())
        .then((translations) => {
            document.querySelectorAll('[data-i18n]').forEach((el) => {
                const key = el.getAttribute('data-i18n');
                if (translations[key]) {
                    el.innerText = translations[key];
                }
            });
        })
        .catch((error) => {
            console.error('언어 파일 로드 오류:', error);
        });
}

document.addEventListener('DOMContentLoaded', () => {
    // 기본 언어: localStorage → HTML lang 속성 → "en"
    const savedLang = localStorage.getItem('preferredLang') || document.documentElement.lang || 'en';

    // select 박스 초기화
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
        langSelect.value = savedLang;
    }

    // 언어 적용
    changeLang(savedLang);
});