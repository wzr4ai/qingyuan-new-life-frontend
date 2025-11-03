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
                <text class="label">角色</text>
                <text class="value">{{ roleLabel }}</text>
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

const roleLabel = computed(() => {
    switch (userStore.userRole) {
        case 'admin':
            return '管理员';
        case 'technician':
            return '技师';
        default:
            return '客户';
    }
});

const displayName = computed(() => userInfo.value?.nickname || userInfo.value?.phone || '未登录用户');

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

.logout-btn {
    margin-top: auto;
    background-color: #ff4d4f;
    color: #fff;
    border-radius: 50rpx;
    padding: 20rpx 0;
}
</style>
