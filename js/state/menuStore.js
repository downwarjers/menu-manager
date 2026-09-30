import { reactive, watch } from 'vue';
import { calculateMarkupPrice } from '../utils/pricing.js';

const STORAGE_KEY = 'restaurant_menu_master';

export const store = reactive({
  version: 'initial',
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
  let remoteData = null;
  try {
    const res = await fetch('./data/latest.json', { cache: 'no-cache' });
    if (res.ok) {
      remoteData = await res.json();
    }
  } catch (err) {
    console.warn('無法連線取得 ./data/latest.json，切換至離線/本地模式', err);
  }

  const rawLocal = localStorage.getItem(STORAGE_KEY);
  let localData = null;
  if (rawLocal) {
    try {
      localData = JSON.parse(rawLocal);
    } catch (e) {
      console.error('LocalStorage 資料解析失敗', e);
    }
  }

  if (remoteData) {
    // 若本地無資料，或遠端 JSON 版本不同，直接以遠端最新 JSON 強制覆蓋本地
    if (!localData || localData.version !== remoteData.version) {
      store.version = remoteData.version || 'unknown';
      applyDataset(remoteData);
    } else {
      // 版本相同：優先採用本地 LocalStorage 的暫存狀態
      store.version = localData.version;
      applyDataset(localData);
    }
  } else if (localData) {
    // 斷網或讀不到遠端 JSON 時的降級處理
    store.version = localData.version || 'offline';
    applyDataset(localData);
  }

  watch(
    () => {
      return store;
    },
    () => {
      const payload = {
        version: store.version,
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
        `此品項正被以下套餐使用中：\n${pkgNames}${usedInPackages.length > 3 ? '...' : ''}\n\n確定仍要刪除嗎？`,
      );
      if (!proceed) {
        return;
      }
    } else {
      if (!confirm(`確定要刪除「${dishName}」嗎？`)) {
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
