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
      height: 750
    });
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('.rollable').click(this._onRollCharacteristic.bind(this));
    html.find('.rollable-skill').click(this._onRollSkill.bind(this));
  }

  // --- LOGIQUE DES JETS DE DÉS ---

  async _onRollSkill(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const skillKey = element.dataset.skillKey;
    const skill = this.actor.system.skills.innees[skillKey];
    if (!skill) return;

    if (event.shiftKey) {
      let dialogContent = `
        <form>
          <div class="form-group">
            <label>Choisir la Caractéristique :</label>
            <select name="characteristic-key">
      `;
      
      // CORRECTION : Boucle corrigée pour gérer tous les types de caractéristiques
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

      dialogContent += `
            </select>
          </div>
        </form>
      `;

      new Dialog({
        title: `Jet de ${skill.label}`,
        content: dialogContent,
        buttons: {
          roll: {
            icon: '<i class="fas fa-dice-d20"></i>',
            label: "Lancer",
            callback: (html) => {
              const selectedCharKey = html.find('[name="characteristic-key"]').val();
              this._executeSkillRoll(skill, selectedCharKey);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Annuler"
          }
        },
        default: "roll"
      }).render(true);

    } else {
      const characteristicKey = skill.characteristic;
      this._executeSkillRoll(skill, characteristicKey);
    }
  }

  async _onRollCharacteristic(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const characteristicKey = element.dataset.characteristicKey;
    const fakeSkill = { value: 0, label: "" };
    this._executeSkillRoll(fakeSkill, characteristicKey, true);
  }

  async _executeSkillRoll(skill, characteristicKey, isCharacteristicOnly = false) {
    let characteristic;
    for (const group of Object.values(this.actor.system.characteristics)) {
        if (typeof group[characteristicKey] !== 'undefined') {
            characteristic = group[characteristicKey];
            break;
        }
        // Recherche dans les paires d'esprit
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

    const goalNumber = characteristic.value + skill.value;
    const rollLabel = isCharacteristicOnly ? characteristic.label : `${characteristic.label} + ${skill.label}`;
    
    // CORRECTION : On revient à la méthode asynchrone correcte, sans l'option obsolète
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

  _calculateVictoryPoints(rollResult) {
    if (rollResult <= 2) return 1;
    if (rollResult <= 5) return 1;
    if (rollResult <= 8) return 2;
    if (rollResult <= 11) return 3;
    if (rollResult <= 14) return 4;
    if (rollResult <= 17) return 5;
    if (rollResult >= 18) return 6;
    return 0;
  }
}