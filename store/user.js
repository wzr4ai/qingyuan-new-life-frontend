// store/user.js
import { defineStore } from 'pinia';
import { wxLogin, getMe } from '@/api/auth.js'; // <-- 导入 getMe

// --- V7：定义不同角色的 TabBar ---
const customerTabBar = {
    "list": [
        { "pagePath": "pages/index/index", "text": "预约" },
        { "pagePath": "pages/appointment/list", "text": "我的预约" },
        { "pagePath": "pages/profile/index", "text": "我的" },
        // --- 第 4 个 Tab (客户用不到，但必须填充以匹配 pages.json) ---
        // 统一指向占位页，避免与其他 Tab 重复导致编译错误
        { "pagePath": "pages/placeholder/index", "text": "" } // 文字设为空
    ]
};

const technicianTabBar = {
    "list": [
        { "pagePath": "pages/tech/schedule", "text": "我的排班" },
        { "pagePath": "pages/tech/appointments", "text": "我的预约" },
        { "pagePath": "pages/profile/index", "text": "我的" },
        // --- 第 4 个 Tab (技师用不到) ---
        { "pagePath": "pages/placeholder/index", "text": "" } 
    ]
};

const adminTabBar = {
    "list": [
        { "pagePath": "pages/admin/dashboard", "text": "仪表盘" },
        { "pagePath": "pages/admin/manage", "text": "数据管理" },
        { "pagePath": "pages/admin/scheduling", "text": "排班" },
        // --- 第 4 个 Tab (管理员需要) ---
        { "pagePath": "pages/profile/index", "text": "我的" } 
    ]
};
// ---------------------------------

export const useUserStore = defineStore('user', {
    state: () => ({
        token: uni.getStorageSync('token') || null,
        isLoggedIn: !!uni.getStorageSync('token'),
        
        // --- V7 新增 ---
        // userInfo 将存储 { uid, role, nickname, ... }
        userInfo: uni.getStorageSync('userInfo') || null, 
    }),
    
    // --- V7 新增 Getters ---
    getters: {
        userRole: (state) => state.userInfo?.role || 'customer', // 默认为 customer
    },
    
    actions: {
        /**
         * 核心：应用启动时的登录流程 (V7)
         */
        async appLogin() {
                    if (this.isLoggedIn) {
                        console.log('用户已登录, 正在获取用户信息...');
                        await this.fetchUserInfo();
                    } else {
                        console.log('用户未登录，开始自动登录...');
                        try {
                            // 1. 使用 try...catch 块来捕获 uni.login 的潜在错误
                            let loginRes; 
                            try {
                                loginRes = await uni.login({ provider: 'weixin' });
                                console.log('uni.login 成功:', loginRes);
                            } catch (loginErr) {
                                // 2. 如果 uni.login 本身失败，在这里捕获并抛出
                                console.error('uni.login 失败:', loginErr);
                                throw new Error('uni.login 失败'); 
                            }
        
                            // 3. uni.login 成功后，loginRes 包含 code
                            const data = await wxLogin(loginRes.code);
                            if (data && data.access_token) {
                                this.setToken(data.access_token);
                                await this.fetchUserInfo(); 
                            } else {
                                // 如果后端返回的数据不对，也抛出错误
                                throw new Error('后端 wxLogin 未返回有效 token');
                            }
                        } catch (error) {
                            console.error('自动登录流程失败:', error);
                            this.setDynamicTabBar(); // 即使失败也设置默认 TabBar
                        }
                    }
        },
        
        /**
         * (V7) 获取并存储用户信息
         */
        async fetchUserInfo() {
            if (!this.isLoggedIn) return; // 没有 Token 无法获取

            try {
                const userInfo = await getMe();
                this.userInfo = userInfo;
                uni.setStorageSync('userInfo', userInfo);
                console.log('用户信息获取成功, 角色:', this.userRole);
            } catch (error) {
                console.error('获取用户信息失败 (Token 可能已过期):', error);
                // Token 无效，登出
                this.logout();
            }
            
            // 无论成功还是失败，都要根据最终角色设置 TabBar
            this.setDynamicTabBar();
        },

        /**
         * (V7) 动态设置 TabBar
         */
        setDynamicTabBar() {
            let config;
            switch (this.userRole) {
                case 'admin':
                    config = adminTabBar;
                    break;
                case 'technician':
                    config = technicianTabBar;
                    break;
                case 'customer':
                default:
                    config = customerTabBar;
                    break;
            }
            
            // uni-app 动态设置 TabBar 的 API
            config.list.forEach((item, index) => {
                uni.setTabBarItem({
                    index: index,
                    pagePath: item.pagePath,
                    text: item.text,
                    // iconPath 和 selectedIconPath 也应在这里设置
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
            
            // 登出后，重置为客户 TabBar
            this.setDynamicTabBar();
            // (可选) 重定向到首页
            uni.switchTab({ url: '/pages/index/index' });
        }
    }
});
