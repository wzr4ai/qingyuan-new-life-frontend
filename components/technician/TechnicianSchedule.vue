<template>
    <view class="placeholder">
        <uni-icons type="calendar-filled" size="26" color="#34c759"></uni-icons>
        <text class="title">技师排班</text>
        <text class="description">排班视图尚未接入，后续将展示个人排班。</text>
    </view>
</template>

<script setup>
// 技师排班占位
</script>

<style scoped>
.placeholder {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: #666;
}

.title {
    font-size: 32rpx;
    font-weight: 600;
    color: #222;
}

.description {
    font-size: 28rpx;
    color: #666;
}
</style>
