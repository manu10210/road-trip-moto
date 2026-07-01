/**
 * lib/countries.js
 * Données détaillées par pays : documents, équipements obligatoires,
 * limitations de vitesse moto, notes pratiques, carburant.
 */

const COUNTRIES = {
  FR: {
    name: "France",
    flag: "🇫🇷",
    currency: "EUR",
    documents: [
      "CNI ou passeport valide",
      "Permis moto (A1 / A2 / A)",
      "Carte grise (certificat d'immatriculation)",
      "Attestation d'assurance en cours de validité"
    ],
    equipment: [
      "Gilet réfléchissant (accessible sans ouvrir les sacoches)",
      "Triangle de signalisation homologué",
      "Éthylotest (recommandé)"
    ],
    speedLimits: { highway: "130 km/h (110 pluie)", national: "80 km/h", city: "50 km/h" },
    notes: [
      "Péages : CB acceptée partout",
      "Vignette Crit'Air obligatoire dans les ZFE (Paris, Lyon, Grenoble…)",
      "Nombreux radars tronçons — vitesse moyenne surveillée"
    ],
    fuelTypes: ["SP95", "SP98", "E10", "SP95-E10"],
    fuelPriceEstimate: "≈ 1.85–2.00 €/L (SP95)"
  },
  ES: {
    name: "Espagne",
    flag: "🇪🇸",
    currency: "EUR",
    documents: [
      "CNI ou passeport valide",
      "Permis moto reconnu UE",
      "Carte grise",
      "Attestation d'assurance + carte verte"
    ],
    equipment: [
      "Gilet réfléchissant obligatoire (à portée de main immédiate)",
      "Deux triangles de signalisation",
      "Écran intégral ou lunettes de protection obligatoires"
    ],
    speedLimits: { highway: "120 km/h", national: "90 km/h", city: "50 km/h" },
    notes: [
      "Téléphone interdit même en mains-libres sur moto",
      "Autoroutes payantes nombreuses dans le nord-est",
      "Attention aux limitations variables en ville (30 km/h fréquents)"
    ],
    fuelTypes: ["Gasolina 95", "Gasolina 98", "E10"],
    fuelPriceEstimate: "≈ 1.70–1.90 €/L (95)"
  },
  IT: {
    name: "Italie",
    flag: "🇮🇹",
    currency: "EUR",
    documents: [
      "CNI ou passeport valide",
      "Permis moto reconnu UE",
      "Carta di circolazione (carte grise)",
      "Attestation d'assurance + carte verte"
    ],
    equipment: [
      "Gilet réfléchissant (arrêt d'urgence obligatoire)",
      "Triangle de signalisation",
      "Casque homologué obligatoire (évident mais rappelé)"
    ],
    speedLimits: { highway: "130 km/h (110 pluie)", national: "90 km/h", city: "50 km/h" },
    notes: [
      "Autostrade payantes — CB recommandée (Telepass non disponible étranger sans abo)",
      "ZTL dans les centres historiques : interdiction d'entrée, caméras automatiques",
      "Phares allumés de jour obligatoires hors agglomération"
    ],
    fuelTypes: ["Benzina 95", "Benzina 98", "E10"],
    fuelPriceEstimate: "≈ 1.80–2.05 €/L (95)"
  },
  DE: {
    name: "Allemagne",
    flag: "🇩🇪",
    currency: "EUR",
    documents: [
      "CNI ou passeport valide",
      "Führerschein (permis reconnu UE)",
      "Fahrzeugschein (carte grise)",
      "Attestation d'assurance"
    ],
    equipment: [
      "Triangle de signalisation obligatoire",
      "Kit premiers secours obligatoire",
      "Gilet réfléchissant recommandé"
    ],
    speedLimits: { highway: "Conseillé 130 (Autobahn sans limite légale)", national: "100 km/h", city: "50 km/h" },
    notes: [
      "Vignette environnementale (Umweltplakette) requise en Umweltzone (grandes villes)",
      "Pas de péage sur autoroutes pour les motos",
      "Discipline de conduite très stricte — respecter les voies"
    ],
    fuelTypes: ["Super 95", "Super Plus 98", "E10"],
    fuelPriceEstimate: "≈ 1.75–1.95 €/L (Super 95)"
  },
  CH: {
    name: "Suisse",
    flag: "🇨🇭",
    currency: "CHF",
    documents: [
      "Passeport ou CNI valide",
      "Permis moto reconnu UE",
      "Carte grise",
      "Carte verte d'assurance internationale"
    ],
    equipment: [
      "Triangle de signalisation",
      "Gilet réfléchissant recommandé"
    ],
    speedLimits: { highway: "120 km/h", national: "80 km/h", city: "50 km/h" },
    notes: [
      "Vignette autoroute obligatoire pour motos : 40 CHF/an (vendue aux postes-frontière)",
      "Amendes très élevées — excès de vitesse sanctionné avec confiscation possible",
      "Phares de jour obligatoires",
      "Tunnels alpins gratuits pour motos (contrairement à l'AT)"
    ],
    fuelTypes: ["Bleifrei 95", "Bleifrei 98", "E10"],
    fuelPriceEstimate: "≈ 1.75–1.95 CHF/L (95)"
  },
  AT: {
    name: "Autriche",
    flag: "🇦🇹",
    currency: "EUR",
    documents: [
      "CNI ou passeport valide",
      "Permis moto reconnu UE",
      "Carte grise",
      "Attestation d'assurance"
    ],
    equipment: [
      "Triangle de signalisation obligatoire",
      "Kit premiers secours obligatoire",
      "Gilet réfléchissant recommandé"
    ],
    speedLimits: { highway: "130 km/h", national: "100 km/h", city: "50 km/h" },
    notes: [
      "Vignette autoroute obligatoire pour motos : Autobahnvignette (~14€/10 jours)",
      "Tunnels alpins payants : Brenner, Arlberg, Felbertauern",
      "Routes de montagne souvent sinueuses — vigilance gravier / tracteurs"
    ],
    fuelTypes: ["Super 95", "Super Plus 98", "E10"],
    fuelPriceEstimate: "≈ 1.80–2.00 €/L (95)"
  },
  BE: {
    name: "Belgique",
    flag: "🇧🇪",
    currency: "EUR",
    documents: [
      "CNI ou passeport valide",
      "Permis moto reconnu UE",
      "Carte grise",
      "Attestation d'assurance"
    ],
    equipment: [
      "Gilet réfléchissant obligatoire hors agglomération",
      "Triangle de signalisation"
    ],
    speedLimits: { highway: "120 km/h", national: "90 km/h", city: "50 km/h" },
    notes: [
      "Autoroutes gratuites pour motos",
      "Priorité à droite stricte en agglomération",
      "Radar feu rouge très fréquent"
    ],
    fuelTypes: ["Essence 95", "Essence 98", "E10"],
    fuelPriceEstimate: "≈ 1.80–2.00 €/L (95)"
  },
  LU: {
    name: "Luxembourg",
    flag: "🇱🇺",
    currency: "EUR",
    documents: [
      "CNI ou passeport valide",
      "Permis moto reconnu UE",
      "Carte grise",
      "Attestation d'assurance"
    ],
    equipment: [
      "Triangle de signalisation",
      "Gilet réfléchissant recommandé"
    ],
    speedLimits: { highway: "130 km/h", national: "90 km/h", city: "50 km/h" },
    notes: [
      "Essence moins chère qu'en France (~0.15€/L) — faire le plein ici",
      "Aucun péage sur tout le réseau",
      "Réseau routier très bien entretenu"
    ],
    fuelTypes: ["Super 95", "Super Plus 98"],
    fuelPriceEstimate: "≈ 1.65–1.80 €/L (95) — parmi les moins chers d'Europe"
  },
  PT: {
    name: "Portugal",
    flag: "🇵🇹",
    currency: "EUR",
    documents: [
      "CNI ou passeport valide",
      "Permis moto reconnu UE",
      "Carte grise",
      "Attestation d'assurance"
    ],
    equipment: [
      "Gilet réfléchissant obligatoire hors agglomération",
      "Triangle de signalisation"
    ],
    speedLimits: { highway: "120 km/h", national: "90 km/h", city: "50 km/h" },
    notes: [
      "Autoroutes à péage électronique (Via Verde) — paiement différé possible pour étrangers via easytoll.pt",
      "Phares de jour obligatoires hors agglomération",
      "Routes secondaires parfois dégradées — vigilance"
    ],
    fuelTypes: ["Gasolina 95", "Gasolina 98", "E10"],
    fuelPriceEstimate: "≈ 1.75–1.95 €/L (95)"
  },
  AD: {
    name: "Andorre",
    flag: "🇦🇩",
    currency: "EUR",
    documents: [
      "CNI ou passeport valide",
      "Permis moto",
      "Carte grise",
      "Assurance valable en Andorre (vérifier ta carte verte)"
    ],
    equipment: [
      "Gilet réfléchissant recommandé"
    ],
    speedLimits: { highway: "N/A", national: "90 km/h", city: "50 km/h" },
    notes: [
      "Douane possible — limite d'achat carburant/tabac/alcool en retour",
      "Essence détaxée : ~30% moins cher qu'en France",
      "Pas d'autoroute — routes de montagne"
    ],
    fuelTypes: ["Super 95", "Super 98"],
    fuelPriceEstimate: "≈ 1.30–1.55 €/L (95) — très avantageux, faire le plein ici"
  },
  NL: {
    name: "Pays-Bas",
    flag: "🇳🇱",
    currency: "EUR",
    documents: [
      "CNI ou passeport valide",
      "Permis moto reconnu UE",
      "Carte grise",
      "Attestation d'assurance"
    ],
    equipment: [
      "Gilet réfléchissant recommandé"
    ],
    speedLimits: { highway: "130 km/h (100 de 6h–19h)", national: "80 km/h", city: "50 km/h" },
    notes: [
      "Radars automatiques très nombreux — vitesse variable sur autoroute",
      "Pas de péage",
      "Signalisation GPS-friendly"
    ],
    fuelTypes: ["Super 95", "Super Plus 98", "E10"],
    fuelPriceEstimate: "≈ 2.10–2.30 €/L (95) — parmi les plus chers"
  },
  MC: {
    name: "Monaco",
    flag: "🇲🇨",
    currency: "EUR",
    documents: [
      "CNI ou passeport valide",
      "Permis moto",
      "Carte grise",
      "Attestation d'assurance"
    ],
    equipment: [],
    speedLimits: { highway: "N/A", national: "50 km/h", city: "30–50 km/h" },
    notes: [
      "Parking moto souvent gratuit ou peu cher",
      "Caméras de surveillance partout",
      "Idéal pour une pause panoramique bord de mer"
    ],
    fuelTypes: ["SP95", "SP98"],
    fuelPriceEstimate: "≈ 1.85–2.00 €/L"
  },

  // ── Route France → Estonie ──────────────────────────────────────────────────
  PL: {
    name: "Pologne",
    flag: "🇵🇱",
    currency: "PLN",
    documents: [
      "CNI ou passeport valide",
      "Permis moto reconnu UE",
      "Carte grise",
      "Carte verte d'assurance internationale (obligatoire)"
    ],
    equipment: [
      "Gilet réfléchissant obligatoire hors agglomération",
      "Triangle de signalisation",
      "Trousse de premiers secours recommandée"
    ],
    speedLimits: { highway: "140 km/h", national: "90 km/h (110 sur 2×2 voies)", city: "50 km/h (60 km/h 22h–5h)" },
    notes: [
      "Autoroutes A1, A2, A4 payantes via e-TOLL (électronique) — les autres gratuites",
      "Feux de croisement obligatoires 24h/24",
      "Radars automatiques très fréquents — vitesse strictement contrôlée",
      "Via Baltica (E67) : axe principal Paris → Vilnius, bien entretenu",
      "Carburant ~20 % moins cher qu'en France",
      "1 PLN ≈ 0.23 € — prévoir espèces pour péages et petites étapes"
    ],
    fuelTypes: ["Pb 95", "Pb 98", "E10 (Etanol)"],
    fuelPriceEstimate: "≈ 1.40–1.65 €/L (95) — parmi les moins chers d'Europe"
  },
  LT: {
    name: "Lituanie",
    flag: "🇱🇹",
    currency: "EUR",
    documents: [
      "CNI ou passeport valide",
      "Permis moto reconnu UE",
      "Carte grise",
      "Attestation d'assurance en cours de validité"
    ],
    equipment: [
      "Gilet réfléchissant recommandé",
      "Triangle de signalisation"
    ],
    speedLimits: { highway: "130 km/h (été) / 110 km/h (hiver)", national: "110 km/h (été) / 90 km/h (hiver)", city: "50 km/h" },
    notes: [
      "Via Baltica (E67) Kaunas–Panevėžys : section à péage électronique (~5 €)",
      "Feux de croisement 24h/24 obligatoires",
      "Animaux sauvages (élans, chevreuils) : très dangereux la nuit — prudence en forêt",
      "Vilnius vaut une halte : vieille ville classée UNESCO, bonne scène moto",
      "Carburant moins cher qu'en France"
    ],
    fuelTypes: ["A95", "A98", "E10"],
    fuelPriceEstimate: "≈ 1.50–1.70 €/L (95)"
  },
  LV: {
    name: "Lettonie",
    flag: "🇱🇻",
    currency: "EUR",
    documents: [
      "CNI ou passeport valide",
      "Permis moto reconnu UE",
      "Carte grise",
      "Attestation d'assurance en cours de validité"
    ],
    equipment: [
      "Gilet réfléchissant recommandé"
    ],
    speedLimits: { highway: "110 km/h (été) / 90 km/h (hiver)", national: "90 km/h (été) / 80 km/h (hiver)", city: "50 km/h" },
    notes: [
      "Autoroutes et routes principales gratuites",
      "Routes secondaires parfois en gravier (valsts ceļi) — vérifier le GPS attentivement",
      "Feux de croisement 24h/24 obligatoires",
      "Élans et sangliers : risque réel la nuit, surtout au printemps/été",
      "Riga : vieille ville magnifique, parking moto facile",
      "Réseau mobile limité en zone rurale — télécharger les cartes hors-ligne"
    ],
    fuelTypes: ["A95", "A98"],
    fuelPriceEstimate: "≈ 1.55–1.75 €/L (95)"
  },
  EE: {
    name: "Estonie",
    flag: "🇪🇪",
    currency: "EUR",
    documents: [
      "CNI ou passeport valide",
      "Permis moto reconnu UE",
      "Carte grise",
      "Attestation d'assurance en cours de validité"
    ],
    equipment: [
      "Gilet réfléchissant recommandé",
      "Triangle de signalisation"
    ],
    speedLimits: { highway: "120 km/h (été) / 100 km/h (hiver)", national: "90 km/h", city: "50 km/h" },
    notes: [
      "Aucun péage sur les routes ! Circulation totalement gratuite",
      "Routes en excellent état dans les zones touristiques et l'axe principal",
      "⚠️ Élans (põder) : danger extrême la nuit — ne jamais rouler de nuit en zone forestière",
      "Tallinn : centre médiéval classé UNESCO, parking moto gratuit dans la vieille ville",
      "Ferry Tallinn → Helsinki : 2h30 (Viking Line, Tallink) — idéal pour extension Finlande",
      "Couverture mobile 4G excellente à Tallinn, limitée en forêt",
      "Îles d'Estonie (Saaremaa, Hiiumaa) : ferry rapide, paysages sauvages magnifiques",
      "Feux de croisement 24h/24 obligatoires"
    ],
    fuelTypes: ["95", "98", "E10"],
    fuelPriceEstimate: "≈ 1.70–1.90 €/L (95)"
  },

  // ── Alternatives / Extensions ────────────────────────────────────────────────
  DK: {
    name: "Danemark",
    flag: "🇩🇰",
    currency: "DKK",
    documents: [
      "CNI ou passeport valide",
      "Permis moto reconnu UE",
      "Carte grise",
      "Attestation d'assurance"
    ],
    equipment: [
      "Gilet réfléchissant recommandé"
    ],
    speedLimits: { highway: "130 km/h", national: "80 km/h", city: "50 km/h" },
    notes: [
      "Autoroutes gratuites — sauf Grand Belt Bridge (~22 €) et pont de l'Øresund (~50 €)",
      "Ferry Puttgarden (DE) → Rødby : 45 min, alternatif au pont de l'Øresund",
      "Carburant parmi les plus chers d'Europe",
      "Pays compact — traversée nord-sud en 3h"
    ],
    fuelTypes: ["Blyfri 95", "Blyfri 98"],
    fuelPriceEstimate: "≈ 2.00–2.25 €/L (95) — parmi les plus chers"
  },
  FI: {
    name: "Finlande",
    flag: "🇫🇮",
    currency: "EUR",
    documents: [
      "CNI ou passeport valide",
      "Permis moto reconnu UE",
      "Carte grise",
      "Attestation d'assurance"
    ],
    equipment: [
      "Gilet réfléchissant recommandé",
      "Triangle de signalisation"
    ],
    speedLimits: { highway: "120/100 km/h (été/hiver)", national: "80 km/h", city: "50 km/h" },
    notes: [
      "Autoroutes totalement gratuites !",
      "Ferry Tallinn → Helsinki : 2h30 (Tallink, Viking Line) — liaison quotidienne",
      "⚠️ Élans : danger maximal, particulièrement en mai–juin et à l'automne",
      "Routes magnifiques à travers lacs et forêts — paradis pour moto",
      "Moustiques en forêt l'été — prévoir répulsif",
      "Sauna : expérience incontournable — nombreux hébergements biker-friendly en bord de lac"
    ],
    fuelTypes: ["95 E10", "98 E5"],
    fuelPriceEstimate: "≈ 1.75–1.95 €/L (95)"
  }
};

// ── Péages moto par pays ─────────────────────────────────────────────────────
const TOLL_INFO = {
  FR: { type: "perKm",         estimatedRatePerKm: 0.06, note: "Péages payants, CB acceptée partout",                          motorbikeVignettePrice: null },
  ES: { type: "perKm",         estimatedRatePerKm: 0.05, note: "Payants surtout au nord-est (Catalogne, Pays Basque)",          motorbikeVignettePrice: null },
  IT: { type: "perKm",         estimatedRatePerKm: 0.08, note: "Autostrade payantes — CB recommandée (Telepass sans abo impossible)", motorbikeVignettePrice: null },
  DE: { type: "free",          estimatedRatePerKm: 0,    note: "Autobahn gratuites pour les motos",                             motorbikeVignettePrice: null },
  CH: { type: "vignette",      estimatedRatePerKm: 0,    note: "Vignette annuelle vendue aux postes-frontière",                 motorbikeVignettePrice: 40,  currency: "CHF" },
  AT: { type: "vignette+perKm",estimatedRatePerKm: 0.03, note: "Vignette 10 j (~14 €) + tunnels alpins payants (Brenner, Arlberg…)", motorbikeVignettePrice: 14 },
  BE: { type: "free",          estimatedRatePerKm: 0,    note: "Autoroutes gratuites pour les motos",                          motorbikeVignettePrice: null },
  LU: { type: "free",          estimatedRatePerKm: 0,    note: "Aucun péage sur tout le réseau",                               motorbikeVignettePrice: null },
  PT: { type: "perKm",         estimatedRatePerKm: 0.07, note: "Péage électronique — easytoll.pt pour les étrangers",           motorbikeVignettePrice: null },
  AD: { type: "free",          estimatedRatePerKm: 0,    note: "Pas de péage, routes de montagne uniquement",                  motorbikeVignettePrice: null },
  NL: { type: "free",          estimatedRatePerKm: 0,    note: "Pas de péage pour les motos",                                  motorbikeVignettePrice: null },
  MC: { type: "free",          estimatedRatePerKm: 0,    note: "Parking moto souvent gratuit ou peu cher",                     motorbikeVignettePrice: null },
  // Route Estonie
  PL: { type: "perKm",         estimatedRatePerKm: 0.04, note: "A1/A2/A4 payantes via e-TOLL — autres autoroutes gratuites",    motorbikeVignettePrice: null },
  LT: { type: "perKm",         estimatedRatePerKm: 0.01, note: "Section Via Baltica Kaunas–Panevėžys payante (~5 €) — reste gratuit", motorbikeVignettePrice: null },
  LV: { type: "free",          estimatedRatePerKm: 0,    note: "Toutes les routes gratuites",                                   motorbikeVignettePrice: null },
  EE: { type: "free",          estimatedRatePerKm: 0,    note: "Aucun péage — circulation totalement gratuite",                 motorbikeVignettePrice: null },
  DK: { type: "perKm",         estimatedRatePerKm: 0.01, note: "Routes gratuites sauf ponts : Øresund (~50 €), Grand Belt (~22 €)", motorbikeVignettePrice: null },
  FI: { type: "free",          estimatedRatePerKm: 0,    note: "Toutes les autoroutes gratuites",                               motorbikeVignettePrice: null }
};

// ── Numéros d'urgence par pays ────────────────────────────────────────────────
const EMERGENCY_NUMBERS = {
  FR: { police: "17",         ambulance: "15",  fire: "18",  breakdown: "0 800 05 05 05 (Assistance auto)" },
  ES: { police: "091",        ambulance: "112", fire: "080", breakdown: "112" },
  IT: { police: "113",        ambulance: "118", fire: "115", breakdown: "116 (ACI — Automobile Club Italia)" },
  DE: { police: "110",        ambulance: "112", fire: "112", breakdown: "0180 2 22 22 22 (ADAC)" },
  CH: { police: "117",        ambulance: "144", fire: "118", breakdown: "140 (TCS Touring Club)" },
  AT: { police: "133",        ambulance: "144", fire: "122", breakdown: "120 (ÖAMTC)" },
  BE: { police: "101",        ambulance: "100", fire: "100", breakdown: "070 34 47 77 (Touring)" },
  LU: { police: "113",        ambulance: "112", fire: "112", breakdown: "26 000 (ACL)" },
  PT: { police: "112",        ambulance: "112", fire: "112", breakdown: "219 429 103 (ACP)" },
  AD: { police: "110",        ambulance: "118", fire: "118", breakdown: "112" },
  NL: { police: "0900-8844",  ambulance: "112", fire: "112", breakdown: "088 269 28 88 (ANWB)" },
  MC: { police: "17",         ambulance: "15",  fire: "18",  breakdown: "17 (Police)" },
  // Route Estonie
  PL: { police: "997",        ambulance: "999", fire: "998", breakdown: "981 (PZM Auto Assistance)" },
  LT: { police: "112",        ambulance: "112", fire: "112", breakdown: "1888 (LAAAS / Lithuanian AA)" },
  LV: { police: "110",        ambulance: "113", fire: "112", breakdown: "1888 (LAMB / Latvian AA)" },
  EE: { police: "110",        ambulance: "112", fire: "112", breakdown: "1888 (EAMK / Estonian AA)" },
  DK: { police: "112",        ambulance: "112", fire: "112", breakdown: "70 10 20 30 (Falck)" },
  FI: { police: "112",        ambulance: "112", fire: "112", breakdown: "0200 8080 (Autoliitto)" }
};

/**
 * Retourne les données complètes d'un pays (documents, péages, urgences)
 * ou un fallback générique.
 * @param {string} code - Code ISO 3166-1 alpha-2 en majuscules
 */
function getCountry(code) {
  const base = COUNTRIES[code] || {
    name: code,
    flag: "🏳️",
    currency: "N/A",
    documents: [
      "Vérifier les conditions d'entrée officielles sur diplomatie.gouv.fr",
      "Pièce d'identité valide",
      "Permis moto reconnu",
      "Carte grise + assurance"
    ],
    equipment: ["Gilet réfléchissant", "Triangle de signalisation"],
    speedLimits: null,
    notes: ["Consulter l'ambassade ou le site officiel pour les règles locales"],
    fuelTypes: [],
    fuelPriceEstimate: "N/A"
  };
  return {
    ...base,
    tollInfo: TOLL_INFO[code] || { type: "unknown", estimatedRatePerKm: 0, note: "Vérifier localement", motorbikeVignettePrice: null },
    emergencyNumbers: EMERGENCY_NUMBERS[code] || { police: "112", ambulance: "112", fire: "112", breakdown: "112 (numéro européen)" }
  };
}

module.exports = { COUNTRIES, TOLL_INFO, EMERGENCY_NUMBERS, getCountry };
