/** Items linked as POS variants stay in menuItems for pricing but are hidden from tiles. */
export function isDisplayMenuItem(item: { isPosVariant?: boolean }): boolean {
  return !item.isPosVariant;
}
