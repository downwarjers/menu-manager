import { createApp, ref, computed, onMounted } from 'vue';
import { store, initStore } from './state/menuStore.js';
import { exportJSONFile } from './utils/exporter.js';
import HeaderBar from './components/HeaderBar.js';
import DishList from './components/DishList.js';
import PackageList from './components/PackageList.js';
import BaseDataList from './components/BaseDataList.js';
import ChannelModal from './components/modals/ChannelModal.js';
import DishModal from './components/modals/DishModal.js';
import PackageModal from './components/modals/PackageModal.js';
import SlotQuickEditModal from './components/modals/SlotQuickEditModal.js';
import IngredientModal from './components/modals/IngredientModal.js';
import SimpleBaseModal from './components/modals/SimpleBaseModal.js';

// PWA 離線快取開關：true = 啟用 Service Worker 快取；false = 停用並主動清理現有快取
const ENABLE_PWA_CACHE = false;

createApp({
  components: {
    HeaderBar,
    DishList,
    PackageList,
    BaseDataList,
    ChannelModal,
    DishModal,
    PackageModal,
    SlotQuickEditModal,
    IngredientModal,
    SimpleBaseModal,
  },
  setup() {
    const currentTab = ref('dishes');
    const modalType = ref(null);
    const editingDish = ref(null);
    const editingPackage = ref(null);
    const editingSlotContext = ref(null);
    const editingIngredientIndex = ref(null);
    const editingSimpleIndex = ref(null);

    onMounted(async () => {
      await initStore();

      if ('serviceWorker' in navigator) {
        const isLocalhost = Boolean(
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1' ||
          window.location.hostname.endsWith('.localhost'),
        );

        if (ENABLE_PWA_CACHE && !isLocalhost) {
          // 啟用模式：註冊 Service Worker
          navigator.serviceWorker.register('./sw.js').catch((err) => {
            console.error('ServiceWorker registration error:', err);
          });
        } else {
          // 關閉模式：主動清除所有已安裝的 Service Worker 與 Cache Storage
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const registration of registrations) {
              registration.unregister();
            }
          });
          if ('caches' in window) {
            caches.keys().then((keys) => {
              keys.forEach((key) => {
                return caches.delete(key);
              });
            });
          }
        }
      }
    });

    const backupWarning = computed(() => {
      if (!store.lastBackupTime) {
        return true;
      }
      const diffDays = (Date.now() - new Date(store.lastBackupTime).getTime()) / (1000 * 3600 * 24);
      return diffDays >= 7;
    });

    const openModal = (type) => {
      modalType.value = type;
    };

    const closeModal = () => {
      modalType.value = null;
      editingDish.value = null;
      editingPackage.value = null;
      editingSlotContext.value = null;
      editingIngredientIndex.value = null;
      editingSimpleIndex.value = null;
    };

    const openDishModal = (dish = null) => {
      editingDish.value = dish;
      modalType.value = 'dish';
    };

    const openPackageModal = (pkg = null) => {
      editingPackage.value = pkg;
      modalType.value = 'package';
    };

    const openSlotQuickEditModal = ({ pkg, slotIndex }) => {
      editingSlotContext.value = { pkg, slotIndex };
      modalType.value = 'slotQuickEdit';
    };

    const openIngredientModal = (idx = null) => {
      editingIngredientIndex.value = idx;
      modalType.value = 'ingredientForm';
    };

    const openSimpleBaseModal = ({ type, idx }) => {
      editingSimpleIndex.value = idx;
      modalType.value = type;
    };

    const triggerBackup = () => {
      exportJSONFile(store);
    };

    return {
      store,
      currentTab,
      modalType,
      backupWarning,
      editingDish,
      editingPackage,
      editingSlotContext,
      editingIngredientIndex,
      editingSimpleIndex,
      openModal,
      closeModal,
      openDishModal,
      openPackageModal,
      openSlotQuickEditModal,
      openIngredientModal,
      openSimpleBaseModal,
      triggerBackup,
    };
  },
}).mount('#app');
