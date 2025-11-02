// main.js (V7 重构版)

import { createSSRApp } from 'vue';
import * as Pinia from 'pinia';
import App from './App.vue';

export function createApp() {
	const app = createSSRApp(App);

	// 1. 创建并注册 Pinia
    // 我们的 userStore (在 App.vue 的 onLaunch 中) 
    // 将在 app 启动时处理所有登录和角色逻辑。
	app.use(Pinia.createPinia());

	return {
		app,
		Pinia // 必须按 uni-app 规范返回 Pinia 命名空间
	};
}