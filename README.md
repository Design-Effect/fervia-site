# Fervia · Site

Site du studio créatif Fervia (page d'attente / hero, à étendre en site complet).

## Stack
- HTML statique (pas de build), déploiement Github
- Polices : Cormorant Garamond + Jost, auto-hébergées (`assets/fonts/`, woff2 + `fonts.css`)
- Couleurs : navy `#1A2D45`, or `#C9A84C`, crème `#F5F0E6`

## Structure
- `index.html` : page (hero : logo, tagline, accroche, 3 services, contact)
- `assets/hero-bg.webp` : fond (navy + vagues dorées) ; `hero-bg-mobile.webp` pour ≤640px
- `assets/icons/` : icônes services (web, mobile, design) en SVG dégradé or
- `assets/hero-vivant.js` : fond animé du héros en WebGL (source lisible) ; la page charge `assets/hero-vivant.min.js`, à régénérer avec la commande notée en tête de la source

## Déploiement
Hébergé sur Github . Domaine `fervia.be` connecté via enregistrement A
chez OVH (le DNS reste chez OVH pour préserver les MX de l'email Zimbra).

## À faire ensuite
- Témoignages intégrés : Healthy Sounna (accueil + outil-métier), RTM (accueil)
- Pages dédiées par service/ville si le SEO local doit monter d'un cran
