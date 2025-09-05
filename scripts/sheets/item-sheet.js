export class FadingSunsItemSheet extends foundry.appv1.sheets.ItemSheet {

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["fadingsuns", "sheet", "item"],
            width: 650,
            height: 480,
            template: "systems/adax-fading-suns-2ed/templates/item-sheet.html"
        });
    }

    async getData(options) {
        const context = await super.getData(options);
        context.system = context.item.system;
        
        // On initialise TOUJOURS config comme un objet vide
        context.config = {};

        // On remplit config avec nos listes
        context.config.characteristics = this._getCharacteristicsOptions();
        context.config.blessingOrCurse = [
            { value: "qualite", label: game.i18n.localize("ADAX-FS2.itemSheet.blessing") },
            { value: "defaut", label: game.i18n.localize("ADAX-FS2.itemSheet.curse") }
        ];
        context.config.beneficeOrAffliction = [
            { value: "atout", label: game.i18n.localize("ADAX-FS2.itemSheet.benefice") },
            { value: "handicap", label: game.i18n.localize("ADAX-FS2.itemSheet.affliction") }
        ];
        context.config.weaponTypes = {
            "melee": game.i18n.localize("ADAX-FS2.itemSheet.weaponTypes.melee"),
            "thrown": game.i18n.localize("ADAX-FS2.itemSheet.weaponTypes.thrown"),
            "bow": game.i18n.localize("ADAX-FS2.itemSheet.weaponTypes.bow"),
            "crossbow": game.i18n.localize("ADAX-FS2.itemSheet.weaponTypes.crossbow"),
            "slug-gun": game.i18n.localize("ADAX-FS2.itemSheet.weaponTypes.slug-gun"),
            "energy-gun": game.i18n.localize("ADAX-FS2.itemSheet.weaponTypes.energy-gun"),
            "heavy": game.i18n.localize("ADAX-FS2.itemSheet.weaponTypes.heavy")
        };
        context.config.weaponSkills = {
            "melee": game.i18n.localize("ADAX-FS2.skills.innate.melee"),
            "throwing": game.i18n.localize("ADAX-FS2.items.skills.throwing.name"),
            "archery": game.i18n.localize("ADAX-FS2.items.skills.archery.name"),
            "shoot": game.i18n.localize("ADAX-FS2.skills.innate.tir"),
            "vigor": game.i18n.localize("ADAX-FS2.skills.innate.vigueur")
        };
        context.config.itemSizes = {
            "XS": game.i18n.localize("ADAX-FS2.itemSheet.itemSizes.XS"),
            "S": game.i18n.localize("ADAX-FS2.itemSheet.itemSizes.S"),
            "M": game.i18n.localize("ADAX-FS2.itemSheet.itemSizes.M"),
            "L": game.i18n.localize("ADAX-FS2.itemSheet.itemSizes.L"),
            "XL": game.i18n.localize("ADAX-FS2.itemSheet.itemSizes.XL")
        };
        context.config.armorTypes = {
            "corporelle": game.i18n.localize("ADAX-FS2.itemSheet.armorTypes.corporelle"),
            "bouclier": game.i18n.localize("ADAX-FS2.itemSheet.armorTypes.bouclier"),
            "champ-force": game.i18n.localize("ADAX-FS2.itemSheet.armorTypes.champ-force")
        };
        context.config.maneuverTypes = {
            "basic-fight": game.i18n.localize("ADAX-FS2.itemSheet.maneuverTypes.basic-fight"),
            "martial-arts": game.i18n.localize("ADAX-FS2.itemSheet.maneuverTypes.martial-arts"),
            "graa": game.i18n.localize("ADAX-FS2.itemSheet.maneuverTypes.graa"),
            "fencing": game.i18n.localize("ADAX-FS2.itemSheet.maneuverTypes.fencing"),
            "shield": game.i18n.localize("ADAX-FS2.itemSheet.maneuverTypes.shield"),
            "firearms": game.i18n.localize("ADAX-FS2.itemSheet.maneuverTypes.firearms")
        };
        context.config.maneuverSkills = {
            "fight": game.i18n.localize("ADAX-FS2.skills.innate.combatMainsNues"),
            "dodge": game.i18n.localize("ADAX-FS2.skills.innate.esquive"),
            "knavery": game.i18n.localize("ADAX-FS2.items.skills.knavery.name"),
            "melee": game.i18n.localize("ADAX-FS2.skills.innate.melee"),
            "vigor": game.i18n.localize("ADAX-FS2.skills.innate.vigueur"),
            "shoot": game.i18n.localize("ADAX-FS2.skills.innate.tir")
        };
        context.config.maneuverCharacteristics = this._getCharacteristicsOptions();

        // --- Le reste de la fonction pour la pré-sélection ---
        context.config.characteristics.forEach(c => {
            if (c.value === context.system.characteristic) c.selected = true;
        });
        if (context.item.type === 'qualiteDefaut') {
            context.config.blessingOrCurse.forEach(t => {
                if (t.value === context.system.type) t.selected = true;
            });
        }
        if (context.item.type === 'atoutHandicap') {
            context.config.beneficeOrAffliction.forEach(t => {
                if (t.value === context.system.type) t.selected = true;
            });
        }
        
        return context;
    }

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
            { value: "", label: game.i18n.localize("ADAX-FS2.characteristics.none") }
        ];
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.find('.add-level').click(this._onAddLevel.bind(this));
        html.find('.delete-level').click(this._onDeleteLevel.bind(this));
    }

    /**
     * Surcharge pour sauvegarder les données du formulaire avant toute action.
     */
    async _onChangeInput(event) {
        await super._onChangeInput(event);
        // On sauvegarde immédiatement chaque changement.
        this._onSubmit(event, { preventClose: true });
    }
    /**
     * Gère l'ajout d'un nouveau niveau ou d'une nouvelle option.
     * @param {Event} event
     * @private
     */
    async _onAddLevel(event) {
        event.preventDefault();
        const dataType = event.currentTarget.dataset.type; // "levels" ou "options"

        // 1. Lire les données plates du formulaire
        const formData = this._getSubmitData();
        const expandedData = foundry.utils.expandObject(formData);
        
        // 2. Transformer les données en un VRAI tableau, quel que soit le cas de figure
        const dataObject = expandedData.system?.[dataType] || {};
        const currentData = Array.isArray(dataObject) ? dataObject : Object.values(dataObject);

        // 3. Ajouter la nouvelle ligne au tableau
        currentData.push({ name: "Nouveau", cost: 0, description: "" });

        // 4. Mettre à jour l'item avec le tableau complet et correct
        await this.item.update({
            [`system.${dataType}`]: currentData
        });
    }

    /**
     * Gère la suppression d'un niveau ou d'une option.
     * @param {Event} event
     * @private
     */
    async _onDeleteLevel(event) {
        event.preventDefault();
        const dataType = event.currentTarget.dataset.type;
        const index = parseInt(event.currentTarget.dataset.index, 10);

        // 1. Lire les données plates du formulaire
        const formData = this._getSubmitData();
        const expandedData = foundry.utils.expandObject(formData);

        // 2. Transformer les données en un VRAI tableau
        const dataObject = expandedData.system?.[dataType] || {};
        const currentData = Array.isArray(dataObject) ? dataObject : Object.values(dataObject);
        
        // 3. Supprimer la ligne
        if (index >= 0 && index < currentData.length) {
            currentData.splice(index, 1);
        }

        // 4. Mettre à jour l'item avec le tableau modifié
        await this.item.update({
            [`system.${dataType}`]: currentData
        });
    }
}