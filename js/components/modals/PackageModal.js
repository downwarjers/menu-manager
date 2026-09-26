import { ref } from 'vue';
import { store } from '../../state/menuStore.js';
import { calculateMarkupPrice } from '../../utils/pricing.js';

export default {
  name: 'PackageModal',
  props: {
    pkgData: {
      type: Object,
      default: null,
    },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const initPrices = (existingPrices = {}) => {
      const p = { ...existingPrices };
      store.channels.forEach((ch) => {
        if (p[ch.key] === undefined) {
          p[ch.key] = null;
        }
      });
      return p;
    };

    const pkgForm = ref(
      props.pkgData
        ? {
            id: props.pkgData.id,
            name: props.pkgData.name,
            active: props.pkgData.active !== false,
            prices: initPrices(props.pkgData.prices),
            slots: Array.isArray(props.pkgData.slots)
              ? props.pkgData.slots.map((s) => {
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
          }
        : {
            id: null,
            name: '',
            active: true,
            prices: initPrices(),
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
          },
    );

    const applyAutoMarkup = () => {
      const base = pkgForm.value.prices['dine_in'] || 0;
      store.channels.forEach((ch) => {
        if (ch.key !== 'dine_in') {
          pkgForm.value.prices[ch.key] = calculateMarkupPrice(base, ch.markupPercent, ch.roundMode);
        }
      });
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

    const handleDishCheckboxToggle = (slot) => {
      if (slot && slot.autoSort) {
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

    const getMatchedDishes = (slot) => {
      if (!slot) {
        return [];
      }
      return store.dishes.filter((d) => {
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

    const savePackage = () => {
      const name = pkgForm.value.name.trim();
      if (!name) {
        return alert('套餐名稱不得為空！');
      }

      const existingPkg = store.packages.find((p) => {
        return p.name === name && p.id !== pkgForm.value.id;
      });
      if (existingPkg) {
        const loadExisting = confirm(
          `已存在同名套餐「${name}」！\n\n按「確定」：立即載入現有內容進行修改。\n按「取消」：更換名稱。`,
        );
        if (loadExisting) {
          pkgForm.value = {
            id: existingPkg.id,
            name: existingPkg.name,
            active: existingPkg.active !== false,
            prices: initPrices(existingPkg.prices),
            slots: Array.isArray(existingPkg.slots)
              ? existingPkg.slots.map((s) => {
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
        const idx = store.packages.findIndex((p) => {
          return p.id === pkgForm.value.id;
        });
        if (idx !== -1) {
          store.packages[idx] = payload;
        }
      } else {
        store.packages.unshift(payload);
      }
      emit('close');
    };

    return {
      store,
      pkgForm,
      applyAutoMarkup,
      addPkgSlot,
      movePkgSlot,
      sortPkgSlotsByName,
      onSlotAutoSortChange,
      handleDishCheckboxToggle,
      removePkgSlot,
      removeDishFromSlot,
      addCustomDishToSlot,
      getMatchedDishes,
      getVisibleDishes,
      savePackage,
      close: () => {
        return emit('close');
      },
    };
  },
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center sm:p-4 z-50">
      <div class="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div class="flex justify-between items-center p-4 border-b border-gray-200 bg-white shrink-0">
          <h3 class="text-lg sm:text-xl font-bold text-rose-600">
            {{ pkgForm.id ? '修改套餐' : '組合多選套餐' }}
          </h3>
          <button @click="close" class="text-gray-400 hover:text-gray-700 text-3xl font-bold p-1 leading-none">✕</button>
        </div>
        <div class="p-5 overflow-y-auto space-y-3.5">
          <div class="flex items-center gap-3 mb-3 bg-gray-50 p-2.5 rounded-2xl border border-gray-200">
            <span class="text-sm font-bold text-gray-700">套餐狀態：</span>
            <button
              @click="pkgForm.active = !pkgForm.active"
              :class="pkgForm.active !== false ? 'bg-emerald-600 text-white' : 'bg-gray-400 text-white'"
              class="text-sm px-3.5 py-1.5 rounded-xl font-bold"
            >
              {{ pkgForm.active !== false ? '✓ 供應中' : '✕ 已暫停售賣' }}
            </button>
          </div>

          <label class="block text-sm font-bold text-gray-700 mb-1.5">套餐名稱：</label>
          <input
            v-model="pkgForm.name"
            type="text"
            placeholder="例如：超值雙人三菜一湯"
            class="w-full border-2 border-rose-300 rounded-xl p-3 text-base sm:text-lg font-bold mb-3.5 outline-none"
          />

          <div class="grid grid-cols-2 gap-2.5 mb-4">
            <div v-for="ch in store.channels" :key="ch.key">
              <label class="text-xs sm:text-sm text-gray-600 block mb-1 font-medium">{{ ch.name }}</label>
              <input
                v-model.number="pkgForm.prices[ch.key]"
                @input="ch.key === 'dine_in' ? applyAutoMarkup() : null"
                type="number"
                inputmode="numeric"
                pattern="[0-9]*"
                class="w-full border-2 border-gray-200 rounded-xl p-2.5 text-center text-lg font-bold bg-white outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div class="space-y-4 mb-6 border-t border-gray-200 pt-3">
            <div class="flex justify-between items-center">
              <span class="text-sm font-bold text-gray-700">配菜選項插槽：</span>
              <button
                type="button"
                @click="sortPkgSlotsByName"
                class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-2.5 py-1 rounded-lg border border-gray-300 shadow-sm"
              >
                依槽名稱排序
              </button>
            </div>

            <div
              v-for="(slot, sIdx) in pkgForm.slots"
              :key="sIdx"
              class="border border-gray-200 bg-gray-50 p-3.5 rounded-2xl"
            >
              <div class="flex justify-between items-center mb-2 gap-2">
                <div class="flex items-center gap-1.5 flex-1 min-w-0">
                  <input
                    v-model="slot.name"
                    class="font-bold text-sm sm:text-base bg-white border border-gray-300 rounded-lg px-2.5 py-1 outline-none w-32 sm:w-36 text-gray-800"
                  />
                  <button
                    type="button"
                    @click="movePkgSlot(sIdx, -1)"
                    :disabled="sIdx === 0"
                    :class="sIdx === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-200'"
                    class="px-2 py-1 rounded-md text-sm font-bold border border-gray-200 bg-white"
                    title="上移此槽"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    @click="movePkgSlot(sIdx, 1)"
                    :disabled="sIdx === pkgForm.slots.length - 1"
                    :class="sIdx === pkgForm.slots.length - 1 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-200'"
                    class="px-2 py-1 rounded-md text-sm font-bold border border-gray-200 bg-white"
                    title="下移此槽"
                  >
                    ↓
                  </button>
                </div>
                <button @click="removePkgSlot(sIdx)" class="text-red-500 text-sm font-bold hover:text-red-700 shrink-0">
                  移除此槽
                </button>
              </div>

              <div class="mb-3 bg-white p-3 rounded-xl border border-rose-200">
                <div class="flex flex-wrap justify-between items-center gap-1.5 mb-1.5">
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
                      @change="onSlotAutoSortChange(slot)"
                      class="rounded w-3.5 h-3.5 text-rose-600"
                    />
                    自動排序菜品
                  </label>
                </div>
                <div v-if="slot.dishNames.length === 0" class="text-xs sm:text-sm text-gray-400 py-1">
                  尚未勾選或輸入任何料理
                </div>
                <div v-else class="flex flex-wrap gap-1.5">
                  <span
                    v-for="dishName in slot.dishNames"
                    :key="dishName"
                    class="inline-flex items-center gap-1.5 text-xs sm:text-sm bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-lg font-medium"
                  >
                    {{ dishName }}
                    <button @click="removeDishFromSlot(slot, dishName)" class="text-rose-400 hover:text-rose-700 text-base font-bold leading-none">✕</button>
                  </span>
                </div>
              </div>

              <div class="flex gap-2 mb-2.5">
                <input
                  v-model="slot.customInput"
                  @keyup.enter="addCustomDishToSlot(slot)"
                  type="text"
                  placeholder="輸入套餐限定單品（免加菜品庫）..."
                  class="flex-1 border-2 border-rose-200 text-sm sm:text-base px-3 py-2 rounded-xl bg-white outline-none focus:border-rose-500 min-w-0"
                />
                <button
                  type="button"
                  @click="addCustomDishToSlot(slot)"
                  class="bg-rose-50 border border-rose-300 text-rose-700 active:bg-rose-100 font-bold px-3.5 py-2 rounded-xl text-sm shrink-0 shadow-sm"
                >
                  + 加入限定品
                </button>
              </div>

              <div class="flex flex-col sm:flex-row gap-2 mb-2">
                <input
                  v-model="slot.search"
                  placeholder="搜尋菜名..."
                  class="flex-1 border text-sm sm:text-base px-3 py-2 rounded-xl bg-white outline-none min-w-0"
                />
                <select
                  v-model="slot.filterCategory"
                  class="border text-sm sm:text-base px-2 py-2 rounded-xl bg-white text-gray-700 outline-none"
                >
                  <option value="">全部類別</option>
                  <option v-for="c in store.categories" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <label
                  v-for="d in getVisibleDishes(slot)"
                  :key="d.id"
                  class="flex items-center gap-2 text-sm sm:text-base bg-white p-2 rounded-xl border border-gray-200 active:bg-rose-50/30 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    :value="d.name"
                    v-model="slot.dishNames"
                    @change="handleDishCheckboxToggle(slot)"
                    class="rounded w-4 h-4 text-rose-600"
                  />
                  <span class="truncate">
                    {{ d.name }}
                    <span class="text-xs text-gray-400">({{ d.category || '未分' }})</span>
                  </span>
                </label>
              </div>

              <div
                v-if="!slot.search && !slot.filterCategory && getMatchedDishes(slot).length > 6"
                class="mt-2.5 text-center"
              >
                <button
                  @click="slot.expanded = !slot.expanded"
                  class="text-xs sm:text-sm text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 py-1.5 px-4 rounded-full border border-indigo-200"
                >
                  {{ slot.expanded ? '▲ 收合料理清單' : ('▼ 展開其餘 ' + (getMatchedDishes(slot).length - 6) + ' 道料理') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          @click="addPkgSlot"
          class="absolute right-5 bottom-20 z-30 bg-rose-600 active:bg-rose-700 text-white px-4 py-2.5 rounded-full font-bold text-sm sm:text-base shadow-xl flex items-center gap-1.5 border-2 border-white"
        >
          <span class="text-lg leading-none">+</span> 增加菜項
        </button>

        <div class="p-4 border-t border-gray-200 bg-gray-50 flex gap-3 shrink-0">
          <button @click="close" class="flex-1 bg-gray-200 active:bg-gray-300 py-3 rounded-xl font-bold text-base text-gray-800">取消</button>
          <button @click="savePackage" class="flex-1 bg-rose-600 active:bg-rose-700 text-white py-3 rounded-xl font-bold text-base">確認儲存</button>
        </div>
      </div>
    </div>
  `,
};
