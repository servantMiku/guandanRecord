export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '赛季管理'
    })
  : { navigationBarTitleText: '赛季管理' }
