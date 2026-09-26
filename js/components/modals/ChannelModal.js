import { ref } from 'vue';
import { store, recalculateAllMarkup } from '../../state/menuStore.js';

export default {
  name: 'ChannelModal',
  emits: ['close'],
  setup(props, { emit }) {
    const tempChannels = ref(JSON.parse(JSON.stringify(store.channels)));

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
      store.channels = JSON.parse(JSON.stringify(tempChannels.value));
      recalculateAllMarkup();
      emit('close');
    };

    return {
      tempChannels,
      addTempChannel,
      removeTempChannel,
      saveChannelConfig,
      close: () => {
        return emit('close');
      },
    };
  },
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center sm:p-4 z-50">
      <div class="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-3 pb-3 border-b border-gray-200">
          <h3 class="text-lg sm:text-xl font-bold text-gray-900">通路加成與尾數設定</h3>
          <button @click="close" class="text-gray-400 hover:text-gray-700 text-3xl font-bold p-1 leading-none">✕</button>
        </div>
        <p class="text-sm text-gray-600 mb-4">設定各通路的加成比例與定價尾數偏好：</p>
        <div class="space-y-3.5 mb-5">
          <div
            v-for="(ch, idx) in tempChannels"
            :key="ch.key"
            class="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-2.5"
          >
            <div class="flex items-center justify-between gap-2">
              <input
                v-model="ch.name"
                class="font-bold border-2 border-gray-300 rounded-xl px-3 py-2 w-40 bg-white text-base outline-none"
                placeholder="通路名稱"
              />
              <button
                v-if="ch.key !== 'dine_in'"
                @click="removeTempChannel(idx)"
                class="text-red-500 font-bold px-2 py-1 text-sm sm:text-base hover:text-red-700"
              >
                移除通路
              </button>
            </div>
            <div class="flex flex-col sm:flex-row gap-2 pt-1">
              <div class="flex items-center gap-1.5">
                <span class="text-gray-700 font-bold text-sm sm:text-base">加成:</span>
                <input
                  v-model.number="ch.markupPercent"
                  :disabled="ch.key === 'dine_in'"
                  type="number"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  class="border-2 border-gray-300 rounded-xl px-2 py-2 w-20 text-center bg-white font-bold text-base outline-none"
                />
                <span class="font-bold text-base">%</span>
              </div>
              <div class="flex items-center gap-1.5 flex-1 min-w-0">
                <span class="text-gray-700 font-bold text-sm sm:text-base shrink-0">尾數:</span>
                <select
                  v-model="ch.roundMode"
                  :disabled="ch.key === 'dine_in'"
                  class="border-2 border-gray-300 rounded-xl px-2 py-2 bg-white flex-1 min-w-0 text-sm sm:text-base outline-none"
                >
                  <option value="round1">四捨五入 ($1)</option>
                  <option value="ceil5">進位 0 或 5 ($5)</option>
                  <option value="end9">尾數進位至 9 ($9)</option>
                  <option value="end8">尾數進位至 8 ($8)</option>
                  <option value="ceil10">進位至十位 ($10)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <button
          @click="addTempChannel"
          class="w-full border-2 border-dashed border-gray-300 text-gray-700 text-base py-3.5 rounded-2xl font-bold mb-4 hover:border-gray-400 active:bg-gray-50"
        >
          + 新增自訂通路
        </button>
        <div class="flex gap-3">
          <button @click="close" class="flex-1 bg-gray-200 active:bg-gray-300 text-gray-800 py-3 rounded-xl font-bold text-base">取消</button>
          <button @click="saveChannelConfig" class="flex-1 bg-blue-600 active:bg-blue-700 text-white py-3 rounded-xl font-bold text-base">儲存設定</button>
        </div>
      </div>
    </div>
  `,
};
