import React from 'react';

// Language file loader
const translations = {};

const loadLanguage = async (lang) => {
  if (translations[lang]) return translations[lang];
  
  try {
    const response = await fetch(`/lang/${lang}.lang`);
    const text = await response.text();
    const langData = {};
    
    text.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        langData[key.trim()] = value.trim();
      }
    });
    
    translations[lang] = langData;
    return langData;
  } catch (error) {
    console.warn(`Failed to load language ${lang}`);
    return translations['en-us'] || {};
  }
};

export const useTranslation = (language = 'en-us') => {
  const [langData, setLangData] = React.useState({});
  
  React.useEffect(() => {
    loadLanguage(language).then(setLangData);
  }, [language]);
  
  const t = (key) => langData[key] || key;
  
  return { t };
};

export const availableLanguages = [
  { code: 'en-us', name: 'English (US)', flag: '🇺🇸' },
  { code: 'en-uk', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'es-es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr-fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de-de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pirate', name: 'Pirate Speak', flag: '🏴‍☠️' },
  { code: 'shakespeare', name: 'Shakespearean', flag: '🎭' },
  { code: 'upsidedown', name: 'uʍoꓷ ǝpı̣sdꓵ', flag: '🙃' },
  { code: 'emoji', name: 'Emoji Mode', flag: '😊' },
  { code: 'uwu', name: 'UwU Speak', flag: '🥺' }
];