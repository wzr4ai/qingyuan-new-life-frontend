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
                    <view class="input-group">
                        <text class="input-label">可执行服务</text>
                        <text class="input-hint" v-if="serviceOptions.length">可多选，用于控制该技师的服务范围</text>
                        <view v-if="serviceOptions.length">
                            <uni-data-checkbox
                                multiple
                                :localdata="serviceOptions"
                                v-model="selectedServiceUids"
                            />
                        </view>
                        <view v-else class="empty-hint">
                            暂无可用服务，请先创建服务项目。
                        </view>
                    </view>
                </view>
            </uni-popup-dialog>
        </uni-popup>
    </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
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
const selectedServiceUids = ref([]);

const serviceOptions = computed(() => {
    return serviceList.value
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map((service) => ({
            text: service.name,
            value: String(service.uid)
        }));
});

const fetchTechnicians = async () => {
    try {
        const data = await getTechnicians();
        technicianList.value = data.map((item) => ({
            ...item,
            nickname: item.nickname || item.phone || '未命名技师',
            services: (item.services || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''))
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
    const initial = (technician.services || []).map((service) => String(service.uid));
    selectedServiceUids.value = Array.from(new Set(initial));
    assignPopup.value.open();
};

const handleAssign = async () => {
    const technician = selectedTechnician.value;
    if (!technician) {
        return;
    }
    if (!selectedServiceUids.value.length) {
        uni.showToast({ title: '请选择服务', icon: 'none' });
        return;
    }
    try {
        const originalServices = (technician.services || []).map((service) => String(service.uid));
        const selected = selectedServiceUids.value.map((uid) => String(uid));
        const toAdd = selected.filter((uid) => !originalServices.includes(uid));
        const toRemove = originalServices.filter((uid) => !selected.includes(uid));

        for (const uid of toAdd) {
            await assignServiceToTech(technician.uid, uid);
        }
        for (const uid of toRemove) {
            await removeServiceFromTech(technician.uid, uid);
        }

        uni.showToast({ title: '更新成功', icon: 'success' });
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
.input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.input-label {
    font-size: 14px;
    font-weight: 600;
    color: #333333;
}
.input-hint {
    font-size: 12px;
    color: #888888;
}
.empty-hint {
    font-size: 12px;
    color: #888888;
    background-color: #fafafa;
    border: 1px dashed #dddddd;
    border-radius: 6px;
    padding: 8px 12px;
}

.popup-label {
    font-weight: 600;
}
</style>
