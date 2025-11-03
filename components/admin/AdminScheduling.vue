<template>
    <view class="admin-page-container">
        <view class="header">
            <text class="title">排班管理</text>
            <button class="primary-btn" @click="openCreatePopup" :disabled="isSubmitting || !locationList.length || !technicianList.length">
                <uni-icons type="plusempty" color="#fff" size="16"></uni-icons>
                新建排班
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
                <text class="label">开始日期</text>
                <uni-datetime-picker
                    type="date"
                    v-model="filters.startDate"
                    :clear-icon="true"
                    @change="fetchShifts"
                ></uni-datetime-picker>
            </view>
            <view class="date-picker">
                <text class="label">结束日期</text>
                <uni-datetime-picker
                    type="date"
                    v-model="filters.endDate"
                    :clear-icon="true"
                    @change="fetchShifts"
                ></uni-datetime-picker>
            </view>
            <button class="secondary-btn" @click="resetFilters">重置</button>
        </view>

        <view class="data-table">
            <uni-table border stripe emptyText="暂无排班数据">
                <uni-tr>
                    <uni-th align="left">技师</uni-th>
                    <uni-th align="left">地点</uni-th>
                    <uni-th align="center">开始时间</uni-th>
                    <uni-th align="center">结束时间</uni-th>
                    <uni-th align="center" width="120">操作</uni-th>
                </uni-tr>
                <uni-tr v-for="item in shiftList" :key="item.uid">
                    <uni-td>{{ item.technician?.nickname || item.technician?.phone || '未知技师' }}</uni-td>
                    <uni-td>{{ item.location?.name || '-' }}</uni-td>
                    <uni-td align="center">{{ formatDateTime(item.start_time) }}</uni-td>
                    <uni-td align="center">{{ formatDateTime(item.end_time) }}</uni-td>
                    <uni-td align="center">
                        <text class="link-btn danger" @click="confirmDeleteShift(item)">删除</text>
                    </uni-td>
                </uni-tr>
            </uni-table>
        </view>

        <uni-popup ref="createPopup" type="dialog">
            <uni-popup-dialog
                mode="input"
                title="创建排班"
                confirmText="提交"
                @confirm="handleCreate"
            >
                <view class="form-body">
                    <view class="form-row">
                        <text class="label required">技师</text>
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
                    </view>
                    <view class="form-row">
                        <text class="label required">地点</text>
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
                    </view>
                    <view class="form-row">
                        <text class="label required">开始时间</text>
                        <uni-datetime-picker
                            type="datetime"
                            v-model="createForm.startTime"
                        ></uni-datetime-picker>
                    </view>
                    <view class="form-row">
                        <text class="label required">结束时间</text>
                        <uni-datetime-picker
                            type="datetime"
                            v-model="createForm.endTime"
                        ></uni-datetime-picker>
                    </view>
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

// #ifdef H5
onMounted(() => {
    setTimeout(() => {
        uni.sendSocketMessage({ data: 'routeChange' });
    }, 200);
});
// #endif

const shiftList = ref([]);
const locationList = ref([]);
const technicianList = ref([]);
const isLoading = ref(false);
const isSubmitting = ref(false);

const filters = ref({
    locationIndex: 0,
    technicianIndex: 0,
    startDate: '',
    endDate: ''
});

const locationOptions = computed(() => [
    { uid: '', name: '全部地点' },
    ...locationList.value
]);

const technicianOptions = computed(() => [
    { uid: '', nickname: '全部技师' },
    ...technicianList.value
]);

const createPopup = ref(null);
const createForm = ref({
    technicianIndex: 0,
    locationIndex: 0,
    startTime: '',
    endTime: ''
});

const formatDateTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

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
    if (isLoading.value) {
        return;
    }
    isLoading.value = true;
    try {
        const params = {};
        const selectedLocation = locationOptions.value[filters.value.locationIndex];
        const selectedTechnician = technicianOptions.value[filters.value.technicianIndex];

        if (selectedLocation?.uid) {
            params.location_uid = selectedLocation.uid;
        }
        if (selectedTechnician?.uid) {
            params.technician_uid = selectedTechnician.uid;
        }
        if (filters.value.startDate) {
            params.start_date = filters.value.startDate;
        }
        if (filters.value.endDate) {
            params.end_date = filters.value.endDate;
        }

        const list = await getShifts(params);
        shiftList.value = list;
    } catch (error) {
        console.error('获取排班失败:', error);
        uni.showToast({ title: '获取排班失败', icon: 'error' });
    } finally {
        isLoading.value = false;
    }
};

const resetFilters = async () => {
    filters.value = {
        locationIndex: 0,
        technicianIndex: 0,
        startDate: '',
        endDate: ''
    };
    await fetchShifts();
};

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
        uni.showToast({ title: '请先新增地点和技师', icon: 'none' });
        return;
    }
    createForm.value = {
        technicianIndex: 0,
        locationIndex: 0,
        startTime: '',
        endTime: ''
    };
    createPopup.value?.open();
};

const handleCreateTechnicianChange = (event) => {
    createForm.value.technicianIndex = Number(event.detail.value);
};

const handleCreateLocationChange = (event) => {
    createForm.value.locationIndex = Number(event.detail.value);
};

const handleCreate = async () => {
    if (isSubmitting.value) {
        return;
    }

    const technician = technicianList.value[createForm.value.technicianIndex];
    const location = locationList.value[createForm.value.locationIndex];

    if (!technician || !location) {
        uni.showToast({ title: '请选择技师与地点', icon: 'none' });
        return;
    }

    if (!createForm.value.startTime || !createForm.value.endTime) {
        uni.showToast({ title: '请完整填写表单', icon: 'none' });
        return;
    }

    if (new Date(createForm.value.startTime) >= new Date(createForm.value.endTime)) {
        uni.showToast({ title: '结束时间必须晚于开始时间', icon: 'none' });
        return;
    }

    const payload = {
        technician_uid: technician.uid,
        location_uid: location.uid,
        start_time: createForm.value.startTime,
        end_time: createForm.value.endTime
    };

    isSubmitting.value = true;
    try {
        await createShift(payload);
        uni.showToast({ title: '创建成功', icon: 'success' });
        createPopup.value?.close();
        await fetchShifts();
    } catch (error) {
        console.error('创建排班失败:', error);
        uni.showToast({ title: error.data?.detail || '操作失败', icon: 'error' });
    } finally {
        isSubmitting.value = false;
    }
};

const confirmDeleteShift = (shift) => {
    uni.showModal({
        title: '确认删除',
        content: `确定要删除 ${shift.technician?.nickname || '该技师'} 在 ${shift.location?.name || '该地点'} 的排班吗？`,
        success: (res) => {
            if (res.confirm) {
                deleteShiftItem(shift.uid);
            }
        }
    });
};

const deleteShiftItem = async (uid) => {
    try {
        await deleteShift(uid);
        uni.showToast({ title: '删除成功', icon: 'success' });
        await fetchShifts();
    } catch (error) {
        console.error('删除排班失败:', error);
        uni.showToast({ title: error.data?.detail || '删除失败', icon: 'error' });
    }
};

onMounted(async () => {
    await fetchDependencies();
    await fetchShifts();
});
</script>

<style scoped>
@import '/static/css/admin.css';

.filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
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
    width: 100%;
}

.date-picker {
    display: flex;
    align-items: center;
    gap: 8px;
}

.label {
    font-size: 14px;
    color: #666666;
}

.required::before {
    content: '*';
    color: #ff4d4f;
    margin-right: 4px;
}

.data-table {
    background-color: #ffffff;
    border-radius: 10px;
    padding: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.form-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 10px;
}

.form-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.secondary-btn {
    padding: 8px 16px;
    border: 1px solid #dddddd;
    background-color: #ffffff;
    border-radius: 6px;
}
</style>
