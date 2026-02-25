export default {
  pages: [
    'pages/index/index',
    'pages/records/index',
    'pages/stats/index',
    'pages/profile/index',
    'pages/seasons/index',
    'pages/record-detail/index',
    'pages/record-form/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '掼蛋战绩',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    custom: true,
    color: '#a8a29e',
    selectedColor: '#f59e0b',
    backgroundColor: '#1e293b',
    borderStyle: 'black',
    fontSize: '14px',
    list: [
      { pagePath: 'pages/index/index', text: '🏠 首页' },
      { pagePath: 'pages/records/index', text: '🏆 战绩' },
      { pagePath: 'pages/stats/index', text: '📊 统计' },
      { pagePath: 'pages/profile/index', text: '👤 我的' }
    ]
  }
}
