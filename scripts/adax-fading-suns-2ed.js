// Ce fichier est le point d'entrée principal de notre système de jeu.

import { FadingSunsActorSheet } from "./sheets/actor-sheet.js";

// Un simple message dans la console (F12) pour confirmer que notre fichier est bien chargé.
console.log("Adax Fading Suns 2ed | Système chargé et initialisé.");

// Hook d'initialisation : s'exécute une seule fois quand Foundry démarre.
Hooks.once("init", function() {
    console.log("Adax Fading Suns 2ed | Lancement de l'initialisation du système.");

    // CORRECTION : On utilise les nouveaux chemins d'accès (namespaces) pour Actors et ActorSheet
    foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
    
    foundry.documents.collections.Actors.registerSheet("adax-fading-suns-2ed", FadingSunsActorSheet, { makeDefault: true });
});