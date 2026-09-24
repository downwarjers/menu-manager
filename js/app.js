import {
  DEFAULT_CHANNELS,
  DEFAULT_CATEGORIES,
  DEFAULT_INGREDIENTS,
  DEFAULT_METHODS,
  DEFAULT_DISHES
} from './data.js';

const { createApp, ref, computed, watch, onMounted } = Vue;

createApp({
  setup() {
    const currentTab = ref('dishes');
    const modalType = ref(null);
    const tempBaseInput = ref('');
    const lastBackupTime = ref(null);

    const channels = ref(DEFAULT_CHANNELS);
    const tempChannels = ref([]);

    const categories = ref(DEFAULT_CATEGORIES);
    const ingredients = ref(DEFAULT_INGREDIENTS);
    const methods = ref(DEFAULT_METHODS);
    
    const dishes = ref(DEFAULT_DISHES);
    const packages = ref([]);

    const dishSearch = ref('');
    const dishFilterCategory = ref('');
    const dishFilterActive = ref('');
    const dishSort = ref('default');
    const pkgSearch = ref('');

    const dishForm = ref({ 
      id: null, mode: 'combine', category: '熱炒', name: '', active: true,
      selectedMethod: '', selectedIngredientA: '', selectedIngredientB: '', prices: {} 
    });
    const pkgForm = ref({ id: null, name: '', active: true, prices: {}, slots: [] });

    onMounted(() => {
      const raw = localStorage.getItem('restaurant_menu_master');
      if (raw) {
        try {
          const data = JSON.parse(raw);
          if (data.channels) {
            channels.value = data.channels.map(c => ({
              ...c,
              roundMode: c.roundMode || 'ceil5'
            }));
          }
          if (data.categories) categories.value = data.categories;
          if (data.ingredients) ingredients.value = data.ingredients;
          if (data.methods) methods.value = data.methods;
          if (data.dishes) {
            dishes.value = data.dishes.map(d => ({
              ...d,
              active: d.active !== false,
              ingredientA: d.ingredientA || d.ingredient || '',
              ingredientB: d.ingredientB || ''
            }));
          }
          if (data.packages) {
            packages.value = data.packages.map(p => ({
              ...p,
              active: p.active !== false
            }));
          }
          if (data.lastBackupTime) lastBackupTime.value = data.lastBackupTime;
        } catch (e) {
          console.error('讀取異常', e);
        }
      }
    });

    watch([channels, categories, ingredients, methods, dishes, packages, lastBackupTime], () => {
      const payload = {
        channels: channels.value,
        categories: categories.value,
        ingredients: ingredients.value,
        methods: methods.value,
        dishes: dishes.value,
        packages: packages.value,
        lastBackupTime: lastBackupTime.value
      };
      localStorage.setItem('restaurant_menu_master', JSON.stringify(payload));
    }, { deep: true });

    const backupWarning = computed(() => {
      if (!lastBackupTime.value) return true;
      const diffDays = (Date.now() - new Date(lastBackupTime.value).getTime()) / (1000 * 3600 * 24);
      return diffDays >= 7;
    });

    const lastBackupText = computed(() => {
      if (!lastBackupTime.value) return '從未手動備份';
      return new Date(lastBackupTime.value).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    });

    const applyCustomRounding = (val, mode) => {
      if (!mode || mode === 'round1') return Math.round(val);
      if (mode === 'ceil5') return Math.ceil(val / 5) * 5;
      if (mode === 'ceil10') return Math.ceil(val / 10) * 10;
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
      channels.value.forEach(ch => {
        if (ch.key !== 'dine_in') {
          const rate = 1 + (ch.markupPercent / 100);
          target.prices[ch.key] = applyCustomRounding(base * rate, ch.roundMode);
        }
      });
    };

    const filteredDishes = computed(() => {
      let list = dishes.value.filter(d => {
        const matchName = d.name.toLowerCase().includes(dishSearch.value.toLowerCase());
        const matchCategory = dishFilterCategory.value ? d.category === dishFilterCategory.value : true;
        let matchActive = true;
        if (dishFilterActive.value === 'active') matchActive = (d.active !== false);
        if (dishFilterActive.value === 'inactive') matchActive = (d.active === false);
        return matchName && matchCategory && matchActive;
      });
      if (dishSort.value === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
      if (dishSort.value === 'priceAsc') list.sort((a, b) => (a.prices.dine_in || 0) - (b.prices.dine_in || 0));
      if (dishSort.value === 'priceDesc') list.sort((a, b) => (b.prices.dine_in || 0) - (a.prices.dine_in || 0));
      return list;
    });

    const filteredPackages = computed(() => {
      return packages.value.filter(p => p.name.toLowerCase().includes(pkgSearch.value.toLowerCase()));
    });

    const getMatchedDishes = (slot) => {
      return dishes.value.filter(d => {
        const matchSearch = slot.search ? d.name.includes(slot.search) : true;
        const matchCategory = slot.filterCategory ? d.category === slot.filterCategory : true;
        return matchSearch && matchCategory;
      });
    };

    const getVisibleDishes = (slot) => {
      const matched = getMatchedDishes(slot);
      if (slot.search || slot.filterCategory || slot.expanded) return matched;
      return matched.slice(0, 6);
    };

    const formatDishComponents = (dish) => {
      const parts = [];
      if (dish.method) parts.push(dish.method);
      if (dish.ingredientA) parts.push(dish.ingredientA);
      if (dish.ingredientB) parts.push(dish.ingredientB);
      return parts.length > 0 ? parts.join(' + ') : '自訂';
    };

    const openModal = (type) => {
      modalType.value = type;
      tempBaseInput.value = '';
      if (type === 'channelConfig') {
        tempChannels.value = JSON.parse(JSON.stringify(channels.value));
      } else if (type === 'dish') {
        dishForm.value = { 
          id: null, mode: 'combine', category: categories.value[0] || '熱炒', active: true,
          name: '', selectedMethod: '', selectedIngredientA: '', selectedIngredientB: '', prices: {} 
        };
        channels.value.forEach(ch => dishForm.value.prices[ch.key] = null);
      } else if (type === 'package') {
        pkgForm.value = { 
          id: null, name: '', active: true, prices: {}, 
          slots: [{ name: '菜1 (2選1)', search: '', filterCategory: '', expanded: false, dishNames: [] }] 
        };
        channels.value.forEach(ch => pkgForm.value.prices[ch.key] = null);
      }
    };

    const closeModal = () => { modalType.value = null; };

    const addTempChannel = () => {
      const name = prompt('請輸入通路名稱:');
      if (!name) return;
      tempChannels.value.push({ key: 'ch_' + Date.now(), name, markupPercent: 0, roundMode: 'ceil5' });
    };
    const removeTempChannel = (idx) => { tempChannels.value.splice(idx, 1); };
    const saveChannelConfig = () => {
      channels.value = JSON.parse(JSON.stringify(tempChannels.value));
      closeModal();
    };

    const saveBaseItem = () => {
      const val = tempBaseInput.value.trim();
      if (!val) return;
      if (modalType.value === 'ingredient') {
        if (ingredients.value.includes(val)) return alert('該食材已存在！');
        ingredients.value.push(val);
      }
      if (modalType.value === 'method') {
        if (methods.value.includes(val)) return alert('該作法已存在！');
        methods.value.push(val);
      }
      if (modalType.value === 'category') {
        if (categories.value.includes(val)) return alert('該類別已存在！');
        categories.value.push(val);
      }
      closeModal();
    };

    const renameBaseItem = (type, idx) => {
      const targetArr = type === 'ingredient' ? ingredients.value : type === 'method' ? methods.value : categories.value;
      const current = targetArr[idx];
      const next = prompt('修改名稱：', current);
      if (next && next.trim() && next !== current) {
        const clean = next.trim();
        if (targetArr.includes(clean)) return alert('修改後名稱已存在，請勿重複！');
        targetArr[idx] = clean;
      }
    };

    const deleteBaseItem = (type, idx) => {
      if (type === 'ingredient') {
        const name = ingredients.value[idx];
        const used = dishes.value.filter(d => d.ingredientA === name || d.ingredientB === name);
        if (used.length > 0) {
          const dishNames = used.map(d => d.name).slice(0, 3).join('、');
          return alert(`無法刪除！已有 ${used.length} 道料理正在使用此食材 (${dishNames}...)\n請先修改或刪除這些料理。`);
        }
        if (confirm(`確定移除食材「${name}」？`)) ingredients.value.splice(idx, 1);
      } else if (type === 'method') {
        const name = methods.value[idx];
        const used = dishes.value.filter(d => d.method === name);
        if (used.length > 0) {
          const dishNames = used.map(d => d.name).slice(0, 3).join('、');
          return alert(`無法刪除！已有 ${used.length} 道料理正在使用此作法 (${dishNames}...)\n請先修改或刪除這些料理。`);
        }
        if (confirm(`確定移除作法「${name}」？`)) methods.value.splice(idx, 1);
      } else if (type === 'category') {
        const name = categories.value[idx];
        const used = dishes.value.filter(d => d.category === name);
        if (used.length > 0) {
          return alert(`無法刪除！已有 ${used.length} 道料理屬於「${name}」類別，請先為它們更換類別。`);
        }
        if (confirm(`確定移除類別「${name}」？`)) categories.value.splice(idx, 1);
      }
    };

    const setDishMode = (mode) => {
      dishForm.value.mode = mode;
      if (mode === 'combine') updateCombineDishName();
    };

    const updateCombineDishName = () => {
      const m = dishForm.value.selectedMethod || '';
      const a = dishForm.value.selectedIngredientA || '';
      const b = dishForm.value.selectedIngredientB || '';
      dishForm.value.name = `${m}${a}${b}`;
    };

    const selectDishMethod = (m) => {
      dishForm.value.selectedMethod = m;
      updateCombineDishName();
    };
    const selectDishIngredientA = (ing) => {
      dishForm.value.selectedIngredientA = ing;
      updateCombineDishName();
    };
    const selectDishIngredientB = (ing) => {
      dishForm.value.selectedIngredientB = ing;
      updateCombineDishName();
    };

    const saveDish = () => {
      const name = dishForm.value.name.trim();
      if (!name) return alert('料理名稱不得為空！');
      if (!dishForm.value.category) return alert('請選擇料理類別！');

      const existingDish = dishes.value.find(d => d.name === name && d.id !== dishForm.value.id);
      if (existingDish) {
        const loadExisting = confirm(`已存在同名料理「${name}」！\n\n按「確定」：立即載入該料理的現有資料供您修改。\n按「取消」：保留目前畫面，請您更換名稱。`);
        if (loadExisting) {
          editDish(existingDish);
        }
        return;
      }

      const payload = {
        id: dishForm.value.id || Date.now(),
        name: name,
        active: dishForm.value.active !== false,
        mode: dishForm.value.mode,
        category: dishForm.value.category,
        method: dishForm.value.mode === 'combine' ? dishForm.value.selectedMethod : '',
        ingredientA: dishForm.value.mode === 'combine' ? dishForm.value.selectedIngredientA : '',
        ingredientB: dishForm.value.mode === 'combine' ? dishForm.value.selectedIngredientB : '',
        prices: { ...dishForm.value.prices }
      };

      if (dishForm.value.id) {
        const idx = dishes.value.findIndex(d => d.id === dishForm.value.id);
        if (idx !== -1) dishes.value[idx] = payload;
      } else {
        dishes.value.unshift(payload);
      }
      closeModal();
    };

    const editDish = (dish) => {
      modalType.value = 'dish';
      dishForm.value = {
        id: dish.id,
        active: dish.active !== false,
        mode: dish.mode || 'combine',
        category: dish.category || categories.value[0] || '熱炒',
        name: dish.name,
        selectedMethod: dish.method || '',
        selectedIngredientA: dish.ingredientA || dish.ingredient || '',
        selectedIngredientB: dish.ingredientB || '',
        prices: { ...dish.prices }
      };
    };

    const addPkgSlot = () => {
      pkgForm.value.slots.push({ 
        name: `菜${pkgForm.value.slots.length + 1}`, 
        search: '', 
        filterCategory: '', 
        expanded: false, 
        dishNames: [] 
      });
    };
    const removePkgSlot = (idx) => { pkgForm.value.slots.splice(idx, 1); };

    const removeDishFromSlot = (slot, dishName) => {
      const targetIdx = slot.dishNames.indexOf(dishName);
      if (targetIdx !== -1) slot.dishNames.splice(targetIdx, 1);
    };

    const savePackage = () => {
      const name = pkgForm.value.name.trim();
      if (!name) return alert('套餐名稱不得為空！');

      const existingPkg = packages.value.find(p => p.name === name && p.id !== pkgForm.value.id);
      if (existingPkg) {
        const loadExisting = confirm(`已存在同名套餐「${name}」！\n\n按「確定」：立即載入該套餐的現有內容供您修改。\n按「取消」：保留目前畫面，請您更換名稱。`);
        if (loadExisting) {
          editPackage(existingPkg);
        }
        return;
      }

      const payload = {
        id: pkgForm.value.id || Date.now(),
        name: name,
        active: pkgForm.value.active !== false,
        prices: { ...pkgForm.value.prices },
        slots: pkgForm.value.slots.map(s => ({ name: s.name, dishNames: [...s.dishNames] }))
      };

      if (pkgForm.value.id) {
        const idx = packages.value.findIndex(p => p.id === pkgForm.value.id);
        if (idx !== -1) packages.value[idx] = payload;
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
        slots: pkg.slots.map(s => ({ 
          name: s.name, 
          search: '', 
          filterCategory: '', 
          expanded: false, 
          dishNames: [...s.dishNames] 
        }))
      };
    };

    const deleteItem = (type, id) => {
      if (confirm('確定要刪除此項目嗎？')) {
        if (type === 'dishes') dishes.value = dishes.value.filter(d => d.id !== id);
        if (type === 'packages') packages.value = packages.value.filter(p => p.id !== id);
      }
    };

    const exportJSON = () => {
      const nowIso = new Date().toISOString();
      lastBackupTime.value = nowIso;

      const dump = {
        version: '2.7',
        exportedAt: nowIso,
        channels: channels.value,
        categories: categories.value,
        ingredients: ingredients.value,
        methods: methods.value,
        dishes: dishes.value,
        packages: packages.value,
        lastBackupTime: nowIso
      };
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `菜單完整備份_${nowIso.slice(0, 10)}.json`;
      a.click();
    };

    const importJSON = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (confirm('匯入將會完整覆寫現有菜單與通路資料，確定繼續？')) {
            if (data.channels) channels.value = data.channels;
            if (data.categories) categories.value = data.categories;
            if (data.ingredients) ingredients.value = data.ingredients;
            if (data.methods) methods.value = data.methods;
            if (data.dishes) dishes.value = data.dishes;
            if (data.packages) packages.value = data.packages;
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

    const exportCSV = () => {
      const onlyActive = confirm('是否【只匯出目前上架/供應中】的品項？\n\n按「確定」：僅匯出上架品項（適合外送與現場印製）\n按「取消」：匯出全部品項（包含停售品）');

      const chHeaders = channels.value.map(c => c.name);
      let csv = '\uFEFF類型,類別,名稱,狀態,' + chHeaders.join(',') + ',套餐內容明細\n';

      const targetDishes = onlyActive ? dishes.value.filter(d => d.active !== false) : dishes.value;
      targetDishes.forEach(d => {
        const pVals = channels.value.map(c => d.prices[c.key] || 0);
        const status = d.active !== false ? '上架中' : '已停售';
        csv += `單品料理,"${d.category || ''}","${d.name}","${status}",` + pVals.join(',') + `,""\n`;
      });

      const targetPkgs = onlyActive ? packages.value.filter(p => p.active !== false) : packages.value;
      targetPkgs.forEach(p => {
        const pVals = channels.value.map(c => p.prices[c.key] || 0);
        const status = p.active !== false ? '供應中' : '已停售';
        const rules = p.slots.map(s => `${s.name}:[${s.dishNames.join('/')}]`).join('; ');
        csv += `套餐組合,"套餐","${p.name}","${status}",` + pVals.join(',') + `,"${rules}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `菜單價目表_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    };

    return {
      currentTab, modalType, tempBaseInput, channels, tempChannels,
      categories, ingredients, methods, dishes, packages,
      dishSearch, dishFilterCategory, dishFilterActive, dishSort, pkgSearch,
      dishForm, pkgForm, filteredDishes, filteredPackages,
      backupWarning, lastBackupText,
      formatDishComponents, openModal, closeModal, saveChannelConfig, addTempChannel, removeTempChannel,
      saveBaseItem, renameBaseItem, deleteBaseItem,
      setDishMode, selectDishMethod, selectDishIngredientA, selectDishIngredientB, applyAutoMarkup, saveDish, editDish,
      addPkgSlot, removePkgSlot, removeDishFromSlot, savePackage, editPackage,
      getMatchedDishes, getVisibleDishes, deleteItem,
      exportJSON, importJSON, exportCSV
    };
  }
}).mount('#app');