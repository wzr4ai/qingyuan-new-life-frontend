<template>
    <view class="manage-hub-container">
        <view class="title">数据管理中心</view>
        <text class="subtitle">管理您的业务基础数据</text>
        
        <uni-list :border="true">
            <uni-list-item 
                v-for="item in menuItems" 
                :key="item.title"
                :title="item.title"
                :note="item.note"
                :to="item.path"
                link
                showArrow
            >
            </uni-list-item>
        </uni-list>
    </view>
</template>

<script setup>
import { onMounted, ref } from 'vue';

const menuItems = ref([
    {
        title: '地点管理',
        note: '管理您的工作室地点',
        path: '/pages/admin-crud/locations'
    },
    {
        title: '服务管理',
        note: '管理推拿、针灸等服务项目',
        path: '/pages/admin-crud/services'
    },
    {
        title: '资源管理 (床位)',
        note: '管理每个地点的物理床位/房间',
        path: '/pages/admin-crud/resources'
    },
    {
        title: '技师管理',
        note: '管理技师角色和技能',
        path: '/pages/admin-crud/technicians'
    },
    {
        title: '排班管理',
        note: '查看并调整技师排班',
        path: '/pages/admin-crud/shifts'
    }
]);

onMounted(() => {
    console.debug('[AdminManage] Menu items ready.', menuItems.value);
});
</script>

<style scoped>
.manage-hub-container {
    padding: 15px;
}
.title {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 5px;
}
.subtitle {
    font-size: 14px;
    color: #666;
    margin-bottom: 20px;
    display: block;
}
</style>
