// adax-fading-suns-2ed/scripts/sheets/item-sheet.js
export class FadingSunsItemSheet extends foundry.appv1.sheets.ItemSheet {

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["fadingsuns", "sheet", "item"],
            width: 520,
            height: 480,
            template: "systems/adax-fading-suns-2ed/templates/item-sheet.html"
        });
    }

    async getData(options) {
        const context = await super.getData(options);
        context.system = context.item.system;
        context.characteristics = [
            { value: "force", label: "Force", selected: context.system.characteristic === "force" },
            { value: "dexterite", label: "Dextérité", selected: context.system.characteristic === "dexterite" },
            { value: "endurance", label: "Endurance", selected: context.system.characteristic === "endurance" },
            { value: "intelligence", label: "Intelligence", selected: context.system.characteristic === "intelligence" },
            { value: "perception", label: "Perception", selected: context.system.characteristic === "perception" },
            { value: "tech", label: "Tech", selected: context.system.characteristic === "tech" },
            { value: "extraverti", label: "Extraverti", selected: context.system.characteristic === "extraverti" },
            { value: "introverti", label: "Introverti", selected: context.system.characteristic === "introverti" },
            { value: "passion", label: "Passion", selected: context.system.characteristic === "passion" },
            { value: "calme", label: "Calme", selected: context.system.characteristic === "calme" },
            { value: "foi", label: "Foi", selected: context.system.characteristic === "foi" },
            { value: "ego", label: "Ego", selected: context.system.characteristic === "ego" },
            { value: "", label: "Aucune", selected: context.system.characteristic === "" }
        ];
        return context;
    }
}