import { ref } from 'vue';
import { store } from '../../state/menuStore.js';
import { calculateMarkupPrice } from '../../utils/pricing.js';

export default {
  name: 'DishModal',
  props: {
    dishData: {
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

    const dishForm = ref(
      props.dishData
        ? {
            id: props.dishData.id,
            active: props.dishData.active !== false,
            mode: props.dishData.mode || 'combine',
            category: props.dishData.category || store.categories[0] || '熱炒',
            name: props.dishData.name,
            selectedMethod: props.dishData.method || '',
            selectedIngredients: Array.isArray(props.dishData.ingredients)
              ? [...props.dishData.ingredients]
              : [],
            prices: initPrices(props.dishData.prices),
          }
        : {
            id: null,
            mode: 'combine',
            category: store.categories[0] || '熱炒',
            active: true,
            name: '',
            selectedMethod: '',
            selectedIngredients: [],
            prices: initPrices(),
          },
    );

    const activeIngredientAliasGroup = ref(null);

    const updateCombineDishName = () => {
      const m = dishForm.value.selectedMethod || '';
      const ings = dishForm.value.selectedIngredients.join('');
      dishForm.value.name = `${m}${ings}`;
    };

    const setDishMode = (mode) => {
      dishForm.value.mode = mode;
      if (mode === 'combine') {
        updateCombineDishName();
      }
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

    const applyAutoMarkup = () => {
      const base = dishForm.value.prices['dine_in'] || 0;
      store.channels.forEach((ch) => {
        if (ch.key !== 'dine_in') {
          dishForm.value.prices[ch.key] = calculateMarkupPrice(
            base,
            ch.markupPercent,
            ch.roundMode,
          );
        }
      });
    };

    const saveDish = () => {
      const name = dishForm.value.name.trim();
      if (!name) {
        return alert('料理名稱不得為空！');
      }
      if (!dishForm.value.category) {
        return alert('請選擇料理類別！');
      }

      const existingDish = store.dishes.find((d) => {
        return d.name === name && d.id !== dishForm.value.id;
      });
      if (existingDish) {
        const loadExisting = confirm(
          `已存在同名料理「${name}」！\n\n按「確定」：立即載入現有資料進行修改。\n按「取消」：更換名稱。`,
        );
        if (loadExisting) {
          dishForm.value = {
            id: existingDish.id,
            active: existingDish.active !== false,
            mode: existingDish.mode || 'combine',
            category: existingDish.category || store.categories[0] || '熱炒',
            name: existingDish.name,
            selectedMethod: existingDish.method || '',
            selectedIngredients: Array.isArray(existingDish.ingredients)
              ? [...existingDish.ingredients]
              : [],
            prices: initPrices(existingDish.prices),
          };
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
        const idx = store.dishes.findIndex((d) => {
          return d.id === dishForm.value.id;
        });
        const oldName = idx !== -1 ? store.dishes[idx].name : null;

        if (oldName && oldName !== name) {
          store.packages.forEach((pkg) => {
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
          store.dishes[idx] = payload;
        }
      } else {
        store.dishes.unshift(payload);
      }
      emit('close');
    };

    return {
      store,
      dishForm,
      activeIngredientAliasGroup,
      setDishMode,
      selectDishMethod,
      handleIngredientClick,
      pushIngredientToken,
      removeDishIngredientToken,
      clearDishTokens,
      applyAutoMarkup,
      saveDish,
      close: () => {
        return emit('close');
      },
    };
  },
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center sm:p-4 z-50">
      <div class="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div class="flex justify-between items-center p-4 border-b border-gray-200 bg-white shrink-0">
          <h3 class="text-lg sm:text-xl font-bold text-amber-600">
            {{ dishForm.id ? '修改料理' : '新增料理品項' }}
          </h3>
          <button @click="close" class="text-gray-400 hover:text-gray-700 text-3xl font-bold p-1 leading-none">✕</button>
        </div>
        <div class="p-5 overflow-y-auto space-y-3.5">
          <div class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 mb-3 bg-gray-50 p-2.5 rounded-2xl border border-gray-200">
            <div class="flex items-center justify-between sm:justify-start gap-2">
              <span class="text-sm font-bold text-gray-700">商品狀態：</span>
              <button
                @click="dishForm.active = !dishForm.active"
                :class="dishForm.active !== false ? 'bg-emerald-600 text-white' : 'bg-gray-400 text-white'"
                class="text-sm px-3 py-1.5 rounded-xl font-bold"
              >
                {{ dishForm.active !== false ? '✓ 上架供應中' : '✕ 已暫停售賣' }}
              </button>
            </div>
            <div class="flex bg-gray-200 p-1 rounded-xl text-sm font-bold">
              <button
                @click="setDishMode('combine')"
                :class="dishForm.mode === 'combine' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-700'"
                class="flex-1 py-1.5 px-3 rounded-lg transition-all"
              >
                點選組合
              </button>
              <button
                @click="setDishMode('manual')"
                :class="dishForm.mode === 'manual' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-700'"
                class="flex-1 py-1.5 px-3 rounded-lg transition-all"
              >
                手動輸入
              </button>
            </div>
          </div>

          <div class="mb-3">
            <label class="block text-sm font-bold text-gray-700 mb-1.5">料理類別：</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="c in store.categories"
                :key="c"
                @click="dishForm.category = c"
                :class="dishForm.category === c ? 'bg-amber-600 text-white font-bold' : 'bg-gray-100 text-gray-800'"
                class="px-3.5 py-2 rounded-xl text-sm sm:text-base border border-transparent"
              >
                {{ c }}
              </button>
            </div>
          </div>

          <div class="mb-3">
            <label class="block text-sm font-bold text-gray-700 mb-1.5">
              料理名稱 {{ dishForm.mode === 'combine' ? '(點選自動拼裝，可再手動微調)：' : '(手動輸入)：' }}
            </label>
            <input
              v-model="dishForm.name"
              type="text"
              placeholder="請點選組合或自行輸入"
              class="w-full border-2 border-amber-300 rounded-xl p-3 text-base sm:text-lg font-bold outline-none bg-white"
            />
          </div>

          <div v-if="dishForm.mode === 'combine'" class="space-y-3 mb-3.5 bg-amber-50/50 p-3 rounded-2xl border border-amber-200">
            <div class="bg-white p-2.5 rounded-xl border border-amber-200">
              <div class="flex justify-between items-center mb-1.5">
                <span class="text-xs font-bold text-gray-600">已組合元素 (依序排列)：</span>
                <button
                  v-if="dishForm.selectedMethod || dishForm.selectedIngredients.length > 0"
                  @click="clearDishTokens"
                  class="text-xs text-red-500 font-bold hover:underline"
                >
                  全部清除
                </button>
              </div>
              <div class="flex flex-wrap items-center gap-1.5 min-h-[32px]">
                <span v-if="!dishForm.selectedMethod && dishForm.selectedIngredients.length === 0" class="text-xs text-gray-400 py-1">
                  尚未選擇任何作法或食材
                </span>
                <span
                  v-if="dishForm.selectedMethod"
                  class="inline-flex items-center gap-1 bg-indigo-100 text-indigo-900 border border-indigo-300 px-2.5 py-1 rounded-lg text-xs font-bold"
                >
                  [作法] {{ dishForm.selectedMethod }}
                  <button @click="selectDishMethod('')" class="text-indigo-500 hover:text-indigo-800 text-sm leading-none">✕</button>
                </span>
                <span
                  v-for="(ing, idx) in dishForm.selectedIngredients"
                  :key="idx"
                  class="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg text-xs font-bold"
                >
                  {{ ing }}
                  <button @click="removeDishIngredientToken(idx)" class="text-amber-600 hover:text-amber-900 text-sm leading-none">✕</button>
                </span>
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-1.5">
                <span class="text-sm font-bold text-gray-800">作法 (選填，單選)：</span>
              </div>
              <div class="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
                <button
                  v-for="m in store.methods"
                  :key="m"
                  @click="selectDishMethod(m)"
                  :class="dishForm.selectedMethod === m ? 'bg-indigo-600 text-white font-bold' : 'bg-white border text-gray-800'"
                  class="px-3 py-1.5 rounded-xl text-sm shadow-sm"
                >
                  {{ m }}
                </button>
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-1.5">
                <span class="text-sm font-bold text-gray-800">食材選擇 (可連續追加)：</span>
              </div>
              <div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                <button
                  v-for="ing in store.ingredients"
                  :key="ing.name"
                  @click="handleIngredientClick(ing)"
                  class="bg-white border text-gray-800 px-3 py-2 rounded-xl text-sm sm:text-base font-medium shadow-sm hover:border-amber-400"
                >
                  {{ ing.name }}
                </button>
              </div>

              <div
                v-if="activeIngredientAliasGroup"
                class="flex flex-wrap items-center gap-1.5 mt-2 p-2.5 bg-amber-100/60 rounded-xl border border-amber-300"
              >
                <span class="text-xs text-amber-900 font-bold shrink-0">選擇形態：</span>
                <button
                  v-for="alias in [activeIngredientAliasGroup.name, ...activeIngredientAliasGroup.aliases]"
                  :key="alias"
                  @click="pushIngredientToken(alias)"
                  class="bg-white text-amber-900 border border-amber-300 px-3 py-1 rounded-xl text-sm font-bold shadow-sm hover:bg-amber-200"
                >
                  + {{ alias }}
                </button>
                <button @click="activeIngredientAliasGroup = null" class="text-xs text-gray-500 underline ml-auto">收合</button>
              </div>
            </div>
          </div>

          <div class="border-t border-gray-200 pt-3 mb-4">
            <span class="text-sm font-bold text-gray-700 block mb-2">各通路價格 (依通路規則自動換算)：</span>
            <div class="grid grid-cols-2 gap-2.5">
              <div v-for="ch in store.channels" :key="ch.key">
                <label class="text-xs sm:text-sm text-gray-600 block mb-1 font-medium">
                  {{ ch.name }} {{ ch.markupPercent ? '(+' + ch.markupPercent + '%)' : '' }}
                </label>
                <input
                  v-model.number="dishForm.prices[ch.key]"
                  @input="ch.key === 'dine_in' ? applyAutoMarkup() : null"
                  type="number"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  class="w-full border-2 border-gray-200 rounded-xl p-2.5 text-center text-lg font-bold bg-white outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="p-4 border-t border-gray-200 bg-gray-50 flex gap-3 shrink-0">
          <button @click="close" class="flex-1 bg-gray-200 active:bg-gray-300 py-3 rounded-xl font-bold text-base text-gray-800">取消</button>
          <button @click="saveDish" class="flex-1 bg-amber-600 active:bg-amber-700 text-white py-3 rounded-xl font-bold text-base">確認儲存</button>
        </div>
      </div>
    </div>
  `,
};
