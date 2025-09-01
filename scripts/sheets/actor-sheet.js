/**
 * Classe de base pour les fiches d'acteur de Fading Suns.
 * @extends {foundry.appv1.sheets.ActorSheet}
 */
export class FadingSunsActorSheet extends foundry.appv1.sheets.ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["fadingsuns", "sheet", "actor"],
      template: "systems/adax-fading-suns-2ed/templates/character-sheet.html",
      width: 780,
      height: 800
    });
  }

  async getData(options) {
    const context = await super.getData(options);

    // ... (la partie sur characteristicKeys reste la même)
    context.characteristicKeys = { /* ... */ };

    // Initialisation des listes pour tous nos types d'items
    context.learnedSkills = [];
    context.blessingsCurses = [];
    context.beneficesAfflictions = [];

    // Boucle pour trier tous les items de l'acteur
    for (const item of this.actor.items) {
        // On crée la clé de traduction pour le nom et la description
        // ex: "ADAX-FS2.items.blessings.some-blessing.name"
        const key = item.name.slugify({strict: true});
        let itemTypeKey;
        if (item.type === 'competenceAcquise') itemTypeKey = 'skills';
        if (item.type === 'qualiteDefaut') itemTypeKey = 'blessings';
        if (item.type === 'atoutHandicap') itemTypeKey = 'benefices';

        item.loc = {
            name: `ADAX-FS2.items.${itemTypeKey}.${key}.name`,
            description: `ADAX-FS2.items.${itemTypeKey}.${key}.description`
        };

        // On trie l'item dans la bonne liste
        if (item.type === "competenceAcquise") {
            context.learnedSkills.push(item);
        } else if (item.type === "qualiteDefaut") {
            context.blessingsCurses.push(item);
        } else if (item.type === "atoutHandicap") {
            context.beneficesAfflictions.push(item);
        }
    }

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('.rollable-skill').click(this._onSkillRollDialog.bind(this));
    html.find('.rollable-item-skill').click(this._onSkillRollDialog.bind(this));
    html.find('.item-edit').click(this._onItemEdit.bind(this));
  }

  async _updateObject(event, formData) {
    const actor = this.object;
    const expandedData = foundry.utils.expandObject(formData);
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
    delete expandedData.items;
    return actor.update(expandedData);
  }

    /**
   * Gère l'événement de glisser-déposer d'un item sur la fiche.
   * @param {DragEvent} event   L'événement de glisser-déposer.
   * @param {object} data       Les données de l'item déposé.
   */
  async _onDropItem(event, data) {
    if (!this.isEditable) return false;

    const item = await Item.fromDropData(data);
    const itemData = item.toObject();

    // Logique personnalisée ici
    console.log("Item déposé :", itemData.name, "de type", itemData.type);

    // On laisse Foundry gérer la création de l'item sur l'acteur
    return super._onDropItem(event, data);
  }
  // --- GESTIONNAIRES D'ÉVÉNEMENTS ---

  async _onItemEdit(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    // 1. Préparer les données pour le template de la fenêtre
    const templateData = {
        specialization: item.system.specialization,
        hasSpecialization: item.system.hasSpecialization,
        characteristics: this._getCharacteristicsOptions() // On appelle notre nouvelle fonction
    };
    // Pré-sélectionner la bonne caractéristique
    templateData.characteristics.forEach(c => {
        if (c.value === item.system.characteristic) c.selected = true;
    });

    const content = await foundry.applications.handlebars.renderTemplate(
        "systems/adax-fading-suns-2ed/templates/dialogs/manage-skill-dialog.html", 
        templateData
    );

    // 2. Créer et afficher la fenêtre de dialogue (partie inchangée)
    new Dialog({
        title: `${game.i18n.localize("ADAX-FS2.dialog.manage.title")}: ${game.i18n.localize(item.loc.name)}`,
        content: content,
        buttons: {
            update: {
                icon: '<i class="fas fa-save"></i>',
                label: game.i18n.localize("ADAX-FS2.dialog.manage.updateButton"),
                callback: (html) => {
                    const newCharacteristic = html.find('[name="characteristic"]').val();
                    const newSpecialization = html.find('[name="specialization"]').val();
                    const newHasSpecialization = html.find('[name="hasSpecialization"]').is(':checked');
                    item.update({
                        'system.characteristic': newCharacteristic,
                        'system.specialization': newSpecialization,
                        'system.hasSpecialization': newHasSpecialization
                    });
                }
            },
            delete: {
                icon: '<i class="fas fa-trash"></i>',
                label: game.i18n.localize("ADAX-FS2.dialog.manage.deleteButton"),
                callback: () => {
                    this._onItemDeleteConfirm(itemId);
                }
            }
        },
        default: "update"
    }).render(true);
  }

  async _onItemDeleteConfirm(itemId) {
    const item = this.actor.items.get(itemId);
    if (!item) return;
  
    const title = game.i18n.localize("ADAX-FS2.dialog.delete.title");
    const content = `<p>${game.i18n.format("ADAX-FS2.dialog.delete.content", {name: game.i18n.localize(item.loc.name)})}</p>`;
  
    const confirmed = await Dialog.confirm({
        title: title,
        content: content,
        yes: () => true,
        no: () => false,
        defaultYes: false
    });
  
    if (confirmed) {
        this.actor.deleteEmbeddedDocuments("Item", [itemId]);
    }
  }
  async _onSkillRollDialog(event) {
    event.preventDefault();
    const element = event.currentTarget;
    let skill, skillName, characteristicKey;

    if (element.classList.contains('rollable-skill')) {
        const skillKey = element.dataset.skillKey;
        skill = this.actor.system.skills.innees[skillKey];
        skillName = skill.label;
        characteristicKey = skill.characteristic;
    } else {
        const itemId = element.closest(".item").dataset.itemId;
        const itemSkill = this.actor.items.get(itemId);
        skill = itemSkill.system;
        skillName = itemSkill.name;
        characteristicKey = skill.characteristic;
    }
    if (!skill) return;

    if (event.shiftKey) {
        const newCharKey = await this._openCharacteristicSelectorDialog(skill, skillName);
        if (newCharKey) {
            characteristicKey = newCharKey;
        } else {
            return;
        }
    }
    
    this._openModifierDialog(skill, characteristicKey, skillName);
  }

  // --- LOGIQUE CENTRALE ---

  /**
   * Génère la liste des caractéristiques pour les listes déroulantes.
   * @returns {Array<object>} Un tableau d'objets {value, label}.
   * @private
   */
  _getCharacteristicsOptions() {
    return [
        { value: "force", label: game.i18n.localize("ADAX-FS2.characteristics.corps.force") },
        { value: "dexterite", label: game.i18n.localize("ADAX-FS2.characteristics.corps.dexterite") },
        { value: "endurance", label: game.i18n.localize("ADAX-FS2.characteristics.corps.endurance") },
        { value: "intelligence", label: game.i18n.localize("ADAX-FS2.characteristics.intellect.intelligence") },
        { value: "perception", label: game.i18n.localize("ADAX-FS2.characteristics.intellect.perception") },
        { value: "tech", label: game.i18n.localize("ADAX-FS2.characteristics.intellect.tech") },
        { value: "extraverti", label: game.i18n.localize("ADAX-FS2.characteristics.esprit.extraverti") },
        { value: "introverti", label: game.i18n.localize("ADAX-FS2.characteristics.esprit.introverti") },
        { value: "passion", label: game.i18n.localize("ADAX-FS2.characteristics.esprit.passion") },
        { value: "calme", label: game.i18n.localize("ADAX-FS2.characteristics.esprit.calme") },
        { value: "foi", label: game.i18n.localize("ADAX-FS2.characteristics.esprit.foi") },
        { value: "ego", label: game.i18n.localize("ADAX-FS2.characteristics.esprit.ego") },
        { value: "", label: game.i18n.localize("ADAX-FS2.characteristics.none") } // Pour les cas sans carac
    ];
  }

  async _openCharacteristicSelectorDialog(skillData, skillName) {
    const localizedSkillName = game.i18n.localize(skillName);
    
    const templateData = {
        label: game.i18n.localize("ADAX-FS2.dialog.select.label"),
        choices: this._getCharacteristicsOptions(), // On appelle notre nouvelle fonction
        default: skillData.characteristic || "intelligence"
    };
    templateData.choices.forEach(c => {
        if (c.value === skillData.characteristic) c.selected = true;
    });

    const content = await foundry.applications.handlebars.renderTemplate(
        "systems/adax-fading-suns-2ed/templates/dialogs/select-characteristic-dialog.html", 
        templateData
    );

    return new Promise(resolve => {
        new Dialog({
            title: `${game.i18n.localize("ADAX-FS2.dialog.roll.title")} : ${localizedSkillName}`,
            content: content,
            buttons: {
                roll: {
                    icon: '<i class="fas fa-dice-d20"></i>',
                    label: game.i18n.localize("ADAX-FS2.dialog.roll.button"),
                    callback: (html) => resolve(html.find('[name="characteristic-key"]').val())
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize("ADAX-FS2.dialog.cancel.button"),
                    callback: () => resolve(null)
                }
            },
            default: "roll",
            close: () => resolve(null)
        }).render(true);
    });
  }

  async _openModifierDialog(skillData, characteristicKey, skillName) {
    const content = await foundry.applications.handlebars.renderTemplate( "systems/adax-fading-suns-2ed/templates/dialogs/roll-modifier-dialog.html", { label: game.i18n.localize("ADAX-FS2.dialog.modifier.label") });
    new Dialog({
        title: `${game.i18n.localize("ADAX-FS2.dialog.roll.title")} : ${game.i18n.localize(skillName)}`,
        content: content,
        buttons: {
            roll: {
                icon: '<i class="fas fa-dice-d20"></i>',
                label: game.i18n.localize("ADAX-FS2.dialog.roll.button"),
                callback: (html) => {
                    const modifier = parseInt(html.find('[name="modifier"]').val()) || 0;
                    this._executeRoll(skillData, characteristicKey, skillName, modifier);
                }
            }
        },
        default: "roll"
    }).render(true);
  }

  async _executeRoll(skillData, characteristicKey, skillNameOverride, modifier = 0) {
    let characteristic;
    for (const group of Object.values(this.actor.system.characteristics)) {
      if (typeof group[characteristicKey] !== 'undefined') { characteristic = group[characteristicKey]; break; }
      for (const pair of Object.values(group)) {
        if (typeof pair[characteristicKey] !== 'undefined') { characteristic = pair[characteristicKey]; break; }
      }
      if (characteristic) break;
    }
    if (!characteristic || typeof characteristic.value === 'undefined') { return ui.notifications.error(`Caractéristique "${characteristicKey}" non trouvée.`); }

    const localizedCharName = game.i18n.localize(characteristic.label);
    const localizedSkillName = game.i18n.localize(skillNameOverride || skillData.label);
    const goalNumber = characteristic.value + (skillData.value || 0) + modifier;
    const rollLabel = `${localizedCharName} + ${localizedSkillName}`;
    
    const roll = new Roll("1d20");
    await roll.evaluate();
    game.dice3d?.showForRoll(roll);
    const d20Result = roll.total;

    let outcomeKey = "";
    let victoryPoints = 0;
    let isCritical = false;

    if (d20Result === 20) { outcomeKey = "ADAX-FS2.chat.outcome.critFailure"; }
    else if (d20Result === 19) { outcomeKey = "ADAX-FS2.chat.outcome.autoFailure"; }
    else if (d20Result === 1) { outcomeKey = "ADAX-FS2.chat.outcome.autoSuccess"; victoryPoints = this._calculateVictoryPoints(d20Result); }
    else if (d20Result === goalNumber) { outcomeKey = "ADAX-FS2.chat.outcome.critSuccess"; victoryPoints = this._calculateVictoryPoints(d20Result) * 2; isCritical = true; }
    else if (d20Result <= goalNumber) { outcomeKey = "ADAX-FS2.chat.outcome.success"; victoryPoints = this._calculateVictoryPoints(d20Result); }
    else { outcomeKey = "ADAX-FS2.chat.outcome.failure"; }
    const outcome = game.i18n.localize(outcomeKey);

    let messageContent = `
        <h2>${rollLabel}</h2>
        <p><strong>${game.i18n.localize("ADAX-FS2.chat.goal")} :</strong> ${goalNumber} ${game.i18n.localize("ADAX-FS2.chat.orLess")} 
           <em>(${characteristic.value} carac + ${skillData.value || 0} comp + ${modifier} mod)</em></p>
        <p><strong>${game.i18n.localize("ADAX-FS2.chat.result")} :</strong> <span class="roll ${isCritical ? 'critical' : ''}">${d20Result}</span></p>
        <h3>${outcome}</h3>
    `;
    if (victoryPoints > 0) {
        messageContent += `<p><strong>${victoryPoints} ${game.i18n.localize("ADAX-FS2.chat.victoryPoints")}</strong></p>`;
    }

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: messageContent
    });
  }

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