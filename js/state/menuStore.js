import { reactive, watch } from 'vue';
import { calculateMarkupPrice } from '../utils/pricing.js';

const CURRENT_DATA_VERSION = '2026.09.26';
const STORAGE_KEY = 'restaurant_menu_master';

export const store = reactive({
  version: CURRENT_DATA_VERSION,
  channels: [],
  categories: [],
  ingredients: [],
  methods: [],
  dishes: [],
  packages: [],
  lastBackupTime: null,
});

const ensureItemPrices = (itemPrices, channels) => {
  const prices = typeof itemPrices === 'object' && itemPrices !== null ? { ...itemPrices } : {};
  if (Array.isArray(channels)) {
    channels.forEach((ch) => {
      if (prices[ch.key] === undefined) {
        prices[ch.key] = null;
      }
    });
  }
  return prices;
};

export const applyDataset = (data) => {
  if (Array.isArray(data.channels)) {
    store.channels = data.channels;
  }
  if (Array.isArray(data.categories)) {
    store.categories = data.categories;
  }
  if (Array.isArray(data.ingredients)) {
    store.ingredients = data.ingredients;
  }
  if (Array.isArray(data.methods)) {
    store.methods = data.methods;
  }
  if (Array.isArray(data.dishes)) {
    store.dishes = data.dishes.map((d) => {
      return {
        ...d,
        active: d.active !== false,
        ingredients: Array.isArray(d.ingredients) ? d.ingredients : [],
        prices: ensureItemPrices(d.prices, store.channels),
      };
    });
  }
  if (Array.isArray(data.packages)) {
    store.packages = data.packages.map((p) => {
      return {
        ...p,
        active: p.active !== false,
        prices: ensureItemPrices(p.prices, store.channels),
        slots: Array.isArray(p.slots)
          ? p.slots.map((s) => {
              return {
                ...s,
                autoSort: s.autoSort !== false,
                dishNames: Array.isArray(s.dishNames) ? s.dishNames : [],
              };
            })
          : [],
      };
    });
  }
  if (data.lastBackupTime) {
    store.lastBackupTime = data.lastBackupTime;
  }
};

export const initStore = async () => {
  let loadedFromJSON = false;
  try {
    const res = await fetch('./data/latest.json', { cache: 'no-cache' });
    if (res.ok) {
      const jsonData = await res.json();
      applyDataset(jsonData);
      loadedFromJSON = true;
    }
  } catch (err) {
    console.warn('未載入 ./data/latest.json，改用本地快取。');
  }

  if (!loadedFromJSON) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const localData = JSON.parse(raw);
        applyDataset(localData);
      } catch (e) {
        console.error('LocalStorage 讀取異常：', e);
      }
    }
  }

  watch(
    () => {
      return store;
    },
    () => {
      const payload = {
        version: CURRENT_DATA_VERSION,
        channels: store.channels,
        categories: store.categories,
        ingredients: store.ingredients,
        methods: store.methods,
        dishes: store.dishes,
        packages: store.packages,
        lastBackupTime: store.lastBackupTime,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    },
    { deep: true },
  );
};

export const recalculateAllMarkup = () => {
  store.dishes.forEach((dish) => {
    if (!dish.prices) {
      dish.prices = {};
    }
    const base = dish.prices['dine_in'] || 0;
    store.channels.forEach((ch) => {
      if (ch.key !== 'dine_in') {
        dish.prices[ch.key] = calculateMarkupPrice(base, ch.markupPercent, ch.roundMode);
      }
    });
  });

  store.packages.forEach((pkg) => {
    if (!pkg.prices) {
      pkg.prices = {};
    }
    const base = pkg.prices['dine_in'] || 0;
    store.channels.forEach((ch) => {
      if (ch.key !== 'dine_in') {
        pkg.prices[ch.key] = calculateMarkupPrice(base, ch.markupPercent, ch.roundMode);
      }
    });
  });
};

export const deleteStoreItem = (type, id) => {
  if (type === 'dishes') {
    const targetDish = store.dishes.find((d) => {
      return d.id === id;
    });
    if (!targetDish) {
      return;
    }

    const dishName = targetDish.name;
    const usedInPackages = store.packages.filter((p) => {
      return p.slots?.some((s) => {
        return s.dishNames?.includes(dishName);
      });
    });

    if (usedInPackages.length > 0) {
      const pkgNames = usedInPackages
        .map((p) => {
          return p.name;
        })
        .slice(0, 3)
        .join('、');
      const proceed = confirm(
        `【警告】此料理已引用於以下套餐：\n${pkgNames}${usedInPackages.length > 3 ? ' 等' : ''}\n\n確定刪除將同步自所有套餐中移除此菜名，是否確定？`,
      );
      if (!proceed) {
        return;
      }
    } else {
      if (!confirm(`確定要刪除料理「${dishName}」嗎？`)) {
        return;
      }
    }

    store.dishes = store.dishes.filter((d) => {
      return d.id !== id;
    });

    store.packages.forEach((pkg) => {
      if (Array.isArray(pkg.slots)) {
        pkg.slots.forEach((slot) => {
          if (Array.isArray(slot.dishNames)) {
            slot.dishNames = slot.dishNames.filter((name) => {
              return name !== dishName;
            });
          }
        });
      }
    });
  }

  if (type === 'packages') {
    const targetPkg = store.packages.find((p) => {
      return p.id === id;
    });
    if (!confirm(`確定要刪除套餐「${targetPkg?.name || ''}」嗎？`)) {
      return;
    }
    store.packages = store.packages.filter((p) => {
      return p.id !== id;
    });
  }
};
