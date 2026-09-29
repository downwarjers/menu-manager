import { ref } from 'vue';
import { store } from '../../state/menuStore.js';

export default {
  name: 'SlotQuickEditModal',
  props: {
    pkg: {
      type: Object,
      required: true,
    },
    slotIndex: {
      type: Number,
      required: true,
    },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const slot = props.pkg.slots[props.slotIndex];
    const search = ref('');
    const filterCategory = ref('');
    const expanded = ref(false);

    const sortSlotDishNames = () => {
      if (!slot || !Array.isArray(slot.dishNames)) {
        return;
      }
      slot.dishNames = [...slot.dishNames].sort((a, b) => {
        return a.localeCompare(b, 'zh-Hant');
      });
    };

    const onAutoSortChange = () => {
      if (slot && slot.autoSort) {
        sortSlotDishNames();
      }
    };

    const handleDishToggle = () => {
      if (slot && slot.autoSort) {
        sortSlotDishNames();
      }
    };

    const removeDish = (dishName) => {
      const idx = slot.dishNames.indexOf(dishName);
      if (idx !== -1) {
        slot.dishNames.splice(idx, 1);
      }
    };

    const addCustomDish = () => {
      const name = search.value.trim();
      if (!name) {
        return;
      }
      if (slot.dishNames.includes(name)) {
        alert('此菜品已在清單中');
        return;
      }
      slot.dishNames.push(name);
      if (slot.autoSort) {
        sortSlotDishNames();
      }
      search.value = '';
    };

    const getMatchedDishes = () => {
      return store.dishes.filter((d) => {
        const matchSearch = search.value ? d.name.includes(search.value) : true;
        const matchCategory = filterCategory.value ? d.category === filterCategory.value : true;
        return matchSearch && matchCategory;
      });
    };

    const getVisibleDishes = () => {
      const matched = getMatchedDishes();
      if (search.value || filterCategory.value || expanded.value) {
        return matched;
      }
      return [];
    };

    return {
      store,
      slot,
      search,
      filterCategory,
      expanded,
      onAutoSortChange,
      handleDishToggle,
      removeDish,
      addCustomDish,
      getMatchedDishes,
      getVisibleDishes,
      close: () => {
        return emit('close');
      },
    };
  },
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center sm:p-4 z-50">
      <div class="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div class="flex justify-between items-center p-4 border-b border-gray-200 bg-white shrink-0">
          <div>
            <h3 class="text-lg sm:text-xl font-bold text-rose-600">快速修改菜槽</h3>
            <span class="text-xs text-gray-500 font-medium">所屬套餐：{{ pkg.name }}</span>
          </div>
          <button @click="close" class="text-gray-400 hover:text-gray-700 text-3xl font-bold p-1 leading-none">&times;</button>
        </div>

        <div class="p-4 sm:p-5 overflow-y-auto space-y-4">
          <!-- 槽名稱設定 -->
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-gray-700 shrink-0">槽位名稱：</span>
            <input
              v-model="slot.name"
              class="font-bold text-sm sm:text-base bg-white border border-gray-300 rounded-xl px-3 py-1.5 outline-none flex-1 focus:border-rose-400 text-gray-800"
            />
          </div>

          <!-- 已選項目 -->
          <div class="bg-gray-50 p-3.5 rounded-2xl border border-rose-200">
            <div class="flex flex-wrap justify-between items-center gap-1.5 mb-2">
              <div class="flex items-center gap-2">
                <span class="text-xs sm:text-sm font-bold text-rose-800">目前可選料理：</span>
                <span class="text-xs bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-300">
                  已選 {{ slot.dishNames.length }} 項
                </span>
              </div>
              <label class="inline-flex items-center gap-1 text-xs text-gray-600 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  v-model="slot.autoSort"
                  @change="onAutoSortChange"
                  class="rounded w-3.5 h-3.5 text-rose-600"
                />
                自動排序菜品
              </label>
            </div>

            <div v-if="slot.dishNames.length === 0" class="text-xs sm:text-sm text-gray-400 py-1">
              尚未選擇任何菜品
            </div>
            <div v-else class="flex flex-wrap gap-1.5">
              <span
                v-for="dishName in slot.dishNames"
                :key="dishName"
                class="inline-flex items-center gap-1.5 text-xs sm:text-sm bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-lg font-medium"
              >
                {{ dishName }}
                <button @click="removeDish(dishName)" class="text-rose-400 hover:text-rose-700 text-base font-bold leading-none">&times;</button>
              </span>
            </div>
          </div>

          <!-- 搜尋與類別篩選 -->
          <div class="flex flex-col sm:flex-row gap-2">
            <div class="flex flex-1 gap-2 min-w-0">
              <input
                v-model="search"
                @keyup.enter="addCustomDish"
                placeholder="搜尋菜名或輸入限定品..."
                class="flex-1 border text-sm sm:text-base px-3 py-2 rounded-xl bg-white outline-none focus:border-rose-400 min-w-0"
              />
              <button
                type="button"
                @click="addCustomDish"
                class="bg-rose-50 border border-rose-300 text-rose-700 active:bg-rose-100 font-bold px-3.5 py-2 rounded-xl text-sm shrink-0 shadow-sm whitespace-nowrap"
              >
                + 加入限定品
              </button>
            </div>
            <select
              v-model="filterCategory"
              class="border text-sm sm:text-base px-2 py-2 rounded-xl bg-white text-gray-700 outline-none shrink-0"
            >
              <option value="">全部類別</option>
              <option v-for="c in store.categories" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>

          <!-- 菜品列表選取 -->
          <div v-if="getVisibleDishes().length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto p-1">
            <label
              v-for="d in getVisibleDishes()"
              :key="d.id"
              class="flex items-center gap-2 text-sm sm:text-base bg-white p-2 rounded-xl border border-gray-200 active:bg-rose-50/30 cursor-pointer"
            >
              <input
                type="checkbox"
                :value="d.name"
                v-model="slot.dishNames"
                @change="handleDishToggle"
                class="rounded w-4 h-4 text-rose-600"
              />
              <span class="truncate">
                {{ d.name }}
                <span class="text-xs text-gray-400">({{ d.category || '未分類' }})</span>
              </span>
            </label>
          </div>

          <!-- 展開摺疊料理清單按鈕 -->
          <div
            v-if="!search && !filterCategory && getMatchedDishes().length > 0"
            class="mt-2 text-center"
          >
            <button
              type="button"
              @click="expanded = !expanded"
              class="text-xs sm:text-sm text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 py-1.5 px-4 rounded-full border border-indigo-200"
            >
              {{ expanded ? '▲ 收起料理清單' : ('▼ 展開料理清單 (共 ' + getMatchedDishes().length + ' 道)') }}
            </button>
          </div>
        </div>

        <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end shrink-0">
          <button @click="close" class="w-full sm:w-32 bg-rose-600 active:bg-rose-700 text-white py-2.5 rounded-xl font-bold text-base shadow-sm">
            完成
          </button>
        </div>
      </div>
    </div>
  `,
};
