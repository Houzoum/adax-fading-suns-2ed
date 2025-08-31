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
    // On transforme le formData en un objet simple pour pouvoir le manipuler.
    const expandedData = foundry.utils.expandObject(formData);
    
    // On gère les spans éditables séparément
    this.form.querySelectorAll('span[contenteditable="true"][data-name]').forEach(span => {
        const name = span.dataset.name;
        const value = span.textContent;
        foundry.utils.setProperty(expandedData, name, value);
    });

    const updates = [];
    const itemsData = expandedData.items || {};

    for (const [id, data] of Object.entries(itemsData)) {
        updates.push({ _id: id, ...data });
    }

    if (updates.length > 0) {
        await actor.updateEmbeddedDocuments("Item", updates);
    }
    
    // On s'assure que la clé "items" est retirée pour éviter les erreurs
    delete expandedData.items;

    // On laisse Foundry gérer le reste des mises à jour
    return actor.update(expandedData);
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
    async _openCharacteristicSelectorDialog(skillData, skillName) {
        const templateData = {
            choices: [
                { value: "force", label: "Force" }, { value: "dexterite", label: "Dextérité" },
                { value: "endurance", label: "Endurance" }, { value: "intelligence", label: "Intelligence" },
                { value: "perception", label: "Perception" }, { value: "tech", label: "Tech" },
                { value: "extraverti", label: "Extraverti" }, { value: "introverti", label: "Introverti" },
                { value: "passion", label: "Passion" }, { value: "calme", label: "Calme" },
                { value: "foi", label: "Foi" }, { value: "ego", label: "Ego" }
            ]
        };
        templateData.choices.forEach(c => {
            if (c.value === skillData.characteristic) c.selected = true;
        });

        const content = await foundry.applications.handlebars.renderTemplate(
            "systems/adax-fading-suns-2ed/templates/dialogs/select-characteristic-dialog.html", 
            templateData
        );
    
        new Dialog({
            title: `Jet de ${skillName}`,
            content: content,
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