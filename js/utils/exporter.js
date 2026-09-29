const escapeCSVField = (val) => {
  if (val === null || val === undefined) {
    return '""';
  }
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
};

const getTimestampString = () => {
  const d = new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(d)
      .map((p) => {
        return [p.type, p.value];
      }),
  );
  return `${parts.year}${parts.month}${parts.day}_${parts.hour}${parts.minute}${parts.second}`;
};

const saveBlobFile = async (blob, suggestedName, pickerTypes = []) => {
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: pickerTypes,
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }
      console.warn('File System Access API 失敗，回退至傳統下載模式:', err);
    }
  }

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = suggestedName;
  a.click();
  URL.revokeObjectURL(a.href);
};

export const exportJSONFile = async (store) => {
  const nowIso = new Date().toISOString();
  store.lastBackupTime = nowIso;
  const dump = {
    version: store.version,
    exportedAt: nowIso,
    channels: store.channels,
    categories: store.categories,
    ingredients: store.ingredients,
    methods: store.methods,
    dishes: store.dishes,
    packages: store.packages,
    lastBackupTime: nowIso,
  };
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
  await saveBlobFile(blob, `菜單資料_${getTimestampString()}.json`, [
    {
      description: 'JSON Files',
      accept: { 'application/json': ['.json'] },
    },
  ]);
};

export const exportCSVFile = async (store) => {
  const isConfirmed = confirm('匯出 CSV 僅包含基本欄位資料，確認要匯出嗎？');
  if (!isConfirmed) {
    return;
  }
  const columns = [
    {
      header: '類型',
      resolve: (item) => {
        return item.__type;
      },
    },
    {
      header: '分類',
      resolve: (item) => {
        return item.__type === '單點' ? item.category || '' : '-';
      },
    },
    {
      header: '品名',
      resolve: (item) => {
        return item.name;
      },
    },
    ...store.channels.map((c) => {
      return {
        header: c.name,
        resolve: (item) => {
          return item.prices ? item.prices[c.key] || 0 : 0;
        },
      };
    }),
    {
      header: '套餐內容',
      resolve: (item) => {
        if (item.__type !== '套餐' || !item.slots) {
          return '';
        }
        return item.slots
          .map((s) => {
            return `${s.name}:[${s.dishNames.join('/')}]`;
          })
          .join('; ');
      },
    },
  ];
  const targetDishes = store.dishes.filter((d) => {
    return d.active !== false;
  });
  const targetPkgs = store.packages.filter((p) => {
    return p.active !== false;
  });
  const rows = [
    ...targetDishes.map((d) => {
      return { ...d, __type: '單點' };
    }),
    ...targetPkgs.map((p) => {
      return { ...p, __type: '套餐' };
    }),
  ].sort((a, b) => {
    if (a.__type !== b.__type) {
      return a.__type === '單點' ? -1 : 1;
    }
    const catA = a.category || '';
    const catB = b.category || '';
    const catCmp = catA.localeCompare(catB, 'zh-Hant');
    if (catCmp !== 0) {
      return catCmp;
    }
    const nameCmp = (a.name || '').localeCompare(b.name || '', 'zh-Hant');
    if (nameCmp !== 0) {
      return nameCmp;
    }
    const priceA = a.prices?.dine_in ?? 0;
    const priceB = b.prices?.dine_in ?? 0;
    return priceA - priceB;
  });
  const headerLine = columns
    .map((col) => {
      return escapeCSVField(col.header);
    })
    .join(',');
  const dataLines = rows.map((row) => {
    return columns
      .map((col) => {
        return escapeCSVField(col.resolve(row));
      })
      .join(',');
  });
  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  await saveBlobFile(blob, `菜單列表_${getTimestampString()}.csv`, [
    {
      description: 'CSV Files',
      accept: { 'text/csv': ['.csv'] },
    },
  ]);
};

export const shareBackupFile = async (store) => {
  const nowIso = new Date().toISOString();
  store.lastBackupTime = nowIso;
  const dump = {
    version: store.version,
    exportedAt: nowIso,
    channels: store.channels,
    categories: store.categories,
    ingredients: store.ingredients,
    methods: store.methods,
    dishes: store.dishes,
    packages: store.packages,
    lastBackupTime: nowIso,
  };

  const fileName = `菜單備份_${getTimestampString()}.json`;
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
  const file = new File([blob], fileName, { type: 'application/json' });

  // 1. 優先嘗試原生檔案分享 (手機 LINE / Email / 雲端硬碟)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: '菜單資料備份',
        text: `菜單備份檔案 (${nowIso})`,
        files: [file],
      });
      return;
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      } // 使用者中途取消分享，不報錯
      console.warn('檔案分享失敗，嘗試文字分享:', err);
    }
  }

  // 2. 次選方案：不支援檔案分享但支援純文字分享的裝置
  if (navigator.share) {
    try {
      await navigator.share({
        title: '菜單資料備份',
        text: JSON.stringify(dump),
      });
      return;
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }
    }
  }

  // 3. 完全不支援 Web Share API 時（如部分傳統桌面瀏覽器），降級回原本的檔案下載
  await exportJSONFile(store);
};
