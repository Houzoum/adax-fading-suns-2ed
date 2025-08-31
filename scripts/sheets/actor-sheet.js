/**
 * Classe de base pour les fiches d'acteur de Fading Suns.
 * @extends {foundry.appv1.sheets.ActorSheet}
 */
export class FadingSunsActorSheet extends foundry.appv1.sheets.ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["fadingsuns", "sheet", "actor"],
      template: "systems/adax-fading-suns-2ed/templates/character-sheet.html",
      width: 600,
      height: 800 // Hauteur augmentée pour tout afficher
    });
  }

  /**
   * Active tous les écouteurs d'événements pour la fiche.
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Jets de Caractéristiques
    html.find('.rollable').click(this._onRollCharacteristic.bind(this));

    // Jets de Compétences Innées
    html.find('.rollable-skill').click(this._onRollSkill.bind(this));

    // -- Écouteurs pour les Items (Compétences Acquises) --
    // Ouvrir la fiche de l'item pour l'éditer
    html.find('.item-edit').click(this._onItemEdit.bind(this));

    // Lancer un jet depuis un item
    html.find('.rollable-item-skill').click(this._onRollItemSkill.bind(this));
  }
  /**
   * Surcharge de la méthode de mise à jour pour gérer correctement les items.
   * @param {Event} event   L'événement qui a déclenché la mise à jour.
   * @param {object} formData L'objet contenant les données du formulaire.
   */
  async _updateObject(event, formData) {
    const actor = this.object;
    const updates = [];
    
    // On parcourt les données du formulaire
    for (const [key, value] of Object.entries(formData)) {
        // On cherche les clés qui correspondent à des items (ex: items.ITEM_ID.system.value)
        if (key.startsWith("items.")) {
            const parts = key.split(".");
            const itemId = parts[1];
            const propertyPath = parts.slice(2).join("."); // "system.value"

            // On prépare une mise à jour spécifique pour cet item
            updates.push({
                _id: itemId,
                [propertyPath]: value
            });
        }
    }
    
    // Si on a des mises à jour d'items, on les exécute
    if (updates.length > 0) {
        await actor.updateEmbeddedDocuments("Item", updates);
    }
    
    // On laisse Foundry gérer le reste des mises à jour (caractéristiques, etc.)
    return super._updateObject(event, formData);
  }
  // --- GESTIONNAIRES D'ÉVÉNEMENTS (LES FONCTIONS "_on...") ---

  /**
   * Gère le clic pour éditer un item.
   */
  _onItemEdit(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    item.sheet.render(true);
  }

  /**
   * Gère le jet pour une compétence innée (depuis les données de l'acteur).
   */
  async _onRollSkill(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const skillKey = element.dataset.skillKey;
    const skill = this.actor.system.skills.innees[skillKey];
    if (!skill) return;

    if (event.shiftKey) {
      this._openCharacteristicSelectorDialog(skill, skill.label);
    } else {
      const characteristicKey = skill.characteristic;
      this._executeRoll(skill, characteristicKey);
    }
  }

  /**
   * Gère le jet pour une compétence acquise (qui est un Item).
   */
  async _onRollItemSkill(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.closest(".item").dataset.itemId;
    const itemSkill = this.actor.items.get(itemId);
    if (!itemSkill) return;

    if (event.shiftKey) {
      this._openCharacteristicSelectorDialog(itemSkill.system, itemSkill.name);
    } else {
      const characteristicKey = itemSkill.system.characteristic;
      this._executeRoll(itemSkill.system, characteristicKey, itemSkill.name);
    }
  }

  /**
   * Gère le jet pour une caractéristique pure.
   */
  async _onRollCharacteristic(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const characteristicKey = element.dataset.characteristicKey;
    const fakeSkill = { value: 0, label: "" }; // Une compétence "vide" avec une valeur de 0
    this._executeRoll(fakeSkill, characteristicKey, "", true);
  }

  // --- LOGIQUE CENTRALE ---

  /**
   * Ouvre la fenêtre de dialogue pour choisir une caractéristique.
   * @param {object} skillData Les données de la compétence (system)
   * @param {string} skillName Le nom de la compétence à afficher
   */
  _openCharacteristicSelectorDialog(skillData, skillName) {
    let dialogContent = `<form><div class="form-group"><label>Choisir la Caractéristique :</label><select name="characteristic-key">`;
    
    // Boucle pour construire la liste déroulante de toutes les caractéristiques
    for (const groupKey in this.actor.system.characteristics) {
      const group = this.actor.system.characteristics[groupKey];
      if (groupKey === "esprit") {
        for (const pairKey in group) {
          const pair = group[pairKey];
          for (const charKey in pair) {
            if (charKey === "primary") continue;
            const characteristic = pair[charKey];
            dialogContent += `<option value="${charKey}">${characteristic.label}</option>`;
          }
        }
      } else {
        for (const charKey in group) {
          const characteristic = group[charKey];
          dialogContent += `<option value="${charKey}">${characteristic.label}</option>`;
        }
      }
    }
    dialogContent += `</select></div></form>`;

    new Dialog({
      title: `Jet de ${skillName}`,
      content: dialogContent,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: "Lancer",
          callback: (html) => {
            const selectedCharKey = html.find('[name="characteristic-key"]').val();
            this._executeRoll(skillData, selectedCharKey, skillName);
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: "Annuler" }
      },
      default: "roll"
    }).render(true);
  }

  /**
   * Exécute le jet de dé et envoie le message au chat. C'est la fonction centrale.
   * @param {object} skillData Les données de la compétence (innée ou item.system)
   * @param {string} characteristicKey La clé de la caractéristique à utiliser
   * @param {string} [skillNameOverride=""] Un nom à utiliser à la place de skillData.label
   * @param {boolean} [isCharacteristicOnly=false] S'il s'agit d'un jet de caractéristique pure
   */
  async _executeRoll(skillData, characteristicKey, skillNameOverride = "", isCharacteristicOnly = false) {
    let characteristic;
    // Boucle de recherche robuste pour trouver la caractéristique n'importe où
    for (const group of Object.values(this.actor.system.characteristics)) {
      if (typeof group[characteristicKey] !== 'undefined') {
        characteristic = group[characteristicKey];
        break;
      }
      for (const pair of Object.values(group)) {
        if (typeof pair[characteristicKey] !== 'undefined') {
          characteristic = pair[characteristicKey];
          break;
        }
      }
      if (characteristic) break;
    }
    
    if (!characteristic || typeof characteristic.value === 'undefined') {
      ui.notifications.error(`Caractéristique "${characteristicKey}" non trouvée.`);
      return;
    }

    const skillName = skillNameOverride || skillData.label;
    // CORRECTION ICI : On utilise bien skillData.value
    const goalNumber = characteristic.value + skillData.value;
    const rollLabel = isCharacteristicOnly ? characteristic.label : `${characteristic.label} + ${skillName}`;
    
    const roll = new Roll("1d20");
    await roll.evaluate();
    game.dice3d?.showForRoll(roll);
    const d20Result = roll.total;

    let outcome = "";
    let victoryPoints = 0;
    let isCritical = false;

    if (d20Result === 20) { outcome = "Échec Critique !"; }
    else if (d20Result === 19) { outcome = "Échec Automatique."; }
    else if (d20Result === 1) {
      outcome = "Succès Automatique !";
      victoryPoints = this._calculateVictoryPoints(d20Result);
    } else if (d20Result === goalNumber) {
      outcome = "Succès Critique !";
      victoryPoints = this._calculateVictoryPoints(d20Result) * 2;
      isCritical = true;
    } else if (d20Result <= goalNumber) {
      outcome = "Succès.";
      victoryPoints = this._calculateVictoryPoints(d20Result);
    } else {
      outcome = "Échec.";
    }

    let messageContent = `
        <h2>Jet de ${rollLabel}</h2>
        <p><strong>Objectif :</strong> ${goalNumber} ou moins</p>
        <p><strong>Résultat :</strong> <span class="roll ${isCritical ? 'critical' : ''}">${d20Result}</span></p>
        <h3>${outcome}</h3>
    `;
    if (victoryPoints > 0) {
      messageContent += `<p><strong>${victoryPoints} Point(s) de Victoire</strong></p>`;
    }

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: messageContent
    });
  }

  /**
   * Calcule les points de victoire.
   */
  _calculateVictoryPoints(rollResult) {
    if (rollResult <= 5) return 1;
    if (rollResult <= 8) return 2;
    if (rollResult <= 11) return 3;
    if (rollResult <= 14) return 4;
    if (rollResult <= 17) return 5;
    if (rollResult >= 18) return 6;
    return 0;
  }
}