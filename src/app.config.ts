export default {
  pages: [
    'pages/index/index',
    'pages/records/index',
    'pages/stats/index',
    'pages/profile/index',
    'pages/seasons/index',
    'pages/record-detail/index',
    'pages/record-form/index',
    'pages/arrange/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '掼蛋战绩',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#a8a29e',
    selectedColor: '#f59e0b',
    backgroundColor: '#1e293b',
    borderStyle: 'black',
    list: [
      { pagePath: 'pages/index/index', text: '🏠 首页' },
      { pagePath: 'pages/stats/index', text: '📊 统计' },
      { pagePath: 'pages/records/index', text: '🏆 战绩' },
      { pagePath: 'pages/seasons/index', text: '🎯 赛季' },
      { pagePath: 'pages/profile/index', text: '👤 我的' }
    ]
  }
}
