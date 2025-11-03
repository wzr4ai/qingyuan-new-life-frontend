<template>
    <view class="admin-page-container">
        <view class="header">
            <text class="title">排班管理</text>
            <button class="primary-btn" @click="openCreatePopup" :disabled="!locationList.length || !technicianList.length">
                <uni-icons type="plusempty" color="#fff" size="16"></uni-icons>
                新建
            </button>
        </view>

        <view class="filter-bar">
            <picker
                mode="selector"
                :range="locationOptions"
                range-key="name"
                @change="handleFilterLocationChange"
                :value="filters.locationIndex"
            >
                <view class="selector">
                    {{ locationOptions[filters.locationIndex]?.name || '全部地点' }}
                    <uni-icons type="bottom" size="14" color="#666"></uni-icons>
                </view>
            </picker>
            <picker
                mode="selector"
                :range="technicianOptions"
                range-key="nickname"
                @change="handleFilterTechnicianChange"
                :value="filters.technicianIndex"
            >
                <view class="selector">
                    {{ technicianOptions[filters.technicianIndex]?.nickname || '全部技师' }}
                    <uni-icons type="bottom" size="14" color="#666"></uni-icons>
                </view>
            </picker>
            <view class="date-picker">
                <text class="label">开始</text>
                <uni-datetime-picker
                    type="date"
                    v-model="filters.startDate"
                    :clear-icon="true"
                    @change="fetchShifts"
                ></uni-datetime-picker>
            </view>
            <view class="date-picker">
                <text class="label">结束</text>
                <uni-datetime-picker
                    type="date"
                    v-model="filters.endDate"
                    :clear-icon="true"
                    @change="fetchShifts"
                ></uni-datetime-picker>
            </view>
        </view>

        <view v-for="item in shiftList" :key="item.uid" class="shift-card">
            <view class="shift-header">
                <view>
                    <text class="shift-title">{{ item.technician?.nickname || item.technician?.phone || '未知技师' }}</text>
                    <text class="shift-location">{{ item.location?.name || '-' }}</text>
                </view>
                <button class="danger-btn" @click="confirmDeleteShift(item)">删除</button>
            </view>
            <text class="shift-time">{{ formatDateTime(item.start_time) }} - {{ formatDateTime(item.end_time) }}</text>
        </view>

        <view v-if="!shiftList.length" class="empty-state">
            <text>暂无排班记录，可通过“新建”快速安排。</text>
        </view>

        <uni-popup ref="createPopup" type="dialog">
            <uni-popup-dialog
                mode="input"
                title="新建排班"
                confirmText="提交"
                @confirm="handleCreate"
                :before-close="true"
                @close="createPopup.close()"
            >
                <view class="form-body">
                    <picker
                        mode="selector"
                        :range="technicianList"
                        range-key="nickname"
                        @change="handleCreateTechnicianChange"
                        :value="createForm.technicianIndex"
                    >
                        <view class="selector selector-inline">
                            {{ technicianList[createForm.technicianIndex]?.nickname || '请选择技师' }}
                            <uni-icons type="bottom" size="14" color="#666"></uni-icons>
                        </view>
                    </picker>
                    <picker
                        mode="selector"
                        :range="locationList"
                        range-key="name"
                        @change="handleCreateLocationChange"
                        :value="createForm.locationIndex"
                    >
                        <view class="selector selector-inline">
                            {{ locationList[createForm.locationIndex]?.name || '请选择地点' }}
                            <uni-icons type="bottom" size="14" color="#666"></uni-icons>
                        </view>
                    </picker>
                    <uni-datetime-picker
                        type="datetime"
                        v-model="createForm.startTime"
                    ></uni-datetime-picker>
                    <uni-datetime-picker
                        type="datetime"
                        v-model="createForm.endTime"
                    ></uni-datetime-picker>
                </view>
            </uni-popup-dialog>
        </uni-popup>
    </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import {
    getShifts,
    getLocations,
    getTechnicians,
    createShift,
    deleteShift
} from '@/api/admin.js';

const shiftList = ref([]);
const locationList = ref([]);
const technicianList = ref([]);

const filters = ref({
    locationIndex: 0,
    technicianIndex: 0,
    startDate: '',
    endDate: ''
});

const createPopup = ref(null);
const createForm = ref({
    technicianIndex: 0,
    locationIndex: 0,
    startTime: '',
    endTime: ''
});

const fetchDependencies = async () => {
    try {
        const [locations, technicians] = await Promise.all([
            getLocations(),
            getTechnicians()
        ]);
        locationList.value = locations;
        technicianList.value = technicians.map((item) => ({
            ...item,
            nickname: item.nickname || item.phone || '未命名技师'
        }));
    } catch (error) {
        console.error('加载基础数据失败:', error);
        uni.showToast({ title: '加载基础数据失败', icon: 'error' });
    }
};

const fetchShifts = async () => {
    try {
        const params = {};
        const locationOption = locationOptions.value[filters.value.locationIndex];
        const technicianOption = technicianOptions.value[filters.value.technicianIndex];
        if (locationOption?.uid) {
            params.location_uid = locationOption.uid;
        }
        if (technicianOption?.uid) {
            params.technician_uid = technicianOption.uid;
        }
        if (filters.value.startDate) {
            params.start_date = filters.value.startDate;
        }
        if (filters.value.endDate) {
            params.end_date = filters.value.endDate;
        }
        const data = await getShifts(params);
        shiftList.value = data;
    } catch (error) {
        console.error('加载排班失败:', error);
        uni.showToast({ title: '加载排班失败', icon: 'error' });
    }
};

onMounted(async () => {
    await fetchDependencies();
    await fetchShifts();
});

const handleFilterLocationChange = async (event) => {
    filters.value.locationIndex = Number(event.detail.value);
    await fetchShifts();
};

const handleFilterTechnicianChange = async (event) => {
    filters.value.technicianIndex = Number(event.detail.value);
    await fetchShifts();
};

const openCreatePopup = () => {
    if (!locationList.value.length || !technicianList.value.length) {
        uni.showToast({ title: '请先维护地点和技师', icon: 'none' });
        return;
    }
    createForm.value = {
        technicianIndex: 0,
        locationIndex: 0,
        startTime: '',
        endTime: ''
    };
    createPopup.value.open();
};

const handleCreateTechnicianChange = (event) => {
    createForm.value.technicianIndex = Number(event.detail.value);
};

const handleCreateLocationChange = (event) => {
    createForm.value.locationIndex = Number(event.detail.value);
};

const handleCreate = async () => {
    const technician = technicianList.value[createForm.value.technicianIndex];
    const location = locationList.value[createForm.value.locationIndex];
    if (!technician || !location) {
        uni.showToast({ title: '请选择技师和地点', icon: 'none' });
        return;
    }
    if (!createForm.value.startTime || !createForm.value.endTime) {
        uni.showToast({ title: '请选择开始与结束时间', icon: 'none' });
        return;
    }
    if (new Date(createForm.value.startTime) >= new Date(createForm.value.endTime)) {
        uni.showToast({ title: '结束时间必须晚于开始时间', icon: 'none' });
        return;
    }
    try {
        await createShift({
            technician_uid: technician.uid,
            location_uid: location.uid,
            start_time: createForm.value.startTime,
            end_time: createForm.value.endTime
        });
        uni.showToast({ title: '创建成功', icon: 'success' });
        createPopup.value.close();
        await fetchShifts();
    } catch (error) {
        console.error('创建排班失败:', error);
        uni.showToast({ title: error.data?.detail || '操作失败', icon: 'error' });
    }
};

const confirmDeleteShift = (shift) => {
    uni.showModal({
        title: '确认删除',
        content: `确定删除 ${formatDateTime(shift.start_time)} 的排班吗？`,
        success: async (res) => {
            if (res.confirm) {
                try {
                    await deleteShift(shift.uid);
                    uni.showToast({ title: '删除成功', icon: 'success' });
                    await fetchShifts();
                } catch (error) {
                    console.error('删除排班失败:', error);
                    uni.showToast({ title: error.data?.detail || '操作失败', icon: 'error' });
                }
            }
        }
    });
};

const formatDateTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
</script>

<style scoped>
@import '/static/css/admin.css';

.filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;
}

.selector {
    min-width: 140px;
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

.date-picker {
    display: flex;
    align-items: center;
    gap: 6px;
}

.label {
    font-size: 14px;
    color: #666666;
}

.shift-card {
    background-color: #ffffff;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.shift-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.shift-title {
    font-size: 18px;
    font-weight: 600;
}

.shift-location {
    font-size: 14px;
    color: #888888;
}

.shift-time {
    display: block;
    margin-top: 8px;
    color: #555555;
}

.danger-btn {
    border: 1px solid #f56c6c;
    color: #f56c6c;
    padding: 6px 12px;
    border-radius: 6px;
    background-color: #ffffff;
}

.empty-state {
    text-align: center;
    color: #888888;
    padding: 40px 20px;
}

.form-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 10px;
}
</style>
const locationOptions = computed(() => [
    { uid: '', name: '全部地点' },
    ...locationList.value
]);

const technicianOptions = computed(() => [
    { uid: '', nickname: '全部技师' },
    ...technicianList.value
]);
