const CURRENT_DATA_VERSION = '2026.09.25';

const { createApp, ref, computed, watch, onMounted } = Vue;

createApp({
  setup() {
    const currentTab = ref('dishes');
    const modalType = ref(null);
    const tempBaseInput = ref('');
    const baseEditIndex = ref(null);
    const lastBackupTime = ref(null);

    const channels = ref();
    const tempChannels = ref([]);

    const categories = ref();
    const ingredients = ref();
    const methods = ref();

    const dishes = ref();
    const packages = ref();

    const dishSearch = ref('');
    const dishFilterCategory = ref('');
    const dishFilterActive = ref('');
    const dishSort = ref('default');
    const pkgSearch = ref('');
    const pkgSort = ref('default');

    const ingredientForm = ref({
      index: null,
      name: '',
      aliases: [],
    });
    const newAliasInput = ref('');

    const dishForm = ref({
      id: null,
      mode: 'combine',
      category: '熱炒',
      name: '',
      active: true,
      selectedMethod: '',
      selectedIngredients: [],
      prices: {},
    });
    const activeIngredientAliasGroup = ref(null);
    const pkgForm = ref({ id: null, name: '', active: true, prices: {}, slots: [] });

    const applyDataset = (data) => {
      if (Array.isArray(data.channels)) {
        channels.value = data.channels;
      }
      if (Array.isArray(data.categories)) {
        categories.value = data.categories;
      }
      if (Array.isArray(data.ingredients)) {
        ingredients.value = data.ingredients;
      }
      if (Array.isArray(data.methods)) {
        methods.value = data.methods;
      }
      if (Array.isArray(data.dishes)) {
        dishes.value = data.dishes.map((d) => {
          return {
            ...d,
            active: d.active !== false,
            ingredients: Array.isArray(d.ingredients) ? d.ingredients : [],
          };
        });
      }
      if (Array.isArray(data.packages)) {
        packages.value = data.packages.map((p) => {
          return {
            ...p,
            active: p.active !== false,
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
        lastBackupTime.value = data.lastBackupTime;
      }
    };

    onMounted(async () => {
      let loadedFromJSON = false;

      // 優先載入外部的 data/latest.json
      try {
        const res = await fetch('./data/latest.json', { cache: 'no-cache' });
        if (res.ok) {
          const jsonData = await res.json();
          applyDataset(jsonData);
          loadedFromJSON = true;
        }
      } catch (err) {
        console.warn('未載入 ./data/latest.json，改用本地儲存快取。');
      }

      // 若無 external JSON，則回退至 LocalStorage 快取
      if (!loadedFromJSON) {
        const raw = localStorage.getItem('restaurant_menu_master');
        if (raw) {
          try {
            const localData = JSON.parse(raw);
            applyDataset(localData);
          } catch (e) {
            console.error('讀取異常，恢復預設設定', e);
          }
        }
      }
    });

    watch(
      [channels, categories, ingredients, methods, dishes, packages, lastBackupTime],
      () => {
        const payload = {
          version: CURRENT_DATA_VERSION,
          channels: channels.value,
          categories: categories.value,
          ingredients: ingredients.value,
          methods: methods.value,
          dishes: dishes.value,
          packages: packages.value,
          lastBackupTime: lastBackupTime.value,
        };
        localStorage.setItem('restaurant_menu_master', JSON.stringify(payload));
      },
      { deep: true },
    );

    const backupWarning = computed(() => {
      if (!lastBackupTime.value) {
        return true;
      }
      const diffDays = (Date.now() - new Date(lastBackupTime.value).getTime()) / (1000 * 3600 * 24);
      return diffDays >= 7;
    });

    const lastBackupText = computed(() => {
      if (!lastBackupTime.value) {
        return '從未手動備份';
      }
      return new Date(lastBackupTime.value).toLocaleDateString('zh-TW', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    });

    const applyCustomRounding = (val, mode) => {
      if (!mode || mode === 'round1') {
        return Math.round(val);
      }
      if (mode === 'ceil5') {
        return Math.ceil(val / 5) * 5;
      }
      if (mode === 'ceil10') {
        return Math.ceil(val / 10) * 10;
      }
      if (mode === 'end9') {
        let baseRound = Math.ceil(val);
        let rem = baseRound % 10;
        return rem <= 9 ? baseRound + (9 - rem) : baseRound + 9;
      }
      if (mode === 'end8') {
        let baseRound = Math.ceil(val);
        let rem = baseRound % 10;
        return rem <= 8 ? baseRound + (8 - rem) : baseRound + (18 - rem);
      }
      return Math.round(val);
    };

    const applyAutoMarkup = (type) => {
      const target = type === 'dish' ? dishForm.value : pkgForm.value;
      const base = target.prices['dine_in'] || 0;
      channels.value.forEach((ch) => {
        if (ch.key !== 'dine_in') {
          const rate = 1 + ch.markupPercent / 100;
          target.prices[ch.key] = applyCustomRounding(base * rate, ch.roundMode);
        }
      });
    };

    const filteredDishes = computed(() => {
      let list = dishes.value.filter((d) => {
        const matchName = d.name.toLowerCase().includes(dishSearch.value.toLowerCase());
        const matchCategory = dishFilterCategory.value
          ? d.category === dishFilterCategory.value
          : true;
        let matchActive = true;
        if (dishFilterActive.value === 'active') {
          matchActive = d.active !== false;
        }
        if (dishFilterActive.value === 'inactive') {
          matchActive = d.active === false;
        }
        return matchName && matchCategory && matchActive;
      });
      if (dishSort.value === 'name') {
        list.sort((a, b) => {
          return a.name.localeCompare(b.name, 'zh-Hant');
        });
      }
      if (dishSort.value === 'priceAsc') {
        list.sort((a, b) => {
          return (a.prices.dine_in || 0) - (b.prices.dine_in || 0);
        });
      }
      if (dishSort.value === 'priceDesc') {
        list.sort((a, b) => {
          return (b.prices.dine_in || 0) - (a.prices.dine_in || 0);
        });
      }
      return list;
    });

    const filteredPackages = computed(() => {
      let list = packages.value.filter((p) => {
        return p.name.toLowerCase().includes(pkgSearch.value.toLowerCase());
      });
      if (pkgSort.value === 'name') {
        list.sort((a, b) => {
          return a.name.localeCompare(b.name, 'zh-Hant');
        });
      }
      if (pkgSort.value === 'priceAsc') {
        list.sort((a, b) => {
          return (a.prices?.dine_in || 0) - (b.prices?.dine_in || 0);
        });
      }
      if (pkgSort.value === 'priceDesc') {
        list.sort((a, b) => {
          return (b.prices?.dine_in || 0) - (a.prices?.dine_in || 0);
        });
      }
      return list;
    });

    const getMatchedDishes = (slot) => {
      if (!slot) {
        return [];
      }
      return dishes.value.filter((d) => {
        const matchSearch = slot.search ? d.name.includes(slot.search) : true;
        const matchCategory = slot.filterCategory ? d.category === slot.filterCategory : true;
        return matchSearch && matchCategory;
      });
    };

    const getVisibleDishes = (slot) => {
      const matched = getMatchedDishes(slot);
      if (!slot || slot.search || slot.filterCategory || slot.expanded) {
        return matched;
      }
      return matched.slice(0, 6);
    };

    const formatDishComponents = (dish) => {
      const parts = [];
      if (dish.method) {
        parts.push(dish.method);
      }
      if (Array.isArray(dish.ingredients) && dish.ingredients.length > 0) {
        parts.push(...dish.ingredients);
      }
      return parts.length > 0 ? parts.join(' + ') : '自訂';
    };

    const openModal = (type) => {
      modalType.value = type;
      tempBaseInput.value = '';
      baseEditIndex.value = null;
      activeIngredientAliasGroup.value = null;

      if (type === 'channelConfig') {
        tempChannels.value = JSON.parse(JSON.stringify(channels.value));
      } else if (type === 'dish') {
        dishForm.value = {
          id: null,
          mode: 'combine',
          category: categories.value[0] || '熱炒',
          active: true,
          name: '',
          selectedMethod: '',
          selectedIngredients: [],
          prices: {},
        };
        channels.value.forEach((ch) => {
          dishForm.value.prices[ch.key] = null;
        });
      } else if (type === 'package') {
        pkgForm.value = {
          id: null,
          name: '',
          active: true,
          prices: {},
          slots: [
            {
              name: '菜1',
              search: '',
              filterCategory: '',
              expanded: false,
              customInput: '',
              dishNames: [],
              autoSort: true,
            },
          ],
        };
        channels.value.forEach((ch) => {
          pkgForm.value.prices[ch.key] = null;
        });
      }
    };

    const closeModal = () => {
      modalType.value = null;
    };

    const openIngredientModal = (idx = null) => {
      newAliasInput.value = '';
      if (idx !== null && ingredients.value[idx]) {
        const target = ingredients.value[idx];
        ingredientForm.value = {
          index: idx,
          name: target.name,
          aliases: Array.isArray(target.aliases) ? [...target.aliases] : [],
        };
      } else {
        ingredientForm.value = {
          index: null,
          name: '',
          aliases: [],
        };
      }
      modalType.value = 'ingredientForm';
    };

    const addAliasToForm = () => {
      const alias = newAliasInput.value.trim();
      if (!alias) {
        return;
      }
      if (alias === ingredientForm.value.name) {
        return alert('形態名稱不能與食材本名相同');
      }
      if (ingredientForm.value.aliases.includes(alias)) {
        return alert('已存在相同的形態名稱');
      }
      ingredientForm.value.aliases.push(alias);
      newAliasInput.value = '';
    };

    const removeAliasFromForm = (aIdx) => {
      ingredientForm.value.aliases.splice(aIdx, 1);
    };

    const saveIngredientForm = () => {
      const name = ingredientForm.value.name.trim();
      if (!name) {
        return alert('食材本名不能為空！');
      }

      const isDuplicate = ingredients.value.some((ing, i) => {
        return ing.name === name && i !== ingredientForm.value.index;
      });
      if (isDuplicate) {
        return alert('此食材本名已存在！');
      }

      const payload = {
        name,
        aliases: [...ingredientForm.value.aliases],
      };

      if (ingredientForm.value.index !== null) {
        ingredients.value[ingredientForm.value.index] = payload;
      } else {
        ingredients.value.push(payload);
      }
      closeModal();
    };

    const openSimpleBaseModal = (type, idx = null) => {
      modalType.value = type;
      baseEditIndex.value = idx;
      if (idx !== null) {
        const arr = type === 'method' ? methods.value : categories.value;
        tempBaseInput.value = arr[idx] || '';
      } else {
        tempBaseInput.value = '';
      }
    };

    const saveSimpleBaseItem = () => {
      const val = tempBaseInput.value.trim();
      if (!val) {
        return;
      }
      const arr = modalType.value === 'method' ? methods.value : categories.value;
      const isDuplicate = arr.some((item, i) => {
        return item === val && i !== baseEditIndex.value;
      });
      if (isDuplicate) {
        return alert('該名稱已存在！');
      }

      if (baseEditIndex.value !== null) {
        arr[baseEditIndex.value] = val;
      } else {
        arr.push(val);
      }
      closeModal();
    };

    const deleteBaseItem = (type, idx) => {
      if (type === 'ingredient') {
        const target = ingredients.value[idx];
        if (!target) {
          return;
        }
        const names = [target.name, ...(Array.isArray(target.aliases) ? target.aliases : [])];
        const used = dishes.value.filter((d) => {
          return d.ingredients.some((ing) => {
            return names.includes(ing);
          });
        });
        if (used.length > 0) {
          const dishNames = used
            .map((d) => {
              return d.name;
            })
            .slice(0, 3)
            .join('、');
          return alert(
            `無法刪除！已有 ${used.length} 道料理使用此食材 (${dishNames}...)\n請先修改或刪除料理。`,
          );
        }
        if (confirm(`確定移除食材「${target.name}」？`)) {
          ingredients.value.splice(idx, 1);
        }
      } else if (type === 'method') {
        const name = methods.value[idx];
        const used = dishes.value.filter((d) => {
          return d.method === name;
        });
        if (used.length > 0) {
          const dishNames = used
            .map((d) => {
              return d.name;
            })
            .slice(0, 3)
            .join('、');
          return alert(
            `無法刪除！已有 ${used.length} 道料理使用此作法 (${dishNames}...)\n請先修改或刪除料理。`,
          );
        }
        if (confirm(`確定移除作法「${name}」？`)) {
          methods.value.splice(idx, 1);
        }
      } else if (type === 'category') {
        const name = categories.value[idx];
        const used = dishes.value.filter((d) => {
          return d.category === name;
        });
        if (used.length > 0) {
          return alert(`無法刪除！已有 ${used.length} 道料理屬於「${name}」類別。`);
        }
        if (confirm(`確定移除類別「${name}」？`)) {
          categories.value.splice(idx, 1);
        }
      }
    };

    const addTempChannel = () => {
      const name = prompt('請輸入通路名稱:');
      if (!name) {
        return;
      }
      tempChannels.value.push({
        key: 'ch_' + Date.now(),
        name,
        markupPercent: 0,
        roundMode: 'ceil5',
      });
    };

    const removeTempChannel = (idx) => {
      tempChannels.value.splice(idx, 1);
    };

    const saveChannelConfig = () => {
      channels.value = JSON.parse(JSON.stringify(tempChannels.value));
      // 同步重新計算所有料理與套餐的通路價格
      dishes.value.forEach((dish) => {
        const base = dish.prices?.['dine_in'] || 0;
        channels.value.forEach((ch) => {
          if (ch.key !== 'dine_in') {
            const rate = 1 + ch.markupPercent / 100;
            dish.prices[ch.key] = applyCustomRounding(base * rate, ch.roundMode);
          }
        });
      });

      packages.value.forEach((pkg) => {
        const base = pkg.prices?.['dine_in'] || 0;
        channels.value.forEach((ch) => {
          if (ch.key !== 'dine_in') {
            const rate = 1 + ch.markupPercent / 100;
            pkg.prices[ch.key] = applyCustomRounding(base * rate, ch.roundMode);
          }
        });
      });
      closeModal();
    };

    const setDishMode = (mode) => {
      dishForm.value.mode = mode;
      if (mode === 'combine') {
        updateCombineDishName();
      }
    };

    const updateCombineDishName = () => {
      const m = dishForm.value.selectedMethod || '';
      const ings = dishForm.value.selectedIngredients.join('');
      dishForm.value.name = `${m}${ings}`;
    };

    const selectDishMethod = (m) => {
      dishForm.value.selectedMethod = dishForm.value.selectedMethod === m ? '' : m;
      updateCombineDishName();
    };

    const handleIngredientClick = (ing) => {
      if (ing.aliases && ing.aliases.length > 0) {
        activeIngredientAliasGroup.value = ing;
      } else {
        pushIngredientToken(ing.name);
      }
    };

    const pushIngredientToken = (val) => {
      dishForm.value.selectedIngredients.push(val);
      updateCombineDishName();
    };

    const removeDishIngredientToken = (idx) => {
      dishForm.value.selectedIngredients.splice(idx, 1);
      updateCombineDishName();
    };

    const clearDishTokens = () => {
      dishForm.value.selectedMethod = '';
      dishForm.value.selectedIngredients = [];
      updateCombineDishName();
    };

    const saveDish = () => {
      const name = dishForm.value.name.trim();
      if (!name) {
        return alert('料理名稱不得為空！');
      }
      if (!dishForm.value.category) {
        return alert('請選擇料理類別！');
      }

      const existingDish = dishes.value.find((d) => {
        return d.name === name && d.id !== dishForm.value.id;
      });
      if (existingDish) {
        const loadExisting = confirm(
          `已存在同名料理「${name}」！\n\n按「確定」：立即載入現有資料進行修改。\n按「取消」：更換名稱。`,
        );
        if (loadExisting) {
          editDish(existingDish);
        }
        return;
      }

      const payload = {
        id: dishForm.value.id || Date.now(),
        name,
        active: dishForm.value.active !== false,
        mode: dishForm.value.mode,
        category: dishForm.value.category,
        method: dishForm.value.mode === 'combine' ? dishForm.value.selectedMethod : '',
        ingredients:
          dishForm.value.mode === 'combine' ? [...dishForm.value.selectedIngredients] : [],
        prices: { ...dishForm.value.prices },
      };

      if (dishForm.value.id) {
        const idx = dishes.value.findIndex((d) => {
          return d.id === dishForm.value.id;
        });
        const oldName = idx !== -1 ? dishes.value[idx].name : null;
        if (oldName && oldName !== name) {
          packages.value.forEach((pkg) => {
            if (Array.isArray(pkg.slots)) {
              pkg.slots.forEach((slot) => {
                if (Array.isArray(slot.dishNames) && slot.dishNames.includes(oldName)) {
                  slot.dishNames = [
                    ...new Set(
                      slot.dishNames.map((dName) => {
                        return dName === oldName ? name : dName;
                      }),
                    ),
                  ];
                }
              });
            }
          });
        }
        if (idx !== -1) {
          dishes.value[idx] = payload;
        }
      } else {
        dishes.value.unshift(payload);
      }
      closeModal();
    };

    const editDish = (dish) => {
      modalType.value = 'dish';
      activeIngredientAliasGroup.value = null;

      dishForm.value = {
        id: dish.id,
        active: dish.active !== false,
        mode: dish.mode || 'combine',
        category: dish.category || categories.value[0] || '熱炒',
        name: dish.name,
        selectedMethod: dish.method || '',
        selectedIngredients: Array.isArray(dish.ingredients) ? [...dish.ingredients] : [],
        prices: { ...dish.prices },
      };
    };

    const addPkgSlot = () => {
      pkgForm.value.slots.push({
        name: `菜${pkgForm.value.slots.length + 1}`,
        search: '',
        filterCategory: '',
        expanded: false,
        customInput: '',
        dishNames: [],
        autoSort: true,
      });
    };

    const movePkgSlot = (idx, direction) => {
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= pkgForm.value.slots.length) {
        return;
      }
      const temp = pkgForm.value.slots[idx];
      pkgForm.value.slots[idx] = pkgForm.value.slots[targetIdx];
      pkgForm.value.slots[targetIdx] = temp;
    };

    const sortPkgSlotsByName = () => {
      pkgForm.value.slots.sort((a, b) => {
        return (a.name || '').localeCompare(b.name || '', 'zh-Hant', { numeric: true });
      });
    };

    const sortSlotDishNames = (slot) => {
      if (!slot || !Array.isArray(slot.dishNames)) {
        return;
      }
      slot.dishNames = [...slot.dishNames].sort((a, b) => {
        return a.localeCompare(b, 'zh-Hant');
      });
    };

    const onSlotAutoSortChange = (slot) => {
      if (slot && slot.autoSort) {
        sortSlotDishNames(slot);
      }
    };

    const handleDishCheckboxToggle = (slot, dishName) => {
      if (!slot) {
        return;
      }
      if (slot.autoSort) {
        sortSlotDishNames(slot);
      }
    };
    const removePkgSlot = (idx) => {
      pkgForm.value.slots.splice(idx, 1);
    };

    const removeDishFromSlot = (slot, dishName) => {
      if (!slot || !Array.isArray(slot.dishNames)) {
        return;
      }
      const targetIdx = slot.dishNames.indexOf(dishName);
      if (targetIdx !== -1) {
        slot.dishNames.splice(targetIdx, 1);
      }
    };

    const addCustomDishToSlot = (slot) => {
      if (!slot) {
        return;
      }
      const name = (slot.customInput || '').trim();
      if (!name) {
        return;
      }
      if (slot.dishNames.includes(name)) {
        alert('此菜名已在該選項中！');
        return;
      }
      slot.dishNames.push(name);
      if (slot.autoSort) {
        sortSlotDishNames(slot);
      }
      slot.customInput = '';
    };

    const savePackage = () => {
      const name = pkgForm.value.name.trim();
      if (!name) {
        return alert('套餐名稱不得為空！');
      }

      const existingPkg = packages.value.find((p) => {
        return p.name === name && p.id !== pkgForm.value.id;
      });
      if (existingPkg) {
        const loadExisting = confirm(
          `已存在同名套餐「${name}」！\n\n按「確定」：立即載入現有內容進行修改。\n按「取消」：更換名稱。`,
        );
        if (loadExisting) {
          editPackage(existingPkg);
        }
        return;
      }

      const payload = {
        id: pkgForm.value.id || Date.now(),
        name,
        active: pkgForm.value.active !== false,
        prices: { ...pkgForm.value.prices },
        slots: pkgForm.value.slots.map((s) => {
          return {
            name: s.name,
            autoSort: s.autoSort !== false,
            dishNames: [...s.dishNames],
          };
        }),
      };

      if (pkgForm.value.id) {
        const idx = packages.value.findIndex((p) => {
          return p.id === pkgForm.value.id;
        });
        if (idx !== -1) {
          packages.value[idx] = payload;
        }
      } else {
        packages.value.unshift(payload);
      }
      closeModal();
    };

    const editPackage = (pkg) => {
      modalType.value = 'package';
      pkgForm.value = {
        id: pkg.id,
        name: pkg.name,
        active: pkg.active !== false,
        prices: { ...pkg.prices },
        slots: Array.isArray(pkg.slots)
          ? pkg.slots.map((s) => {
              return {
                name: s.name,
                search: '',
                filterCategory: '',
                expanded: false,
                customInput: '',
                dishNames: Array.isArray(s.dishNames) ? [...s.dishNames] : [],
                autoSort: s.autoSort !== false,
              };
            })
          : [],
      };
    };

    const deleteItem = (type, id) => {
      if (confirm('確定要刪除此項目嗎？')) {
        if (type === 'dishes') {
          dishes.value = dishes.value.filter((d) => {
            return d.id !== id;
          });
        }
        if (type === 'packages') {
          packages.value = packages.value.filter((p) => {
            return p.id !== id;
          });
        }
      }
    };

    const exportJSON = () => {
      const nowIso = new Date().toISOString();
      lastBackupTime.value = nowIso;
      const dump = {
        version: CURRENT_DATA_VERSION,
        exportedAt: nowIso,
        channels: channels.value,
        categories: categories.value,
        ingredients: ingredients.value,
        methods: methods.value,
        dishes: dishes.value,
        packages: packages.value,
        lastBackupTime: nowIso,
      };
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);

      const d = new Date();
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
          .formatToParts(d)
          .map((p) => {
            return [p.type, p.value];
          }),
      );

      a.download = `菜單完整備份_${parts.year}${parts.month}${parts.day}_${parts.hour}${parts.minute}${parts.second}.json`;
      a.click();
    };

    const importJSON = (e) => {
      const file = e.target.files[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (confirm('匯入將會完整覆寫現有菜單與通路資料，確定繼續？')) {
            if (data.channels) {
              channels.value = data.channels;
            }
            if (data.categories) {
              categories.value = data.categories;
            }
            if (data.ingredients) {
              ingredients.value = data.ingredients;
            }
            if (data.methods) {
              methods.value = data.methods;
            }
            if (data.dishes) {
              dishes.value = data.dishes;
            }
            if (data.packages) {
              packages.value = data.packages;
            }
            lastBackupTime.value = data.lastBackupTime || new Date().toISOString();
            alert('資料匯入完成！');
          }
        } catch (err) {
          alert('JSON 格式錯誤，無法解析！');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    };

    const escapeCSVField = (val) => {
      if (val === null || val === undefined) {
        return '""';
      }
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const exportCSV = () => {
      const isConfirmed = confirm(
        '即將匯出菜單 CSV。\n\n按「確定」：僅匯出【上架/供應中】品項\n按「取消」：取消並放棄匯出',
      );
      if (!isConfirmed) {
        return; // 使用者點選取消，直接中止流程
      }
      const onlyActive = true;
      const columns = [
        {
          header: '類型',
          resolve: (item) => {
            return item.__type;
          },
        },
        {
          header: '類別',
          resolve: (item) => {
            return item.__type === '單品料理' ? item.category || '' : '套餐';
          },
        },
        {
          header: '名稱',
          resolve: (item) => {
            return item.name;
          },
        },
        ...channels.value.map((c) => {
          return {
            header: c.name,
            resolve: (item) => {
              return item.prices[c.key] || 0;
            },
          };
        }),
        {
          header: '套餐內容明細',
          resolve: (item) => {
            if (item.__type !== '套餐組合' || !item.slots) {
              return '';
            }
            return item.slots
              .map((s) => {
                return `${s.name}:[${s.dishNames.join('/')}]`;
              })
              .join('; ');
          },
        },
      ];
      const targetDishes = onlyActive
        ? dishes.value.filter((d) => {
            return d.active !== false;
          })
        : dishes.value;
      const targetPkgs = onlyActive
        ? packages.value.filter((p) => {
            return p.active !== false;
          })
        : packages.value;
      const rows = [
        ...targetDishes.map((d) => {
          return { ...d, __type: '單品料理' };
        }),
        ...targetPkgs.map((p) => {
          return { ...p, __type: '套餐組合' };
        }),
      ].sort((a, b) => {
        // 1. 類型排序 (單品料理 優先於 套餐組合)
        if (a.__type !== b.__type) {
          return a.__type === '單品料理' ? -1 : 1;
        }
        // 2. 類別排序 (單品料理比較 category)
        const catA = a.category || '';
        const catB = b.category || '';
        const catCmp = catA.localeCompare(catB, 'zh-Hant');
        if (catCmp !== 0) {
          return catCmp;
        }
        // 3. 名稱排序 (中文筆畫/字典序)
        const nameCmp = (a.name || '').localeCompare(b.name || '', 'zh-Hant');
        if (nameCmp !== 0) {
          return nameCmp;
        }
        // 4. 價格排序 (內用價 由小到大)
        const priceA = a.prices?.dine_in ?? 0;
        const priceB = b.prices?.dine_in ?? 0;
        return priceA - priceB;
      });
      const headerLine = columns
        .map((col) => {
          return escapeCSVField(col.header);
        })
        .join(',');
      const dataLines = rows.map((row) => {
        return columns
          .map((col) => {
            return escapeCSVField(col.resolve(row));
          })
          .join(',');
      });
      const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);

      const d = new Date();
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
          .formatToParts(d)
          .map((p) => {
            return [p.type, p.value];
          }),
      );
      a.download = `菜單價目表_${parts.year}${parts.month}${parts.day}_${parts.hour}${parts.minute}${parts.second}.csv`;

      a.click();
      URL.revokeObjectURL(a.href);
    };

    return {
      currentTab,
      modalType,
      tempBaseInput,
      baseEditIndex,
      channels,
      tempChannels,
      categories,
      ingredients,
      methods,
      dishes,
      packages,
      dishSearch,
      dishFilterCategory,
      dishFilterActive,
      dishSort,
      pkgSearch,
      pkgSort,
      dishForm,
      pkgForm,
      ingredientForm,
      newAliasInput,
      filteredDishes,
      filteredPackages,
      backupWarning,
      lastBackupText,
      formatDishComponents,
      openModal,
      closeModal,
      openIngredientModal,
      addAliasToForm,
      removeAliasFromForm,
      saveIngredientForm,
      openSimpleBaseModal,
      saveSimpleBaseItem,
      saveChannelConfig,
      addTempChannel,
      removeTempChannel,
      deleteBaseItem,
      setDishMode,
      selectDishMethod,
      handleIngredientClick,
      pushIngredientToken,
      removeDishIngredientToken,
      clearDishTokens,
      activeIngredientAliasGroup,
      applyAutoMarkup,
      saveDish,
      editDish,
      addPkgSlot,
      movePkgSlot,
      sortPkgSlotsByName,
      sortSlotDishNames,
      onSlotAutoSortChange,
      handleDishCheckboxToggle,
      removePkgSlot,
      removeDishFromSlot,
      addCustomDishToSlot,
      savePackage,
      editPackage,
      getMatchedDishes,
      getVisibleDishes,
      deleteItem,
      exportJSON,
      importJSON,
      exportCSV,
    };
  },
}).mount('#app');
