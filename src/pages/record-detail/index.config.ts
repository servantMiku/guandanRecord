export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '战绩详情'
    })
  : { navigationBarTitleText: '战绩详情' }
