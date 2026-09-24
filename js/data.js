export const DEFAULT_CHANNELS = [
  { key: 'dine_in', name: '內用/紙本', markupPercent: 0, roundMode: 'round1' },
  { key: 'pos', name: '微碧/POS', markupPercent: 0, roundMode: 'round1' },
  { key: 'uber', name: 'Uber Eats', markupPercent: 25, roundMode: 'ceil5' },
  { key: 'panda', name: 'Foodpanda', markupPercent: 30, roundMode: 'end9' }
];

export const DEFAULT_CATEGORIES = ['熱炒', '炸物', '湯品', '主食', '冷盤', '飲料'];

export const DEFAULT_INGREDIENTS = ['排骨', '鮮蝦', '雞丁', '牛肉', '皮蛋', '絲瓜', '蛤蜊', '高麗菜'];

export const DEFAULT_METHODS = ['塔香', '鹽烤', '香酥', '金沙', '清炒'];

export const DEFAULT_DISHES = [
  { id: 1, name: '塔香雞丁', mode: 'combine', category: '熱炒', method: '塔香', ingredientA: '雞丁', ingredientB: '', active: true, prices: { dine_in: 120, pos: 120, uber: 150, panda: 159 } },
  { id: 2, name: '皮蛋牛肉', mode: 'combine', category: '熱炒', method: '', ingredientA: '皮蛋', ingredientB: '牛肉', active: true, prices: { dine_in: 160, pos: 160, uber: 200, panda: 209 } },
  { id: 3, name: '清炒絲瓜蛤蜊', mode: 'combine', category: '熱炒', method: '清炒', ingredientA: '絲瓜', ingredientB: '蛤蜊', active: true, prices: { dine_in: 180, pos: 180, uber: 225, panda: 239 } }
];