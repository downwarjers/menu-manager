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
import IngredientModal from './components/modals/IngredientModal.js';
import SimpleBaseModal from './components/modals/SimpleBaseModal.js';

createApp({
  components: {
    HeaderBar,
    DishList,
    PackageList,
    BaseDataList,
    ChannelModal,
    DishModal,
    PackageModal,
    IngredientModal,
    SimpleBaseModal,
  },
  setup() {
    const currentTab = ref('dishes');
    const modalType = ref(null);

    const editingDish = ref(null);
    const editingPackage = ref(null);
    const editingIngredientIndex = ref(null);
    const editingSimpleIndex = ref(null);

    onMounted(async () => {
      await initStore();
    });

    const backupWarning = computed(() => {
      if (!store.lastBackupTime) return true;
      const diffDays =
        (Date.now() - new Date(store.lastBackupTime).getTime()) / (1000 * 3600 * 24);
      return diffDays >= 7;
    });

    const openModal = (type) => {
      modalType.value = type;
    };

    const closeModal = () => {
      modalType.value = null;
      editingDish.value = null;
      editingPackage.value = null;
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
      editingIngredientIndex,
      editingSimpleIndex,
      openModal,
      closeModal,
      openDishModal,
      openPackageModal,
      openIngredientModal,
      openSimpleBaseModal,
      triggerBackup,
    };
  },
}).mount('#app');