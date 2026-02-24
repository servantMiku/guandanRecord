export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '统计分析',
      enablePullDownRefresh: true
    })
  : {
      navigationBarTitleText: '统计分析',
      enablePullDownRefresh: true
    }
