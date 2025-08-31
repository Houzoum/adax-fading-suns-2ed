/**
 * Classe de base pour les fiches d'item de Fading Suns.
 * @extends {foundry.appv1.sheets.ItemSheet}
 */
export class FadingSunsItemSheet extends foundry.appv1.sheets.ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["fadingsuns", "sheet", "item"],
      width: 520,
      height: 480,
      template: "systems/adax-fading-suns-2ed/templates/item-sheet.html"
    });
  }
}