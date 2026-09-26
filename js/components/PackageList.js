import { ref, computed } from 'vue';
import { store, deleteStoreItem } from '../state/menuStore.js';

export default {
  name: 'PackageList',
  emits: ['edit'],
  setup(props, { emit }) {
    const pkgSearch = ref('');
    const pkgSort = ref('default');

    const filteredPackages = computed(() => {
      let list = store.packages.filter((p) => {
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

    return {
      store,
      pkgSearch,
      pkgSort,
      filteredPackages,
      editPackage: (pkg) => {
        return emit('edit', pkg);
      },
      deletePackage: (id) => {
        return deleteStoreItem('packages', id);
      },
    };
  },
  template: `
    <div class="space-y-3.5">
      <div class="bg-white p-4 rounded-2xl shadow-sm space-y-3 border border-gray-200">
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            v-model="pkgSearch"
            type="text"
            placeholder="搜尋套餐名稱..."
            class="flex-1 border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-base outline-none focus:border-rose-500 min-w-0"
          />
          <select
            v-model="pkgSort"
            class="border-2 border-gray-200 rounded-xl px-3 py-2.5 text-base bg-white w-full sm:w-auto font-medium"
          >
            <option value="default">最新建立</option>
            <option value="name">依名稱排序</option>
            <option value="priceAsc">內用價 (低→高)</option>
            <option value="priceDesc">內用價 (高→低)</option>
          </select>
        </div>
      </div>

      <div
        v-if="filteredPackages.length === 0"
        class="text-center text-gray-400 py-12 text-base font-medium"
      >
        查無套餐資料
      </div>

      <div
        v-for="pkg in filteredPackages"
        :key="pkg.id"
        :class="pkg.active !== false ? 'bg-white' : 'bg-gray-100 border-dashed opacity-75'"
        class="p-4 rounded-2xl shadow-sm border border-gray-200"
      >
        <div class="flex justify-between items-start gap-2 mb-3">
          <div class="flex flex-wrap items-center gap-2">
            <span
              :class="pkg.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'"
              class="text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-md"
            >
              {{ pkg.active !== false ? '供應中' : '已停售' }}
            </span>
            <h3
              :class="pkg.active === false ? 'line-through text-gray-500' : 'text-gray-900'"
              class="text-lg sm:text-xl font-bold"
            >
              {{ pkg.name }}
            </h3>
          </div>
          <div class="flex gap-2 shrink-0">
            <button
              @click="editPackage(pkg)"
              class="text-blue-600 text-sm sm:text-base px-3 py-1.5 bg-blue-50 rounded-xl font-bold hover:bg-blue-100 border border-blue-200"
            >
              修改
            </button>
            <button
              @click="deletePackage(pkg.id)"
              class="text-red-500 text-sm sm:text-base px-2.5 py-1.5 bg-red-50 rounded-xl hover:bg-red-100 border border-red-200"
            >
              刪除
            </button>
          </div>
        </div>

        <div
          class="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-2.5 rounded-xl text-center border border-gray-100 mb-3"
        >
          <div v-for="ch in store.channels" :key="ch.key" class="p-1">
            <span class="text-gray-500 block text-xs sm:text-sm font-medium">{{ ch.name }}</span>
            <span class="font-bold text-base sm:text-lg text-gray-900">
              \${{ pkg.prices[ch.key] || 0 }}
            </span>
          </div>
        </div>

        <div class="text-sm sm:text-base text-gray-700 space-y-2">
          <div
            v-for="(slot, sIdx) in pkg.slots"
            :key="sIdx"
            class="bg-gray-100 px-3 py-2 rounded-xl leading-relaxed"
          >
            <span class="font-bold text-gray-900">{{ slot.name }}：</span>
            <span>{{ slot.dishNames.join(' / ') || '未設定品項' }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
};
