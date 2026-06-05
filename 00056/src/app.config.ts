export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/service/index',
    'pages/rescue/index',
    'pages/mine/index',
    'pages/login/index',
    'pages/vehicle-manage/index',
    'pages/vehicle-bind/index',
    'pages/package-detail/index',
    'pages/booking/index',
    'pages/work-order/index',
    'pages/order-list/index',
    'pages/rescue-tracking/index',
    'pages/member-center/index',
    'pages/violation/index',
    'pages/insurance/index',
    'pages/admin-dashboard/index',
    'pages/report-export/index',
    'pages/store-list/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1E88E5',
    navigationBarTitleText: '车护达',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F5F7FA'
  },
  tabBar: {
    color: '#86909C',
    selectedColor: '#1E88E5',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页'
      },
      {
        pagePath: 'pages/service/index',
        text: '服务'
      },
      {
        pagePath: 'pages/rescue/index',
        text: '救援'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
})
