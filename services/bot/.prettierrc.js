module.exports = {
  ...require('gts/.prettierrc.json'),
  importOrder: ['<THIRD_PARTY_MODULES>', 'fish', '^[./]'],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};
