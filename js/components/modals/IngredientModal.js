import { ref } from 'vue';
import { store } from '../../state/menuStore.js';

export default {
  name: 'IngredientModal',
  props: {
    targetIndex: {
      type: Number,
      default: null,
    },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const isEdit = props.targetIndex !== null && store.ingredients[props.targetIndex];
    const initialData = isEdit ? store.ingredients[props.targetIndex] : null;

    const ingredientForm = ref({
      index: props.targetIndex,
      name: initialData ? initialData.name : '',
      aliases: initialData && Array.isArray(initialData.aliases) ? [...initialData.aliases] : [],
    });
    const newAliasInput = ref('');

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

      const isDuplicate = store.ingredients.some((ing, i) => {
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
        store.ingredients[ingredientForm.value.index] = payload;
      } else {
        store.ingredients.push(payload);
      }
      emit('close');
    };

    return {
      ingredientForm,
      newAliasInput,
      addAliasToForm,
      removeAliasFromForm,
      saveIngredientForm,
      close: () => {
        return emit('close');
      },
    };
  },
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center sm:p-4 z-50">
      <div class="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 shadow-2xl">
        <div class="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
          <h3 class="text-lg sm:text-xl font-bold text-gray-900">
            {{ ingredientForm.index !== null ? '編輯食材與形態' : '新增食材' }}
          </h3>
          <button @click="close" class="text-gray-400 hover:text-gray-700 text-3xl font-bold p-1 leading-none">✕</button>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-bold text-gray-700 mb-1">食材本名：</label>
          <input
            v-model="ingredientForm.name"
            type="text"
            placeholder="例如：蝦、牛肉、雞肉"
            class="w-full border-2 border-gray-300 rounded-xl p-3 text-lg font-bold outline-none focus:border-blue-500"
          />
        </div>

        <div class="mb-5 bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
          <label class="block text-sm font-bold text-gray-700 mb-2">常用料理名稱 / 形態別名：</label>
          <div class="flex flex-wrap gap-2 mb-3 min-h-[38px] items-center">
            <span v-if="ingredientForm.aliases.length === 0" class="text-sm text-gray-400">
              尚未添加任何形態（例：蝦仁、蝦球）
            </span>
            <span
              v-for="(alias, aIdx) in ingredientForm.aliases"
              :key="aIdx"
              class="inline-flex items-center gap-1.5 bg-blue-100 text-blue-900 border border-blue-300 px-3 py-1.5 rounded-xl font-bold text-sm"
            >
              {{ alias }}
              <button @click="removeAliasFromForm(aIdx)" class="text-red-500 hover:text-red-700 text-lg leading-none">✕</button>
            </span>
          </div>

          <div class="flex gap-2">
            <input
              v-model="newAliasInput"
              @keyup.enter="addAliasToForm"
              type="text"
              placeholder="輸入形態名稱（例：蝦仁）"
              class="flex-1 border-2 border-gray-300 rounded-xl px-3 py-2 text-base outline-none focus:border-blue-500 bg-white"
            />
            <button
              @click="addAliasToForm"
              class="bg-blue-600 active:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-base shrink-0 shadow-sm"
            >
              + 添加
            </button>
          </div>
        </div>

        <div class="flex gap-3">
          <button @click="close" class="flex-1 bg-gray-200 active:bg-gray-300 py-3 rounded-xl font-bold text-base text-gray-800">取消</button>
          <button @click="saveIngredientForm" class="flex-1 bg-blue-600 active:bg-blue-700 text-white py-3 rounded-xl font-bold text-base shadow-sm">確認儲存</button>
        </div>
      </div>
    </div>
  `,
};
