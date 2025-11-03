<template>
    <view class="admin-page-container">
        <view class="header">
            <view>
                <text class="title">排班管理</text>
                <text class="subtitle">默认班次：上午 08:30-12:30，下午 14:00-18:00</text>
            </view>
            <view class="header-actions">
                <picker
                    mode="selector"
                    :range="technicianList"
                    range-key="nickname"
                    @change="handleTechnicianChange"
                    :value="technicianIndex"
                >
                    <view class="selector">
                        {{ technicianList[technicianIndex]?.nickname || '请选择技师' }}
                        <uni-icons type="bottom" size="14" color="#666"></uni-icons>
                    </view>
                </picker>
            </view>
        </view>

        <view v-if="!technicianList.length" class="empty-state">
            <text>暂无技师，请先在技师管理中维护数据。</text>
        </view>

        <view v-else class="calendar-container">
            <view
                v-for="day in calendar?.days || []"
                :key="day.date"
                class="calendar-card"
            >
                <view class="card-header">
                    <view>
                        <text class="card-date">{{ formatDate(day.date) }}</text>
                        <text class="card-weekday">{{ day.weekday }}</text>
                    </view>
                </view>

                    <view
                        v-for="periodKey in periodOrder"
                        :key="periodKey"
                        class="slot-row"
                    >
                        <view class="slot-info">
                            <text class="slot-label">{{ periodLabels[periodKey] }}</text>
                            <text class="slot-time">{{ periodTimes[periodKey] }}</text>
                        </view>
                        <view class="slot-content">
                            <template v-if="day[periodKey]?.is_active">
                                <view class="slot-details">
                                    <text class="slot-location">
                                        {{ day[periodKey].location_name || resolveLocationName(day[periodKey].location_uid) }}
                                    </text>
                                    <view class="slot-tags">
                                        <text v-if="day[periodKey].locked_by_admin" class="tag tag-info">管理员锁定</text>
                                    </view>
                                </view>
                                <button class="danger-btn" size="mini" @click="confirmCancel(day[periodKey])">
                                    删除
                                </button>
                            </template>
                            <template v-else>
                                <view class="slot-empty">
                                    <text class="slot-empty-text">未排班</text>
                                    <button class="primary-outline-btn" size="mini" @click="openAssignPopup(day, periodKey)">
                                        安排
                                    </button>
                                </view>
                            </template>
                        </view>
                    </view>
            </view>
        </view>

        <uni-popup ref="assignPopup" type="dialog">
            <uni-popup-dialog
                mode="input"
                title="安排班次"
                confirmText="提交"
                @confirm="handleAssignConfirm"
                :before-close="true"
                @close="closeAssignPopup"
            >
                <view class="form-body">
                    <text class="form-tip">请选择该班次的工作地点：</text>
                    <picker
                        mode="selector"
                        :range="locationOptions"
                        range-key="name"
                        @change="handleAssignLocationChange"
                        :value="assignState.locationIndex"
                    >
                        <view class="selector selector-inline">
                            {{ locationOptions[assignState.locationIndex]?.name || '请选择地点' }}
                            <uni-icons type="bottom" size="14" color="#666"></uni-icons>
                        </view>
                    </picker>
                    <view class="readonly-row">
                        <text>日期：{{ formatDate(assignState.day?.date) }}</text>
                        <text>班次：{{ periodLabels[assignState.period] }}（{{ periodTimes[assignState.period] }}）</text>
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
    getLocations,
    createShift,
    cancelShift,
    getTechnicianShiftCalendar
} from '@/api/admin.js';

const periodOrder = ['morning', 'afternoon'];
const periodLabels = {
    morning: '上午班',
    afternoon: '下午班'
};
const periodTimes = {
    morning: '08:30-12:30',
    afternoon: '14:00-18:00'
};

const technicianList = ref([]);
const locationList = ref([]);
const calendar = ref(null);
const technicianIndex = ref(0);

const assignPopup = ref(null);
const assignState = ref({
    day: null,
    period: 'morning',
    locationIndex: 0
});

const locationOptions = computed(() =>
    locationList.value.map((item) => ({
        uid: item.uid,
        name: item.name || '未命名地点'
    }))
);

const selectedTechnician = computed(() => technicianList.value[technicianIndex.value] || null);

const fetchDependencies = async () => {
    try {
        const [locations, technicians] = await Promise.all([
            getLocations(),
            getTechnicians()
        ]);
        locationList.value = locations || [];
        technicianList.value = (technicians || []).map((item) => ({
            ...item,
            nickname: item.nickname || item.phone || '未命名技师'
        }));
    } catch (error) {
        console.error('加载基础数据失败:', error);
        uni.showToast({ title: '加载基础数据失败', icon: 'error' });
    }
};

const fetchCalendar = async () => {
    if (!selectedTechnician.value) {
        calendar.value = null;
        return;
    }
    try {
        const data = await getTechnicianShiftCalendar(selectedTechnician.value.uid, { days: 14 });
        calendar.value = data;
    } catch (error) {
        console.error('加载排班失败:', error);
        uni.showToast({ title: '加载排班失败', icon: 'error' });
    }
};

onMounted(async () => {
    await fetchDependencies();
    await fetchCalendar();
});

const handleTechnicianChange = async (event) => {
    technicianIndex.value = Number(event.detail.value);
    await fetchCalendar();
};

const openAssignPopup = (day, period) => {
    if (!locationOptions.value.length) {
        uni.showToast({ title: '请先维护地点', icon: 'none' });
        return;
    }
    assignState.value = {
        day,
        period,
        locationIndex: 0
    };
    assignPopup.value?.open();
};

const handleAssignLocationChange = (event) => {
    assignState.value.locationIndex = Number(event.detail.value);
};

const handleAssignConfirm = async () => {
    const day = assignState.value.day;
    const period = assignState.value.period;
    const location = locationOptions.value[assignState.value.locationIndex];
    const technician = selectedTechnician.value;
    if (!day || !period || !location || !technician) {
        uni.showToast({ title: '信息不完整', icon: 'none' });
        return;
    }
    try {
        await createShift({
            technician_uid: technician.uid,
            location_uid: location.uid,
            date: day.date,
            period
        });
        uni.showToast({ title: '安排成功', icon: 'success' });
        closeAssignPopup();
        await fetchCalendar();
    } catch (error) {
        console.error('安排排班失败:', error);
        uni.showToast({ title: error.data?.detail || '操作失败', icon: 'error' });
    }
};

const closeAssignPopup = () => {
    assignPopup.value?.close();
};

const confirmCancel = (slot) => {
    if (!slot?.shift_uid) {
        return;
    }
    uni.showModal({
        title: '确认删除',
        content: '确定取消该班次吗？已存在的预约需要另行处理。',
        success: async (res) => {
            if (res.confirm) {
                try {
                    await cancelShift(slot.shift_uid);
                    uni.showToast({ title: '取消成功', icon: 'success' });
                    await fetchCalendar();
                } catch (error) {
                    console.error('取消排班失败:', error);
                    uni.showToast({ title: error.data?.detail || '操作失败', icon: 'error' });
                }
            }
        }
    });
};

const resolveLocationName = (uid) => {
    const found = locationOptions.value.find((item) => item.uid === uid);
    return found?.name || '未命名地点';
};

const formatDate = (value) => {
    if (!value) {
        return '-';
    }
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
</script>

<style scoped>
@import '/static/css/admin.css';

.header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
}

.subtitle {
    display: block;
    font-size: 12px;
    color: #888888;
    margin-top: 4px;
}

.header-actions {
    display: flex;
    gap: 12px;
    align-items: center;
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

.calendar-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 16px;
}

.calendar-card {
    background-color: #ffffff;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.card-date {
    font-size: 18px;
    font-weight: 600;
}

.card-weekday {
    font-size: 14px;
    color: #888888;
    margin-left: 8px;
}

.slot-row {
    display: flex;
    align-items: center;
    border-top: 1px solid #f0f0f0;
    padding: 14px 0;
    gap: 16px;
}

.slot-row:first-of-type {
    border-top: none;
}

.slot-info {
    min-width: 120px;
}

.slot-label {
    display: block;
    font-weight: 600;
    margin-bottom: 4px;
}

.slot-time {
    font-size: 12px;
    color: #888888;
}

.slot-content {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
}

.slot-details {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.slot-location {
    font-size: 15px;
}

.slot-tags {
    display: flex;
    gap: 6px;
    align-items: center;
}

.tag {
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 4px;
}

.tag-info {
    background-color: #ecf5ff;
    color: #409eff;
}

.slot-empty {
    display: flex;
    align-items: center;
    gap: 12px;
}

.slot-empty-text {
    color: #999999;
}

.primary-outline-btn {
    border: 1px solid #409eff;
    color: #409eff;
    padding: 6px 12px;
    border-radius: 6px;
    background-color: #ffffff;
}

.danger-btn {
    border: 1px solid #f56c6c;
    color: #f56c6c;
    padding: 6px 12px;
    border-radius: 6px;
    background-color: #ffffff;
}

.form-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 10px;
}

.form-tip {
    font-size: 14px;
    color: #666666;
}

.selector-inline {
    margin-top: 4px;
}

.readonly-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 14px;
    color: #555555;
}
</style>
