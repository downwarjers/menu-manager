import { store } from '../state/menuStore.js';

export default {
  name: 'BaseDataList',
  emits: ['edit-ingredient', 'edit-simple'],
  setup(props, { emit }) {
    const deleteBaseItem = (type, idx) => {
      if (type === 'ingredient') {
        const target = store.ingredients[idx];
        if (!target) {
          return;
        }
        const names = [target.name, ...(Array.isArray(target.aliases) ? target.aliases : [])];
        const used = store.dishes.filter((d) => {
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
          store.ingredients.splice(idx, 1);
        }
      } else if (type === 'method') {
        const name = store.methods[idx];
        const used = store.dishes.filter((d) => {
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
          store.methods.splice(idx, 1);
        }
      } else if (type === 'category') {
        const name = store.categories[idx];
        const used = store.dishes.filter((d) => {
          return d.category === name;
        });
        if (used.length > 0) {
          return alert(`無法刪除！已有 ${used.length} 道料理屬於「${name}」類別。`);
        }
        if (confirm(`確定移除類別「${name}」？`)) {
          store.categories.splice(idx, 1);
        }
      }
    };

    return {
      store,
      deleteBaseItem,
      editIngredient: (idx) => {
        return emit('edit-ingredient', idx);
      },
      editSimple: (type, idx) => {
        return emit('edit-simple', { type, idx });
      },
    };
  },
  template: `
    <div class="space-y-4">
      <!-- 料理類別 -->
      <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-bold text-base sm:text-lg text-gray-800">料理類別 (點選修改)</h3>
          <button
            @click="editSimple('category', null)"
            class="text-sm bg-amber-50 text-amber-700 border border-amber-300 px-3.5 py-2 rounded-xl font-bold hover:bg-amber-100"
          >
            + 新增類別
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="(c, idx) in store.categories"
            :key="idx"
            class="inline-flex items-center bg-amber-50 border border-amber-300 rounded-xl overflow-hidden text-sm sm:text-base"
          >
            <button
              @click="editSimple('category', idx)"
              class="px-3.5 py-2 text-amber-900 font-bold hover:bg-amber-100"
            >
              {{ c }}
            </button>
            <button
              @click="deleteBaseItem('category', idx)"
              class="px-3 py-2 text-red-500 hover:text-red-700 border-l border-amber-300"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <!-- 調理作法庫 -->
      <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-bold text-base sm:text-lg text-gray-800">料理作法 (點選修改)</h3>
          <button
            @click="editSimple('method', null)"
            class="text-sm bg-indigo-50 text-indigo-700 border border-indigo-300 px-3.5 py-2 rounded-xl font-bold hover:bg-indigo-100"
          >
            + 新增作法
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="(m, idx) in store.methods"
            :key="idx"
            class="inline-flex items-center bg-indigo-50 border border-indigo-300 rounded-xl overflow-hidden text-sm sm:text-base"
          >
            <button
              @click="editSimple('method', idx)"
              class="px-3.5 py-2 text-indigo-900 font-bold hover:bg-indigo-100"
            >
              {{ m }}
            </button>
            <button
              @click="deleteBaseItem('method', idx)"
              class="px-3 py-2 text-red-500 hover:text-red-700 border-l border-indigo-300"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <!-- 食材庫 -->
      <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-bold text-base sm:text-lg text-gray-800">食材庫 (點選編輯形態)</h3>
          <button
            @click="editIngredient(null)"
            class="text-sm bg-blue-50 text-blue-700 border border-blue-300 px-3.5 py-2 rounded-xl font-bold hover:bg-blue-100"
          >
            + 新增食材
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="(ing, idx) in store.ingredients"
            :key="idx"
            class="inline-flex items-center bg-blue-50 border border-blue-300 rounded-xl overflow-hidden text-sm sm:text-base"
          >
            <button
              @click="editIngredient(idx)"
              class="px-3.5 py-2 text-blue-900 font-bold hover:bg-blue-100 flex items-center gap-1.5"
            >
              <span>{{ ing.name }}</span>
              <span
                v-if="ing.aliases && ing.aliases.length > 0"
                class="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-md"
              >
                {{ ing.aliases.length }} 種形態
              </span>
            </button>
            <button
              @click="deleteBaseItem('ingredient', idx)"
              class="px-3 py-2 text-red-500 hover:text-red-700 border-l border-blue-300"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
};
