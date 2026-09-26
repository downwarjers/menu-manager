import { ref, computed } from 'vue';
import { store, deleteStoreItem } from '../state/menuStore.js';

export default {
  name: 'DishList',
  emits: ['edit'],
  setup(props, { emit }) {
    const dishSearch = ref('');
    const dishFilterCategory = ref('');
    const dishFilterActive = ref('');
    const dishSort = ref('default');

    const filteredDishes = computed(() => {
      let list = store.dishes.filter((d) => {
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
          return (a.prices?.dine_in || 0) - (b.prices?.dine_in || 0);
        });
      }
      if (dishSort.value === 'priceDesc') {
        list.sort((a, b) => {
          return (b.prices?.dine_in || 0) - (a.prices?.dine_in || 0);
        });
      }
      return list;
    });

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

    return {
      store,
      dishSearch,
      dishFilterCategory,
      dishFilterActive,
      dishSort,
      filteredDishes,
      formatDishComponents,
      editDish: (dish) => {
        return emit('edit', dish);
      },
      deleteDish: (id) => {
        return deleteStoreItem('dishes', id);
      },
    };
  },
  template: `
    <div class="space-y-3.5">
      <div class="bg-white p-4 rounded-2xl shadow-sm space-y-3 border border-gray-200">
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            v-model="dishSearch"
            type="text"
            placeholder="搜尋料理名稱..."
            class="flex-1 border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-base outline-none focus:border-amber-500 min-w-0"
          />
          <select
            v-model="dishSort"
            class="border-2 border-gray-200 rounded-xl px-3 py-2.5 text-base bg-white w-full sm:w-auto font-medium"
          >
            <option value="default">最新建立</option>
            <option value="name">依名稱排序</option>
            <option value="priceAsc">內用價 (低→高)</option>
            <option value="priceDesc">內用價 (高→低)</option>
          </select>
        </div>
        <div class="flex flex-col gap-2.5 pt-2 border-t border-gray-100">
          <div class="grid grid-cols-3 gap-1.5 bg-gray-100 p-1 rounded-xl">
            <button
              @click="dishFilterActive = ''"
              :class="dishFilterActive === '' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700'"
              class="py-2 text-sm sm:text-base rounded-lg font-bold transition-all"
            >
              全部狀態
            </button>
            <button
              @click="dishFilterActive = 'active'"
              :class="dishFilterActive === 'active' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-700'"
              class="py-2 text-sm sm:text-base rounded-lg font-bold transition-all"
            >
              上架中
            </button>
            <button
              @click="dishFilterActive = 'inactive'"
              :class="dishFilterActive === 'inactive' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-700'"
              class="py-2 text-sm sm:text-base rounded-lg font-bold transition-all"
            >
              已停售
            </button>
          </div>
          <div class="relative">
            <select
              v-model="dishFilterCategory"
              class="w-full border-2 border-amber-200 bg-amber-50/50 rounded-xl px-3.5 py-2.5 text-base font-bold text-amber-900 outline-none"
            >
              <option value="">全部料理類別 (共 {{ store.dishes.length }} 道料理)</option>
              <option v-for="c in store.categories" :key="c" :value="c">類別：{{ c }}</option>
            </select>
          </div>
        </div>
      </div>

      <div
        v-if="filteredDishes.length === 0"
        class="text-center text-gray-400 py-12 text-base font-medium"
      >
        查無料理資料
      </div>

      <div
        v-for="dish in filteredDishes"
        :key="dish.id"
        :class="dish.active !== false ? 'bg-white' : 'bg-gray-100 border-dashed opacity-75'"
        class="p-4 rounded-2xl shadow-sm border border-gray-200"
      >
        <div class="flex justify-between items-start gap-2 mb-3">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                :class="dish.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'"
                class="text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-md"
              >
                {{ dish.active !== false ? '上架中' : '已停售' }}
              </span>
              <span class="text-xs sm:text-sm bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-md">
                {{ dish.category || '未分類' }}
              </span>
              <h3
                :class="dish.active === false ? 'line-through text-gray-500' : 'text-gray-900'"
                class="text-lg sm:text-xl font-bold truncate"
              >
                {{ dish.name }}
              </h3>
            </div>
            <span class="text-xs sm:text-sm text-gray-500 block">
              組合: {{ dish.mode === 'manual' ? '手動輸入' : formatDishComponents(dish) }}
            </span>
          </div>
          <div class="flex gap-2 shrink-0">
            <button
              @click="editDish(dish)"
              class="text-blue-600 text-sm sm:text-base px-3 py-1.5 bg-blue-50 rounded-xl font-bold hover:bg-blue-100 border border-blue-200"
            >
              修改
            </button>
            <button
              @click="deleteDish(dish.id)"
              class="text-red-500 text-sm sm:text-base px-2.5 py-1.5 bg-red-50 rounded-xl hover:bg-red-100 border border-red-200"
            >
              刪除
            </button>
          </div>
        </div>
        <div
          class="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-2.5 rounded-xl text-center border border-gray-100"
        >
          <div v-for="ch in store.channels" :key="ch.key" class="p-1">
            <span class="text-gray-500 block text-xs sm:text-sm font-medium">{{ ch.name }}</span>
            <span class="font-bold text-base sm:text-lg text-gray-900">
              \${{ (dish.prices && dish.prices[ch.key]) || 0 }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
};
