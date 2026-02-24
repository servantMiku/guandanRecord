export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '战绩记录',
      enablePullDownRefresh: true
    })
  : {
      navigationBarTitleText: '战绩记录',
      enablePullDownRefresh: true
    }
