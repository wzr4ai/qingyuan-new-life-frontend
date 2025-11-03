<template>
    <view class="profile-container">
        <view class="avatar-wrapper">
        <image class="avatar" src="/static/logo.png" mode="cover"></image>
            <view class="user-info">
                <text class="name">{{ displayName }}</text>
                <text class="role-tag">{{ roleLabel }}</text>
            </view>
        </view>

        <view class="card">
            <view class="card-title">账户信息</view>
            <view class="card-row">
                <text class="label">手机号</text>
                <text class="value">{{ userInfo?.phone || '未绑定' }}</text>
            </view>
            <view class="card-row">
                <text class="label">真实角色</text>
                <text class="value">{{ actualRoleLabel }}</text>
            </view>
            <view class="card-row">
                <text class="label">当前视角</text>
                <text class="value">{{ viewRoleLabel }}</text>
            </view>
        </view>

        <view v-if="isAdmin" class="card">
            <view class="card-title">视角切换</view>
            <text class="tip">切换后可体验对应角色的功能，切换仅影响当前设备。</text>
            <view class="switch-group">
                <button
                    class="switch-btn"
                    :class="{ active: userStore.userRole === 'customer' }"
                    @click="switchView('customer')"
                >客户视角</button>
                <button
                    class="switch-btn"
                    :class="{ active: userStore.userRole === 'technician' }"
                    @click="switchView('technician')"
                >技师视角</button>
                <button
                    class="switch-btn"
                    :class="{ active: userStore.userRole === 'admin' }"
                    @click="switchView('admin')"
                >管理员视角</button>
            </view>
        </view>

        <button class="logout-btn" @click="handleLogout">退出登录</button>
    </view>
</template>

<script setup>
import { computed } from 'vue';
import { useUserStore } from '@/store/user.js';

const userStore = useUserStore();

const userInfo = computed(() => userStore.userInfo);

const mapRoleLabel = (role) => {
    switch (role) {
        case 'admin':
            return '管理员';
        case 'technician':
            return '技师';
        default:
            return '客户';
    }
};

const actualRoleLabel = computed(() => mapRoleLabel(userStore.actualRole));
const viewRoleLabel = computed(() => mapRoleLabel(userStore.userRole));
const displayName = computed(() => userInfo.value?.nickname || userInfo.value?.phone || '未登录用户');
const isAdmin = computed(() => userStore.actualRole === 'admin');

const switchView = (role) => {
    userStore.setRoleOverride(role);
    const label = mapRoleLabel(role);
    uni.showToast({ title: `已切换到${label}`, icon: 'none' });
};

const handleLogout = () => {
    userStore.logout();
    uni.showToast({ title: '已退出', icon: 'none' });
};
</script>

<style scoped>
.profile-container {
    min-height: 100vh;
    padding: 40rpx 30rpx;
    background-color: #f5f5f5;
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

.avatar-wrapper {
    display: flex;
    align-items: center;
    gap: 24rpx;
}

.avatar {
    width: 160rpx;
    height: 160rpx;
    border-radius: 50%;
    background-color: #e5e5e5;
}

.user-info {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.name {
    font-size: 38rpx;
    font-weight: 600;
    color: #222;
}

.role-tag {
    font-size: 26rpx;
    color: #888;
}

.card {
    background-color: #fff;
    border-radius: 16rpx;
    padding: 24rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.card-title {
    font-size: 32rpx;
    font-weight: 600;
    margin-bottom: 16rpx;
}

.card-row {
    display: flex;
    justify-content: space-between;
    padding: 20rpx 0;
    border-bottom: 1rpx solid #f0f0f0;
}

.card-row:last-child {
    border-bottom: none;
}

.label {
    font-size: 28rpx;
    color: #888;
}

.value {
    font-size: 28rpx;
    color: #333;
}

.tip {
    display: block;
    font-size: 24rpx;
    color: #888;
    margin-bottom: 20rpx;
}

.switch-group {
    display: flex;
    gap: 16rpx;
    flex-wrap: wrap;
}

.switch-btn {
    flex: 1;
    min-width: 180rpx;
    background-color: #ffffff;
    border: 2rpx solid #007aff;
    color: #007aff;
    border-radius: 50rpx;
    padding: 18rpx 0;
    font-size: 28rpx;
}

.switch-btn.active {
    background-color: #007aff;
    color: #ffffff;
}

.logout-btn {
    margin-top: auto;
    background-color: #ff4d4f;
    color: #fff;
    border-radius: 50rpx;
    padding: 20rpx 0;
}
</style>
