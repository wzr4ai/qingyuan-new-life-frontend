<template>
    <view class="tech-schedule-wrapper">
        <view class="hero">
            <text class="title">我的排班</text>
            <text class="subtitle">勾选空档，提交后管理员与客户可见</text>
        </view>
        <ScheduleBoard />
    </view>
</template>

<script setup>
import ScheduleBoard from '@/components/schedule/ScheduleBoard.vue';
</script>

<style scoped>
.tech-schedule-wrapper {
    padding: 0 0 20px;
}

.hero {
    padding: 20px 16px 0;
}

.title {
    font-size: 20px;
    font-weight: 600;
}

.subtitle {
    display: block;
    font-size: 13px;
    color: #8f9399;
    margin-top: 6px;
}
</style>
