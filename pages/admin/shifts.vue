<template>
	<view class="admin-page-container">
		<view class="header">
            <text class="title">排班管理</text> 
		</view>
		<view class="content">
			<text>此功能正在开发中...</text>
		</view>
	</view>
</template>

<script setup>
import { onMounted } from 'vue';

// (H5 专属) 通知 leftWindow 更新激活状态
// #ifdef H5
onMounted(() => {
    setTimeout(() => {
        uni.sendSocketMessage({ data: 'routeChange' });
    }, 200);
});
// #endif
</script>

<style>
/* 引入全局 Admin 样式 */
@import '/static/css/admin.css';

.content {
	padding: 20px;
	background-color: #fff;
	border-radius: 8px;
}
</style>