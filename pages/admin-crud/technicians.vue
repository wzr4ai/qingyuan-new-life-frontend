<template>
    <view class="admin-page-container">
        <view class="header">
            <text class="title">技师管理</text>
            <button class="primary-btn" @click="refreshData" :disabled="isLoading">
                <uni-icons type="refresh" color="#fff" size="16"></uni-icons>
                刷新
            </button>
        </view>

        <view v-for="item in technicianList" :key="item.uid" class="tech-card">
            <view class="tech-header">
                <view>
                    <text class="tech-name">{{ item.nickname || '未命名技师' }}</text>
                    <text class="tech-phone">{{ item.phone || '暂无手机号' }}</text>
                </view>
                <button class="secondary-btn" @click="openAssignPopup(item)">
                    分配服务
                </button>
            </view>
            <view class="tech-services" v-if="item.services?.length">
                <uni-tag
                    v-for="service in item.services"
                    :key="service.uid"
                    :text="service.name"
                    size="small"
                    type="primary"
                    :closable="true"
                    @close="confirmRemoveService(item, service)"
                ></uni-tag>
            </view>
            <view v-else class="empty-service">尚未分配服务</view>
        </view>

        <view v-if="!technicianList.length" class="empty-state">
            <text>暂无技师，请先通过后台创建技师账号。</text>
        </view>

        <uni-popup ref="assignPopup" type="dialog">
            <uni-popup-dialog
                mode="input"
                title="分配服务"
                confirmText="提交"
                @confirm="handleAssign"
                :before-close="true"
                @close="assignPopup.close()"
            >
                <view class="form-body">
                    <view class="popup-label">
                        {{ selectedTechnician?.nickname || selectedTechnician?.phone || '未知技师' }}
                    </view>
                    <picker
                        mode="selector"
                        :range="serviceList"
                        range-key="name"
                        @change="handleServiceChange"
                        :value="selectedServiceIndex"
                    >
                        <view class="selector selector-inline">
                            {{ serviceList[selectedServiceIndex]?.name || '请选择服务' }}
                            <uni-icons type="bottom" size="14" color="#666"></uni-icons>
                        </view>
                    </picker>
                </view>
            </uni-popup-dialog>
        </uni-popup>
    </view>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import {
    getTechnicians,
    getServices,
    assignServiceToTech,
    removeServiceFromTech
} from '@/api/admin.js';

const technicianList = ref([]);
const serviceList = ref([]);
const isLoading = ref(false);

const assignPopup = ref(null);
const selectedTechnician = ref(null);
const selectedServiceIndex = ref(-1);

const fetchTechnicians = async () => {
    try {
        const data = await getTechnicians();
        technicianList.value = data.map((item) => ({
            ...item,
            nickname: item.nickname || item.phone || '未命名技师'
        }));
    } catch (error) {
        console.error('加载技师失败:', error);
        uni.showToast({ title: '加载技师失败', icon: 'error' });
    }
};

const fetchServices = async () => {
    try {
        const data = await getServices();
        serviceList.value = data;
    } catch (error) {
        console.error('加载服务失败:', error);
        uni.showToast({ title: '加载服务失败', icon: 'error' });
    }
};

const refreshData = async () => {
    if (isLoading.value) {
        return;
    }
    isLoading.value = true;
    try {
        await Promise.all([fetchTechnicians(), fetchServices()]);
    } finally {
        isLoading.value = false;
    }
};

onMounted(refreshData);

const openAssignPopup = (technician) => {
    selectedTechnician.value = technician;
    selectedServiceIndex.value = -1;
    assignPopup.value.open();
};

const handleServiceChange = (event) => {
    selectedServiceIndex.value = Number(event.detail.value);
};

const handleAssign = async () => {
    const technician = selectedTechnician.value;
    if (!technician) {
        return;
    }
    const service = serviceList[selectedServiceIndex.value];
    if (!service) {
        uni.showToast({ title: '请选择服务', icon: 'none' });
        return;
    }
    try {
        await assignServiceToTech(technician.uid, service.uid);
        uni.showToast({ title: '分配成功', icon: 'success' });
        assignPopup.value.close();
        await fetchTechnicians();
    } catch (error) {
        console.error('分配服务失败:', error);
        uni.showToast({ title: error.data?.detail || '操作失败', icon: 'error' });
    }
};

const confirmRemoveService = (technician, service) => {
    uni.showModal({
        title: '确认操作',
        content: `确定移除「${service.name}」服务吗？`,
        success: async (res) => {
            if (res.confirm) {
                try {
                    await removeServiceFromTech(technician.uid, service.uid);
                    uni.showToast({ title: '移除成功', icon: 'success' });
                    await fetchTechnicians();
                } catch (error) {
                    console.error('移除服务失败:', error);
                    uni.showToast({ title: error.data?.detail || '操作失败', icon: 'error' });
                }
            }
        }
    });
};
</script>

<style scoped>
@import '/static/css/admin.css';

.tech-card {
    background-color: #ffffff;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.tech-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.tech-name {
    font-size: 18px;
    font-weight: 600;
}

.tech-phone {
    font-size: 14px;
    color: #888888;
    display: block;
}

.tech-services {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
}

.empty-service {
    margin-top: 12px;
    color: #888888;
}

.empty-state {
    text-align: center;
    color: #888888;
    padding: 40px 20px;
}

.secondary-btn {
    border: 1px solid #dddddd;
    background-color: #ffffff;
    border-radius: 6px;
    padding: 6px 12px;
}

.selector {
    min-width: 160px;
    padding: 8px 12px;
    border: 1px solid #dddddd;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #ffffff;
}

.selector-inline {
    margin-top: 10px;
}

.form-body {
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.popup-label {
    font-weight: 600;
}
</style>
