import {getFrontendSettings, updateFrontendSettings} from "./backend-state-handler";

export function initLanguageListeners() {
    // Language toggle logic
    const toggleLangBtn = document.getElementById("toggle-lang-btn")!;
    if (toggleLangBtn) {
        toggleLangBtn.addEventListener("click", async () => {
            const frontEndSettings = getFrontendSettings();
            __electronLog.debug(`Current language: ${frontEndSettings.lang}`);
            const newLang = switchLangueTexts(frontEndSettings.lang === "en" ? "ja" : "en");
            updateFrontendSettings(await window.electronAPI.onLanguageChanged(newLang));
            __electronLog.debug(`Language changed to ${newLang}`);
        });
        const lang = getFrontendSettings().lang;
        switchLangueTexts(lang);
    } else {
        __electronLog.error(`Language toggle button or setup text elements not found.`);
    }
}

export function switchLangueTexts(language: string): string {
    const enTexts = document.querySelectorAll("body [lang='en']") as NodeListOf<HTMLElement>;
    const jaTexts = document.querySelectorAll("[lang='ja']") as NodeListOf<HTMLElement>;

    if (language === "en") {
        enTexts.forEach(enText => {
            enText.style.display = "";
        });
        jaTexts.forEach(jaText => {
            jaText.style.display = "none";
        });
        return "en"
    } else {
        enTexts.forEach(enText => {
            enText.style.display = "none";
        });
        jaTexts.forEach(jaText => {
            jaText.style.display = "";
        });
        return "ja"
    }

}