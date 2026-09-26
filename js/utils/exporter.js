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

export const exportJSONFile = (store) => {
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
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `菜單完整備份_${getTimestampString()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

export const exportCSVFile = (store) => {
  const isConfirmed = confirm(
    '即將匯出菜單 CSV。\n\n按「確定」：僅匯出【上架/供應中】品項\n按「取消」：取消並放棄匯出',
  );
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
      header: '類別',
      resolve: (item) => {
        return item.__type === '單品料理' ? item.category || '' : '套餐';
      },
    },
    {
      header: '名稱',
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
      header: '套餐內容明細',
      resolve: (item) => {
        if (item.__type !== '套餐組合' || !item.slots) {
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
      return { ...d, __type: '單品料理' };
    }),
    ...targetPkgs.map((p) => {
      return { ...p, __type: '套餐組合' };
    }),
  ].sort((a, b) => {
    if (a.__type !== b.__type) {
      return a.__type === '單品料理' ? -1 : 1;
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
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `菜單價目表_${getTimestampString()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
};
