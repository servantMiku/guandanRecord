export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '录入战绩'
    })
  : { navigationBarTitleText: '录入战绩' }
