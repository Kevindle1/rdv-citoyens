---
title: Rendez-vous Citoyens — Documentation du projet
---

# Rendez-vous Citoyens — Documentation

Ce document explique comment fonctionne le projet, à quoi sert chaque fichier, et qui fait quoi au quotidien.

## 1. Vue d'ensemble

Le projet contient **4 éléments** :

| Fichier | Rôle | Qui le touche ? | À quelle fréquence ? |
|---|---|---|---|
| `RDVCitoyens.xml` | La donnée des événements (source unique) | L'éditeur l'écrit automatiquement | À chaque modification |
| `coli-2-donnees.html` | Le même contenu, emballé pour le site (AEM) + les thématiques/chiffres clés | L'éditeur l'écrit automatiquement | À chaque modification |
| `coli-1-page.html` | Le code de la page publique (structure, style, logique) | Personne, en usage normal | Jamais (sauf refonte du site) |
| `editeur.html` | L'outil graphique pour gérer les événements | Le service vie mutuelle | À chaque mise à jour |

**Règle d'or : `RDVCitoyens.xml` ne doit jamais être renommé.** Les traitements automatiques (envoi des e-mails et SMS aux inscrits) lisent ce fichier par son nom exact.

## 2. Pourquoi deux fichiers de données (XML et COLI n°2) ?

Ils contiennent la même information sur les événements, mais servent à deux systèmes différents :

- **`RDVCitoyens.xml`** → lu par les traitements automatiques (batchs) qui envoient les e-mails et SMS de convocation/rappel. Format XML brut, imposé.
- **`coli-2-donnees.html`** → collé dans le site web (AEM). Il contient le même XML **plus** les thématiques (couleurs, icônes, images) et les chiffres clés (nombre d'événements, de participants...), car le site en a besoin pour s'afficher correctement.

**L'éditeur (`editeur.html`) met à jour les deux fichiers en même temps, en un seul clic** — vous n'avez jamais à les synchroniser vous-même.

## 3. Comment la page publique est construite (AEM)

La page « Rendez-vous Citoyens » vit sur AEM sous la forme de **deux composants COLI** (blocs de contenu libre), placés sur la même page :

```
┌─────────────────────────────────────────┐
│  Page AEM « Rendez-vous Citoyens »       │
│                                           │
│  ┌─────────────────────────────────┐    │
│  │ Composant COLI n°1                │   │
│  │ → contenu de coli-1-page.html    │   │
│  │   (structure, style, logique JS) │   │
│  └─────────────────────────────────┘    │
│                                           │
│  ┌─────────────────────────────────┐    │
│  │ Composant COLI n°2                │   │
│  │ → contenu de coli-2-donnees.html │   │
│  │   (événements + thématiques      │   │
│  │    + chiffres clés)              │   │
│  └─────────────────────────────────┘    │
│                                           │
└─────────────────────────────────────────┘
```

Le composant n°1 lit les données du composant n°2 au chargement de la page (peu importe l'ordre des deux composants sur la page). Le composant n°2 est invisible : il ne contient que des données, jamais rien qui s'affiche directement.

## 4. Mise en place initiale (une seule fois, par la personne qui gère AEM)

1. Créer la page AEM et y placer **deux composants COLI**.
2. Ouvrir `coli-1-page.html` dans un éditeur de texte, copier tout son contenu, le coller dans le **composant COLI n°1**.
3. Ouvrir `coli-2-donnees.html`, copier tout son contenu, le coller dans le **composant COLI n°2**.
4. Publier la page.

Cette étape ne sera **plus jamais refaite** pour le composant n°1 (sauf refonte du site). Pour le composant n°2, elle sera reproduite à chaque mise à jour des événements — voir section suivante.

## 5. Utilisation au quotidien (service vie mutuelle)

### 5.1 Ouvrir l'éditeur

Ouvrir `editeur.html` (navigateur **Chrome ou Edge** obligatoire — l'outil ne fonctionne pas sur Firefox/Safari).

Au premier écran, cliquer sur **« Choisir le dossier »** et sélectionner le dossier qui contient `RDVCitoyens.xml` et `coli-2-donnees.html` (le dossier du projet). L'éditeur charge alors automatiquement tous les événements existants.

### 5.2 Modifier les événements

Dans l'onglet **Événements** :
- **+ Nouvel événement** pour en ajouter un.
- Sur chaque ligne : modifier, dupliquer ou supprimer.
- La recherche en haut filtre par titre, ville ou thème.

Dans l'onglet **Chiffres clés** : décocher « auto » pour saisir une valeur manuelle (par exemple un historique cumulé), sinon les chiffres sont calculés automatiquement à partir des événements.

Dans l'onglet **Thématiques** : modifier le libellé, l'icône, la couleur ou l'image de chaque thématique, ou en ajouter une nouvelle.

### 5.3 Vérifier avant de publier

Le bouton **👁️ Prévisualiser** ouvre un nouvel onglet montrant la page publique telle qu'elle apparaîtra, avec vos modifications en cours — sans rien publier. À utiliser autant que nécessaire avant d'enregistrer.

### 5.4 Enregistrer

Le bouton **💾 Enregistrer** écrit directement les modifications dans `RDVCitoyens.xml` **et** `coli-2-donnees.html`, dans le dossier ouvert au départ. `coli-1-page.html` n'est jamais modifié.

À ce stade :
- ✅ `RDVCitoyens.xml` est à jour → les e-mails/SMS automatiques utiliseront la nouvelle donnée dès leur prochain envoi.
- ⏳ Le site web n'est **pas encore** mis à jour : `coli-2-donnees.html` a été mis à jour sur le disque, mais il faut encore le reporter dans AEM (étape suivante).

### 5.5 Publier sur le site (AEM)

1. Ouvrir `coli-2-donnees.html` (dans un éditeur de texte, ou en faisant un clic droit → Ouvrir avec…) et copier tout son contenu.
2. Dans AEM, ouvrir le **composant COLI n°2** de la page « Rendez-vous Citoyens » en mode édition du code source.
3. Remplacer tout le contenu existant par ce qui vient d'être copié.
4. Enregistrer / publier la page dans AEM.

Le composant COLI n°1 n'a besoin d'aucune intervention.

## 6. Résumé des rôles

| Qui | Quoi | Où | Quand |
|---|---|---|---|
| Service vie mutuelle | Ajoute/modifie/supprime des événements, thématiques, chiffres clés | `editeur.html` | À chaque mise à jour |
| Service vie mutuelle | Copie `coli-2-donnees.html` dans AEM | Console AEM | Après chaque « Enregistrer » |
| Traitements automatiques (batchs) | Lisent `RDVCitoyens.xml` pour envoyer e-mails/SMS | Automatique | En continu |
| Webmaster / gestion AEM | Colle `coli-1-page.html` dans COLI n°1 | Console AEM | Une seule fois (sauf refonte) |

## 7. Points de vigilance

- **Ne jamais renommer `RDVCitoyens.xml`** — les batchs d'e-mails/SMS le cherchent par ce nom exact.
- **Ne jamais modifier `coli-1-page.html`** dans l'usage courant — toute mise à jour d'événement, de thématique ou de chiffre clé passe uniquement par `editeur.html` et `coli-2-donnees.html`.
- L'outil `editeur.html` nécessite **Chrome ou Edge** (fonctionnalité technique utilisée pour enregistrer directement sur le disque).
- En cas de fermeture accidentelle du navigateur avant d'avoir cliqué sur « Enregistrer », l'éditeur propose de restaurer automatiquement le brouillon non enregistré à la prochaine ouverture.
