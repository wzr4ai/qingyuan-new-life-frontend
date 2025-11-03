<template>
    <view class="tech-schedule-container">
        <view class="hero">
            <text class="title">我的排班</text>
            <text class="subtitle">排班将决定客户可预约的具体时间，请提前规划。</text>
        </view>

        <view v-if="!calendar" class="empty-state">
            <text>暂无排班记录，点击下方空档安排班次。</text>
        </view>

        <view v-else class="calendar-container">
            <view
                v-for="day in calendar.days"
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
                                    <text v-else class="tag tag-success">已安排</text>
                                </view>
                            </view>
                        </template>
                        <template v-else>
                            <view class="slot-empty">
                                <text class="slot-empty-text">未排班</text>
                                <button class="primary-outline-btn" size="mini" @click="openAssignPopup(day, periodKey)">
                                    安排班次
                                </button>
                            </view>
                        </template>
                    </view>
                </view>
            </view>
        </view>

        <view class="notice">
            <uni-icons type="info" color="#909399" size="16"></uni-icons>
            <text>已安排的班次仅管理员可取消，如需调整请联系管理员。</text>
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
                    <text class="form-tip">请选择工作地点：</text>
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
    getScheduleLocations,
    getMyShiftCalendar,
    createMyShifts
} from '@/api/schedule.js';

const periodOrder = ['morning', 'afternoon'];
const periodLabels = {
    morning: '上午班',
    afternoon: '下午班'
};
const periodTimes = {
    morning: '08:30-12:30',
    afternoon: '14:00-18:00'
};

const calendar = ref(null);
const scheduleLocations = ref([]);
const assignPopup = ref(null);
const assignState = ref({
    day: null,
    period: 'morning',
    locationIndex: 0
});

const locationOptions = computed(() =>
    scheduleLocations.value.map((item) => ({
        uid: item.uid,
        name: item.name || '未命名地点'
    }))
);

const fetchLocations = async () => {
    try {
        const data = await getScheduleLocations();
        scheduleLocations.value = data || [];
    } catch (error) {
        console.error('加载地点失败:', error);
        uni.showToast({ title: '加载地点失败', icon: 'error' });
    }
};

const fetchCalendar = async () => {
    try {
        const data = await getMyShiftCalendar({ days: 14 });
        calendar.value = data;
    } catch (error) {
        console.error('加载排班失败:', error);
        uni.showToast({ title: '加载排班失败', icon: 'error' });
    }
};

onMounted(async () => {
    await Promise.all([fetchLocations(), fetchCalendar()]);
});

const openAssignPopup = (day, period) => {
    if (!locationOptions.value.length) {
        uni.showToast({ title: '暂无可用地点', icon: 'none' });
        return;
    }
    assignState.value = {
        day,
        period,
        locationIndex: 0
    };
    assignPopup.value?.open();
};

const closeAssignPopup = () => {
    assignPopup.value?.close();
};

const handleAssignLocationChange = (event) => {
    assignState.value.locationIndex = Number(event.detail.value);
};

const handleAssignConfirm = async () => {
    const day = assignState.value.day;
    const period = assignState.value.period;
    const location = locationOptions.value[assignState.value.locationIndex];
    if (!day || !period || !location) {
        uni.showToast({ title: '信息不完整', icon: 'none' });
        return;
    }
    try {
        await createMyShifts([
            {
                date: day.date,
                period,
                location_uid: location.uid
            }
        ]);
        uni.showToast({ title: '安排成功', icon: 'success' });
        closeAssignPopup();
        await fetchCalendar();
    } catch (error) {
        console.error('安排排班失败:', error);
        uni.showToast({ title: error.data?.detail || '操作失败', icon: 'error' });
    }
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
.tech-schedule-container {
    padding: 20px 16px 40px;
}

.hero {
    margin-bottom: 16px;
}

.title {
    font-size: 20px;
    font-weight: 600;
}

.subtitle {
    display: block;
    font-size: 13px;
    color: #888888;
    margin-top: 6px;
}

.calendar-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.calendar-card {
    background-color: #ffffff;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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

.tag {
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 4px;
}

.tag-info {
    background-color: #ecf5ff;
    color: #409eff;
}

.tag-success {
    background-color: #f0f9eb;
    color: #67c23a;
}

.notice {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 20px;
    font-size: 13px;
    color: #909399;
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

.form-tip {
    font-size: 14px;
    color: #666666;
}

.selector {
    padding: 8px 12px;
    border: 1px solid #dddddd;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #ffffff;
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
