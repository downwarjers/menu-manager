import { computed } from 'vue';
import { store, applyDataset } from '../state/menuStore.js';
import { exportCSVFile, exportJSONFile } from '../utils/exporter.js';

export default {
  name: 'HeaderBar',
  emits: ['open-channels'],
  setup(props, { emit }) {
    const lastBackupText = computed(() => {
      if (!store.lastBackupTime) {
        return '無';
      }
      return new Date(store.lastBackupTime).toLocaleDateString('zh-TW', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    });

    const exportedAtText = computed(() => {
      if (!store.exportedAt) {
        return '無';
      }
      return new Date(store.exportedAt).toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    });

    const triggerCSV = () => {
      return exportCSVFile(store);
    };

    const triggerJSON = () => {
      return exportJSONFile(store);
    };

    const importJSON = (e) => {
      const file = e.target.files[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (confirm('確定要載入此備份資料嗎？現有資料將會被覆蓋。')) {
            applyDataset(data);
            alert('資料匯入成功！');
          }
        } catch (err) {
          alert('JSON 解析失敗，請確認檔案格式是否正確。');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    };

    return {
      store,
      lastBackupText,
      exportedAtText,
      triggerCSV,
      triggerJSON,
      importJSON,
      openChannels: () => {
        return emit('open-channels');
      },
    };
  },
  template: `
    <header class="bg-white p-4 rounded-2xl shadow-sm mb-4 border border-gray-200">
      <div class="flex justify-between items-center mb-2">
        <h1 class="text-xl sm:text-2xl font-bold text-gray-900">菜單管理系統</h1>
        <button
          @click="openChannels"
          class="text-sm bg-gray-100 active:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl border font-bold"
        >
          ⚙ 通路與加成
        </button>
      </div>
      <div class="flex flex-wrap justify-between text-xs sm:text-sm text-gray-500 mb-3 gap-1">
        <span>資料版本日期: {{ exportedAtText }}</span>
        <span>上次匯出時間: {{ lastBackupText }}</span>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <label
          class="bg-indigo-50 border border-indigo-200 text-indigo-700 active:bg-indigo-100 text-sm sm:text-base py-2.5 rounded-xl font-bold text-center cursor-pointer flex items-center justify-center shadow-sm"
        >
          匯入資料
          <input type="file" accept=".json" @change="importJSON" class="file-hidden" />
        </label>
        <button
          @click="triggerJSON"
          class="bg-blue-600 active:bg-blue-700 text-white text-sm sm:text-base py-2.5 rounded-xl font-bold shadow-sm"
        >
          匯出資料
        </button>
        <button
          @click="triggerCSV"
          class="bg-emerald-600 active:bg-emerald-700 text-white text-sm sm:text-base py-2.5 rounded-xl font-bold shadow-sm"
        >
          匯出表格
        </button>
      </div>
    </header>
  `,
};
