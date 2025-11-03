// store/user.js
import { defineStore } from 'pinia';
import { wxLogin, getMe } from '@/api/auth.js';
import { getTabTextsByRole } from '@/config/tab-config.js';

export const useUserStore = defineStore('user', {
    state: () => ({
        token: uni.getStorageSync('token') || null,
        isLoggedIn: !!uni.getStorageSync('token'),
        userInfo: uni.getStorageSync('userInfo') || null
    }),

    getters: {
        userRole: (state) => state.userInfo?.role || 'customer'
    },

    actions: {
        /**
         * 应用启动时的登录流程
         */
        async appLogin() {
            // 先根据当前已知角色刷新一次 TabBar，避免初始界面错乱
            this.setDynamicTabBar();

            if (this.isLoggedIn) {
                console.log('用户已登录, 正在获取用户信息...');
                await this.fetchUserInfo();
                return;
            }

            console.log('用户未登录，开始自动登录...');
            try {
                let loginRes;
                try {
                    loginRes = await uni.login({ provider: 'weixin' });
                    console.log('uni.login 成功:', loginRes);
                } catch (loginErr) {
                    console.error('uni.login 失败:', loginErr);
                    throw new Error('uni.login 失败');
                }

                const data = await wxLogin(loginRes.code);
                if (data && data.access_token) {
                    this.setToken(data.access_token);
                    await this.fetchUserInfo();
                } else {
                    throw new Error('后端 wxLogin 未返回有效 token');
                }
            } catch (error) {
                console.error('自动登录流程失败:', error);
                this.setDynamicTabBar();
            }
        },

        /**
         * 获取并存储用户信息
         */
        async fetchUserInfo() {
            if (!this.isLoggedIn) {
                return;
            }

            try {
                const userInfo = await getMe();
                this.userInfo = userInfo;
                uni.setStorageSync('userInfo', userInfo);
                console.log('用户信息获取成功, 角色:', this.userRole);
            } catch (error) {
                console.error('获取用户信息失败 (Token 可能已过期):', error);
                this.logout();
                return;
            }

            this.setDynamicTabBar();
        },

        /**
         * 根据角色动态更新 TabBar 文案
         */
        setDynamicTabBar() {
            const tabTexts = getTabTextsByRole(this.userRole);
            tabTexts.forEach((text, index) => {
                uni.setTabBarItem({
                    index,
                    text: text || ' '
                });
            });
        },

        setToken(newToken) {
            this.token = newToken;
            this.isLoggedIn = true;
            uni.setStorageSync('token', newToken);
        },

        logout() {
            this.token = null;
            this.isLoggedIn = false;
            this.userInfo = null;
            uni.removeStorageSync('token');
            uni.removeStorageSync('userInfo');

            this.setDynamicTabBar();
            uni.switchTab({ url: '/pages/index/index' });
        }
    }
});
