export const CURRENT_DATA_VERSION = '2026.09.7';

export const DEFAULT_CHANNELS = [
  { key: 'dine_in', name: '內用/紙本', markupPercent: 0, roundMode: 'round1' },
  { key: 'pos', name: '微碧/POS', markupPercent: 0, roundMode: 'round1' },
  { key: 'uber', name: 'Uber Eats', markupPercent: 25, roundMode: 'ceil5' },
  { key: 'panda', name: 'Foodpanda', markupPercent: 30, roundMode: 'end9' },
];

export const DEFAULT_CATEGORIES = ['熱炒', '炸物', '烤物', '蝦料理', '湯品', '飯&麵'];

export const DEFAULT_INGREDIENTS = [
  { name: '味噌', aliases: [] },
  { name: '蝦', aliases: ['蝦仁', '鮮蝦', '蝦球', '泰國蝦', '櫻花蝦'] },
  { name: '牛', aliases: ['牛肉', '牛小排'] },
  { name: '豬', aliases: ['豬肉', '肉絲', '松阪豬', '鹹豬肉', '排骨', '大腸', '肥腸'] },
  { name: '雞', aliases: ['雞肉', '雞丁', '雞腿排', '雞翅'] },
  { name: '蛋', aliases: ['皮蛋', '滑蛋', '鹹蛋'] },
  { name: '魚', aliases: ['鮮魚', '鱸魚', '台灣鯛', '香魚', '鯖魚', '魚下巴', '魟魚', '魚片'] },
  { name: '鴨', aliases: ['鴨血'] },
  { name: '貝', aliases: ['蚵仔', '鮮蚵', '蛤蠣', '干貝', '螺肉'] },
  { name: '中卷', aliases: [] },
  { name: '薑', aliases: ['薑絲', '薑片'] },
  { name: '菇', aliases: ['杏鮑菇', '猴頭菇', '雨來菇'] },
  { name: '菜', aliases: ['高麗菜', '芹菜', '酸菜', '九層塔'] },
  { name: '瓜', aliases: ['苦瓜', '絲瓜'] },
  { name: '漿', aliases: ['花枝丸', '黑輪片'] },
  { name: '豆腐', aliases: [] },
  { name: '梅子', aliases: [] },
  { name: '剝皮辣椒', aliases: [] },
  { name: '飯', aliases: ['炒飯', '燴飯'] },
  { name: '麵', aliases: ['炒麵', '炒泡麵', '炒烏龍'] },
  { name: '湯', aliases: [] },
];

export const DEFAULT_METHODS = [
  '塔香',
  '宮保',
  '金沙',
  '黑胡椒',
  '川味',
  '糖醋',
  '蜜汁',
  '三杯',
  '鹽烤',
  '烤',
  '椒鹽',
  '鹽酥',
  '香酥',
  '清炒',
  '回鍋',
  '奶油',
  '麻油',
  '清酒',
  '蔥爆',
  '避風塘',
];

export const DEFAULT_DISHES = [
  {
    id: 1,
    name: '塔香雞丁',
    mode: 'combine',
    category: '熱炒',
    method: '塔香',
    ingredients: ['雞丁'],
    active: true,
    prices: { dine_in: 190, pos: 190, uber: 240, panda: 249 },
  },
  {
    id: 2,
    name: '皮蛋牛肉',
    mode: 'combine',
    category: '熱炒',
    method: '',
    ingredients: ['皮蛋', '牛肉'],
    active: true,
    prices: { dine_in: 220, pos: 220, uber: 275, panda: 289 },
  },
];
