import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import { injectH5Styles } from '@/utils/h5-styles';
import { enableWxDebugIfNeeded } from '@/utils/wx-debug';
import { initAuth } from '@/stores/authStore';
import '@/app.css';

export default ({ children }: PropsWithChildren<any>) => {
  useLaunch(() => {
    enableWxDebugIfNeeded();
    injectH5Styles();
    // 异步初始化认证，不阻塞页面渲染
    initAuth();
  });

  return children;
};
