import { ref } from 'vue';
import { store } from '../../state/menuStore.js';

export default {
  name: 'SimpleBaseModal',
  props: {
    type: {
      type: String,
      required: true,
    },
    targetIndex: {
      type: Number,
      default: null,
    },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const arr = props.type === 'method' ? store.methods : store.categories;
    const tempBaseInput = ref(props.targetIndex !== null ? arr[props.targetIndex] || '' : '');

    const saveSimpleBaseItem = () => {
      const val = tempBaseInput.value.trim();
      if (!val) {
        return;
      }
      const isDuplicate = arr.some((item, i) => {
        return item === val && i !== props.targetIndex;
      });
      if (isDuplicate) {
        return alert('該名稱已存在！');
      }

      if (props.targetIndex !== null) {
        arr[props.targetIndex] = val;
      } else {
        arr.push(val);
      }
      emit('close');
    };

    return {
      tempBaseInput,
      saveSimpleBaseItem,
      close: () => {
        return emit('close');
      },
    };
  },
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl">
        <div class="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
          <h3 class="text-lg font-bold text-gray-900">
            {{ targetIndex !== null ? '修改' : '新增' }}{{ type === 'method' ? '料理作法' : '料理類別' }}
          </h3>
          <button @click="close" class="text-gray-400 hover:text-gray-700 text-3xl font-bold p-1 leading-none">✕</button>
        </div>
        <input
          v-model="tempBaseInput"
          @keyup.enter="saveSimpleBaseItem"
          type="text"
          placeholder="請輸入名稱"
          class="w-full border-2 border-gray-300 rounded-xl p-3 text-lg font-bold mb-4 outline-none focus:border-blue-500"
        />
        <div class="flex gap-3">
          <button @click="close" class="flex-1 bg-gray-200 active:bg-gray-300 py-3 rounded-xl font-bold text-base text-gray-800">取消</button>
          <button @click="saveSimpleBaseItem" class="flex-1 bg-blue-600 active:bg-blue-700 text-white py-3 rounded-xl font-bold text-base">儲存</button>
        </div>
      </div>
    </div>
  `,
};
