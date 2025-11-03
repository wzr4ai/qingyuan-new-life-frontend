<template>
    <view class="content">
        <image class="logo" src="/static/logo.png"></image>
        <view class="text-area">
            <text class="title">欢迎来到青元新生</text>
        </view>
    </view>
</template>

<script setup>
// 客户端主页占位内容，后续可扩展推荐服务等功能
</script>

<style scoped>
.content {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: #f8f8f8;
}

.logo {
    height: 200rpx;
    width: 200rpx;
    margin-bottom: 40rpx;
}

.text-area {
    display: flex;
    justify-content: center;
}

.title {
    font-size: 36rpx;
    color: #555;
}
</style>
