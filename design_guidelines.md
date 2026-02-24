# 掼蛋游戏小程序 - 设计指南

## 品牌定位

**应用定位**：为6位好友线下掼蛋比赛提供专业的战绩记录和统计分析工具

**设计风格**：温暖的茶馆氛围，传统与现代结合，体现社交性和竞技性

**目标用户**：6位好友，年龄30-50岁，注重社交娱乐，需要简单易用的工具

## 气质与意象

**核心意象**：老式茶馆，木质桌牌，温暖灯光，纸质牌面

**场景描述**：
- 午后茶馆，阳光透过窗纱洒在木桌上
- 木质纹理的牌桌，温度感十足
- 手持纸质扑克，触感真实
- 朋友们围坐，笑声不断
- 记分牌上铅笔书写的痕迹

**关键词**：温暖、木质、传统、社交、竞技

## 视觉策略

**图形语言**：
- 卡片式设计，模拟纸质牌面
- 圆角处理，温和友好
- 微妙阴影，增加层次感
- 木质纹理背景（可选）

**图标风格**：
- 线性图标，简洁优雅
- 统一2px线宽
- 琥珀色主色调

## 配色方案

### 主色调
- **琥珀金** `#f59e0b` (amber-500) - 主操作、强调元素
- **深琥珀** `#d97706` (amber-600) - 按钮悬停

### 辅助色
- **暖棕色** `#78350f` (amber-950) - 标题、重要文字
- **浅棕色** `#a16207` (amber-700) - 次级文字

### 中性色
- **米白色** `#fafaf9` (stone-50) - 页面背景
- **浅灰色** `#f5f5f4` (stone-100) - 卡片背景
- **中灰色** `#a8a29e` (stone-400) - 辅助文字
- **深灰色** `#44403c` (stone-700) - 正文文字

### 语义色
- **成功** `#22c55e` (green-500)
- **警告** `#f59e0b` (amber-500)
- **错误** `#ef4444` (red-500)
- **信息** `#3b82f6` (blue-500)

## 字体规范

**字体选择**：
- 中文：Noto Sans SC / 系统默认
- 数字/英文：Inter

**排版层级**：
- **H1 标题**：text-2xl font-bold text-amber-950
- **H2 标题**：text-xl font-semibold text-amber-950
- **H3 标题**：text-lg font-medium text-amber-700
- **正文**：text-base text-stone-700
- **辅助文字**：text-sm text-stone-400
- **Caption**：text-xs text-stone-400

**行高**：leading-relaxed (1.625)

## 间距系统

**页面边距**：p-4 (16px)

**组件间距**：
- 卡片内边距：p-4 (16px)
- 卡片间距：gap-4 (16px)
- 表单项间距：gap-3 (12px)
- 小元素间距：gap-2 (8px)

## 组件规范

### 按钮

**主按钮**：
```tsx
<Button className="w-full bg-amber-500 text-white rounded-xl py-3 font-medium active:bg-amber-600">
  确认
</Button>
```

**次按钮**：
```tsx
<Button className="w-full bg-stone-100 text-stone-700 rounded-xl py-3 font-medium active:bg-stone-200">
  取消
</Button>
```

**禁用态**：
```tsx
<Button disabled className="w-full bg-stone-200 text-stone-400 rounded-xl py-3 font-medium">
  确认
</Button>
```

### 卡片

```tsx
<View className="bg-white rounded-2xl p-4 shadow-sm">
  <Text className="block text-lg font-semibold text-amber-950 mb-2">标题</Text>
  <Text className="block text-stone-700">内容</Text>
</View>
```

### 输入框

```tsx
<View className="bg-stone-50 rounded-xl px-4 py-3 mb-3">
  <Input
    className="w-full bg-transparent text-base text-stone-700"
    placeholder="请输入内容"
    placeholderClass="text-stone-400"
  />
</View>
```

### 选择器

```tsx
<View className="flex flex-wrap gap-2">
  <View className="bg-amber-500 text-white px-4 py-2 rounded-full text-sm font-medium">
    已选择
  </View>
  <View className="bg-stone-100 text-stone-700 px-4 py-2 rounded-full text-sm">
    未选择
  </View>
</View>
```

### 列表项

```tsx
<View className="bg-white rounded-xl p-4 mb-3 flex items-center justify-between">
  <View>
    <Text className="block text-base font-medium text-amber-950 mb-1">标题</Text>
    <Text className="block text-sm text-stone-400">辅助信息</Text>
  </View>
  <Text className="text-amber-500 font-medium">操作</Text>
</View>
```

### 空状态

```tsx
<View className="flex flex-col items-center justify-center py-16">
  <View className="text-stone-300 mb-4">
    {/* Icon */}
  </View>
  <Text className="block text-stone-400 text-base">暂无数据</Text>
</View>
```

### 加载态

```tsx
<View className="flex items-center justify-center py-16">
  <Text className="block text-stone-400 text-sm">加载中...</Text>
</View>
```

## 导航结构

### TabBar 配置
```typescript
tabBar: {
  color: '#a8a29e',
  selectedColor: '#f59e0b',
  backgroundColor: '#ffffff',
  borderStyle: 'white',
  list: [
    { pagePath: 'pages/index/index', text: '首页' },
    { pagePath: 'pages/records/index', text: '战绩' },
    { pagePath: 'pages/stats/index', text: '统计' },
    { pagePath: 'pages/profile/index', text: '我的' }
  ]
}
```

### 页面跳转规范
- TabBar 页面：使用 `Taro.switchTab()`
- 普通页面：使用 `Taro.navigateTo()`
- 返回：使用 `Taro.navigateBack()`

## 交互规范

### 触觉反馈
- 按钮点击：轻微缩小动画
- 卡片点击：轻微阴影增强
- 列表项点击：背景色变化

### 过渡动画
- 页面切换：淡入淡出
- 弹窗显示：从底部滑入
- 列表加载：逐项显示

### 错误处理
- 使用 Toast 提示
- 显示在页面顶部
- 3秒后自动消失

## 小程序约束

**包体积限制**：
- 主包 ≤ 2MB
- 单个分包 ≤ 2MB
- 所有分包 ≤ 20MB

**优化建议**：
- 使用网络图片，不本地存储
- 按需引入组件
- 压缩代码资源

**性能优化**：
- 分包加载
- 图片懒加载
- 列表虚拟化

## 设计禁忌

❌ **不要做**：
- 使用冷色调（蓝色、紫色）
- 过度使用阴影和渐变
- 复杂的动画效果
- 过多的圆角（保持一致性）
- 使用占位图片
- 硬编码图片链接

✅ **必须做**：
- 使用真实可访问的图片链接
- 保持设计一致性
- 优化性能
- 提供清晰的错误提示
- 支持深色模式（可选）
