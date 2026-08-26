# Intégration AEM — Rendez-vous Citoyens

Cette page fonctionne sur AEM avec **deux composants COLI** placés sur la
**même page** (l'ordre entre eux n'a pas d'importance) :

## Composant COLI n°1 — la page complète
Fichier : `coli-1-page-complete.html`

Contient tout le HTML, le CSS (`<style>`) et le JavaScript (`<script>`) de
la page : hero, sections "à venir" / "passés", chiffres clés, fiche
détail (modale). C'est celui qui affiche visuellement la page.

À coller **tel quel** dans un composant COLI (HTML libre).

Ce composant ne change presque jamais une fois la page mise en ligne —
il n'y a rien à régénérer ici quand on modifie juste des événements.

## Composant COLI n°2 — les données événements
Fichier : `coli-2-donnees-xml.html`

Contient uniquement les données XML des événements (le contenu exact de
`data/RDVCitoyens.xml`), enveloppées dans une balise invisible :

```html
<script type="application/xml" id="rdv-citoyens-xml-data">
  ...contenu XML...
</script>
```

Cette balise ne s'affiche pas sur la page — le script du composant n°1
va la lire au chargement pour construire les cartes événements.

À coller **tel quel** dans un second composant COLI, n'importe où sur
la même page (peu importe s'il est avant ou après le composant n°1).

## Mettre à jour les événements

1. Ouvrez `editeur.html` dans un navigateur.
2. Importez le fichier `RDVCitoyens.xml` actuel (bouton "Importer un
   fichier XML"), ou reprenez le brouillon déjà en cours.
3. Modifiez, ajoutez ou supprimez des événements normalement.
4. Cliquez sur **« 📋 Copier le bloc AEM (Composant COLI n°2) »**.
5. Dans AEM, ouvrez le composant COLI n°2 en édition, remplacez tout
   son contenu par ce qui vient d'être copié, puis publiez.

Le composant COLI n°1 n'a besoin d'être retouché que si vous voulez
changer le design de la page — pas pour un simple ajout/modification
d'événement.

## Lien d'inscription

Le bouton **S'inscrire** pointe automatiquement vers :
`https://www.credit-agricole.fr/ca-toulouse31/particulier/Rendez_vous_Citoyens.html?PROV=<id de l'événement>`

(identique au fonctionnement de l'ancienne page). Il n'apparaît que
pour les événements à venir avec au moins une place disponible ; sinon
un badge **Complet** ou **Peu de places** s'affiche à la place.

## Nom du fichier de données

Le fichier `RDVCitoyens.xml` garde ce nom exact partout, en local comme
dans l'éditeur — cela ne doit jamais changer.
