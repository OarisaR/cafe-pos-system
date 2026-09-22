// =========================================================================
// MODULE OWNER: Person 3 — category এর নাম থেকে মানানসই icon বাছাই
// (ছবি না থাকলে কার্ডে এই icon টাই দেখানো হয়)
// =========================================================================
import { Coffee, CupSoda, Croissant, Leaf, Cookie, UtensilsCrossed } from 'lucide-react'

export const pickCategoryIcon = (categoryName = '') => {
  const n = categoryName.toLowerCase()
  if (/(cold|iced|juice|shake|smoothie|soda|drink)/.test(n)) return CupSoda
  if (/(dessert|cake|brownie|ice ?cream|pudding)/.test(n)) return Cookie
  if (/(bakery|pastry|bread|croissant|snack)/.test(n)) return Croissant
  if (/(tea|chai|matcha)/.test(n)) return Leaf
  if (/(coffee|espresso|latte|brew)/.test(n)) return Coffee
  return UtensilsCrossed
}
