// Configuration ESLint (flat config, ESLint 9+).
// Le projet mélange plusieurs environnements d'exécution :
//   - api/**, lib/**, server.js, test/**  → Node.js (CommonJS)
//   - sw.js                                → Service Worker
//   - index.html <script>                  → navigateur (via eslint-plugin-html,
//                                             qui extrait et lint le JS inline)
const js = require("@eslint/js");
const globals = require("globals");
const html = require("eslint-plugin-html");

module.exports = [
  {
    ignores: ["node_modules/**", ".vercel/**", "package-lock.json"]
  },

  // ── Node.js : API serverless, libs partagées, serveur dev, tests ──────────
  {
    files: ["api/**/*.js", "lib/**/*.js", "server.js", "test/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: { ...globals.node }
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_" }]
    }
  },

  // ── Service Worker ────────────────────────────────────────────────────────
  {
    files: ["sw.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: { ...globals.serviceworker }
    },
    rules: {
      ...js.configs.recommended.rules
    }
  },

  // ── index.html : <script> inline de l'application (navigateur) ───────────
  // eslint-plugin-html extrait le contenu des balises <script> et le lint comme
  // du JS classique. Beaucoup de fonctions sont invoquées uniquement depuis des
  // attributs onclick="" dans le HTML : elles restent donc "non référencées" du
  // point de vue du linter → no-unused-vars est assoupli ici pour éviter le bruit,
  // on garde surtout no-undef (variable/typo non déclarée = vraie erreur probable).
  {
    files: ["**/*.html"],
    plugins: { html },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        L: "readonly" // Leaflet, chargé globalement via <script src="unpkg.com/leaflet">
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": "off",
      "no-case-declarations": "off",
      "no-empty": ["warn", { allowEmptyCatch: true }]
    }
  }
];
