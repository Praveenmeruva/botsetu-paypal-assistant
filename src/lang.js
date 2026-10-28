// Language detection by script + Sarvam translation for 22 Indian languages, plus English.
const SCRIPTS = [
  ['te-IN', /[\u0C00-\u0C7F]/], ['hi-IN', /[\u0900-\u097F]/], ['ta-IN', /[\u0B80-\u0BFF]/],
  ['kn-IN', /[\u0C80-\u0CFF]/], ['ml-IN', /[\u0D00-\u0D7F]/], ['bn-IN', /[\u0980-\u09FF]/],
  ['gu-IN', /[\u0A80-\u0AFF]/], ['pa-IN', /[\u0A00-\u0A7F]/], ['od-IN', /[\u0B00-\u0B7F]/],
  ['ur-IN', /[\u0600-\u06FF]/],
];
function detectLang(text) {
  for (const [code, re] of SCRIPTS) if (re.test(text)) return code;
  return 'en-IN';
}
const key = () => process.env.SARVAM_API_KEY || '';

async function translate(text, target, source = 'en-IN') {
  if (!text || target === source || !key()) return text;
  try {
    const res = await fetch('https://api.sarvam.ai/translate', {
      method: 'POST',
      headers: { 'api-subscription-key': key(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: text.slice(0, 1000), source_language_code: source, target_language_code: target, model: 'mayura:v1', mode: 'formal' }),
    });
    if (!res.ok) return text;
    const j = await res.json();
    return j.translated_text || text;
  } catch { return text; }
}
module.exports = { detectLang, translate };
