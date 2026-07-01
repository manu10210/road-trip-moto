# 🏍️ Assistant Road Trip Moto (Vercel)

[](https://github.com/manu10210/road-trip-moto/actions/workflows/test.yml)

Application web + API serverless **Vercel** pour préparer et vivre ton road trip moto :

| Fonctionnalité | Détail |
|---|---|
| ⛽ **Plan essence** | Autonomie, fréquence des pleins, budget carburant |
| 🛂 **Frontières** | Documents, équipements obligatoires, vitesses, péages, prix essence par pays |
| 🏨 **Hébergement** | Budget estimé, filtres biker-friendly, sites & requêtes utiles |
| ✅ **Checklists** | Moto avant départ, bagages essentiels, routine quotidienne |
| 📔 **Carnet de bord** | Journal de voyage avec localStorage (offline-ready) |

Pays couverts : **FR, ES, IT, DE, CH, AT, BE, LU, PT, AD, NL, MC**

## Structure des fichiers

```
api/
  trip.js        → POST /api/trip  — calcul complet du plan
  border.js      → GET  /api/border?countries=FR,IT,CH — infos frontières
lib/
  countries.js   → données partagées par pays
test/
  trip.test.js   → tests unitaires Node.js
index.html       → interface web à 6 onglets
vercel.json      → config runtime Vercel
```

## Démarrage local

```powershell
npm install
npm test
npx vercel dev
```

Ouvre ensuite l'URL locale affichée (généralement `http://localhost:3000`).

## API — Exemples

### `POST /api/trip`

```json
{
  "tripName": "Alpes + Italie été 2026",
  "totalDistanceKm": 1800,
  "dailyKm": 280,
  "countries": ["FR", "IT", "CH"],
  "bike": {
    "tankLiters": 17,
    "consumptionLPer100": 5.2,
    "fuelPricePerLiter": 1.95,
    "safetyReservePercent": 20
  },
  "lodgingPreferences": { "budgetPerNight": 70 }
}
```

Retourne : `summary`, `fuelPlan`, `borderChecklist` (avec vitesses, docs, notes par pays), `hebergement`, `rideChecklists` (beforeDeparture, dailyRoutine, packingEssentials), `emergencyContacts`.

### `GET /api/border?countries=FR,IT,CH`

Retourne les données détaillées (documents, équipements, limites de vitesse, notes, prix carburant) pour les pays demandés.

Sans paramètre → liste tous les pays disponibles.

## Déploiement Vercel

```powershell
npx vercel
```

## Notes

- Données frontières fournies à titre indicatif. **Toujours vérifier via diplomatie.gouv.fr avant départ.**
- Le carnet de bord utilise `localStorage` (aucun backend requis).
- Extensible avec des APIs live : prix carburant, météo, POI biker-friendly.

