<template>
    <view class="placeholder">
        <uni-icons :type="icon" size="28" color="#999"></uni-icons>
        <text class="title">{{ title }}</text>
        <text class="description">{{ description }}</text>
    </view>
</template>

<script setup>
const props = defineProps({
    title: {
        type: String,
        default: '功能开发中'
    },
    description: {
        type: String,
        default: '敬请期待下一次更新。'
    },
    icon: {
        type: String,
        default: 'more-filled'
    }
});
</script>

<style scoped>
.placeholder {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: #777;
    text-align: center;
    padding: 0 24rpx;
}

.title {
    font-size: 32rpx;
    font-weight: 600;
}

.description {
    font-size: 26rpx;
    color: #999;
}
</style>
