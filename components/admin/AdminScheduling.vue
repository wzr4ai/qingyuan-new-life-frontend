<template>
    <view class="admin-page-container">
        <view class="header">
            <view>
                <text class="title">排班管理</text>
                <text class="subtitle">可批量勾选上午/下午班次，也能在下方日历中逐条微调。</text>
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

        <view v-if="technicianList.length" class="quick-planner-card">
            <view class="quick-header">
                <view>
                    <text class="quick-title">快速排班</text>
                    <text class="quick-desc">批量选择班次并一键提交，支持应用默认模板。</text>
                </view>
                <view class="quick-actions">
                    <button class="secondary-btn" size="mini" @click="resetQuickPlanner">清空选择</button>
                    <button class="primary-outline-btn" size="mini" @click="applyDefaultTemplate">应用模板</button>
                </view>
            </view>

            <view class="quick-controls">
                <view class="control-block">
                    <text class="control-label">适用地点</text>
                    <picker
                        mode="selector"
                        :range="locationOptions"
                        range-key="name"
                        @change="handleQuickLocationChange"
                        :value="quickLocationIndex"
                    >
                        <view class="selector selector-inline">
                            {{ resolveLocationName(selectedLocationUid) || '请选择地点' }}
                            <uni-icons type="bottom" size="14" color="#666"></uni-icons>
                        </view>
                    </picker>
                </view>
                <view class="control-block">
                    <text class="control-label">选择技师</text>
                    <checkbox-group class="tech-checkbox-group" @change="handleTechnicianCheckboxChange">
                        <label
                            v-for="tech in technicianList"
                            :key="tech.uid"
                            class="tech-checkbox-item"
                        >
                            <checkbox
                                :value="tech.uid"
                                :checked="selectedTechnicians.includes(tech.uid)"
                            />
                            <text class="tech-name">{{ tech.nickname || tech.phone || '未命名技师' }}</text>
                        </label>
                    </checkbox-group>
                </view>
            </view>

            <view class="planner-table">
                <view class="planner-row header">
                    <view class="planner-date">日期</view>
                    <view class="planner-periods">
                        <text class="period-title">上午</text>
                        <text class="period-title">下午</text>
                    </view>
                </view>
                <view
                    class="planner-row"
                    v-for="(plannerDay, index) in quickPlannerDays"
                    :key="plannerDay.date"
                >
                    <view class="planner-date">
                        <text class="date-text">{{ formatDate(plannerDay.date) }}</text>
                        <text class="weekday-text">{{ plannerDay.weekday }}</text>
                    </view>
                    <checkbox-group class="planner-periods" @change="onQuickPeriodChange(index, $event)">
                        <label class="period-label">
                            <checkbox value="morning" :checked="plannerDay.morning" />
                            <text>上午</text>
                        </label>
                        <label class="period-label">
                            <checkbox value="afternoon" :checked="plannerDay.afternoon" />
                            <text>下午</text>
                        </label>
                    </checkbox-group>
                </view>
            </view>

            <view class="quick-footer">
                <button
                    class="primary-btn"
                    :loading="quickSubmitLoading"
                    @click="handleQuickSubmit"
                >
                    提交批量排班
                </button>
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
    getTechnicianShiftCalendar,
    bulkCreateShifts
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

const planningDays = 14;
const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const selectedTechnicians = ref([]);
const selectedLocationUid = ref('');
const quickSubmitLoading = ref(false);

const formatDateKey = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const generateQuickPlannerDays = () => {
    const today = new Date();
    const days = [];
    for (let index = 0; index < planningDays; index += 1) {
        const current = new Date(today);
        current.setDate(today.getDate() + index);
        days.push({
            date: formatDateKey(current),
            weekday: weekdayNames[current.getDay()],
            morning: false,
            afternoon: false
        });
    }
    return days;
};

const technicianList = ref([]);
const locationList = ref([]);
const calendar = ref(null);
const technicianIndex = ref(0);

const quickPlannerDays = ref(generateQuickPlannerDays());

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

const quickLocationIndex = computed(() => {
    if (!selectedLocationUid.value) {
        return 0;
    }
    const index = locationList.value.findIndex((item) => item.uid === selectedLocationUid.value);
    return index >= 0 ? index : 0;
});

const selectedTechnician = computed(() => technicianList.value[technicianIndex.value] || null);

const ensureTechnicianSelected = (uid) => {
    if (!uid) {
        return;
    }
    if (!selectedTechnicians.value.includes(uid)) {
        selectedTechnicians.value = Array.from(new Set([...selectedTechnicians.value, uid]));
    }
};

const applyDefaultTemplate = () => {
    const workdays = new Set(['周二', '周三', '周四', '周五', '周六']);
    const refreshed = generateQuickPlannerDays().map((day) => {
        const isWorkDay = workdays.has(day.weekday);
        return {
            ...day,
            morning: isWorkDay,
            afternoon: isWorkDay
        };
    });
    quickPlannerDays.value = refreshed;
};

const resetQuickPlanner = () => {
    quickPlannerDays.value = generateQuickPlannerDays();
};

const handleTechnicianCheckboxChange = (event) => {
    const values = event.detail?.value ? [...event.detail.value] : [];
    const currentUid = selectedTechnician.value?.uid;
    if (currentUid && !values.includes(currentUid)) {
        values.push(currentUid);
    }
    selectedTechnicians.value = values;
};

const handleQuickLocationChange = (event) => {
    const index = Number(event.detail.value);
    const option = locationList.value[index];
    if (option) {
        selectedLocationUid.value = option.uid;
    }
};

const onQuickPeriodChange = (index, event) => {
    const target = quickPlannerDays.value[index];
    if (!target) {
        return;
    }
    const values = event.detail?.value || [];
    target.morning = values.includes('morning');
    target.afternoon = values.includes('afternoon');
};

const handleQuickSubmit = async () => {
    if (!selectedTechnicians.value.length) {
        uni.showToast({ title: '请先选择技师', icon: 'none' });
        return;
    }

    if (!selectedLocationUid.value) {
        uni.showToast({ title: '请先选择地点', icon: 'none' });
        return;
    }

    const items = [];
    quickPlannerDays.value.forEach((day) => {
        if (day.morning) {
            items.push({
                date: day.date,
                period: 'morning',
                location_uid: selectedLocationUid.value
            });
        }
        if (day.afternoon) {
            items.push({
                date: day.date,
                period: 'afternoon',
                location_uid: selectedLocationUid.value
            });
        }
    });

    if (!items.length) {
        uni.showToast({ title: '请选择需要排班的时间段', icon: 'none' });
        return;
    }

    quickSubmitLoading.value = true;
    try {
        for (const techUid of selectedTechnicians.value) {
            const calendarData = await bulkCreateShifts(techUid, { items }, { days: planningDays });
            if (selectedTechnician.value && techUid === selectedTechnician.value.uid) {
                calendar.value = calendarData;
            }
        }
        uni.showToast({ title: '排班已更新', icon: 'success' });
        resetQuickPlanner();
        await fetchCalendar();
    } catch (error) {
        console.error('批量排班失败:', error);
        uni.showToast({ title: error.data?.detail || '批量排班失败', icon: 'error' });
    } finally {
        quickSubmitLoading.value = false;
    }
};

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

        const validTechnicianUids = new Set(technicianList.value.map((item) => item.uid));
        selectedTechnicians.value = selectedTechnicians.value.filter((uid) => validTechnicianUids.has(uid));

        if (locationList.value.length) {
            if (!selectedLocationUid.value || !locationList.value.some((item) => item.uid === selectedLocationUid.value)) {
                selectedLocationUid.value = locationList.value[0].uid;
            }
        } else {
            selectedLocationUid.value = '';
        }

        if (technicianList.value.length === 0) {
            selectedTechnicians.value = [];
        } else {
            if (technicianIndex.value >= technicianList.value.length) {
                technicianIndex.value = 0;
            }
            const current = technicianList.value[technicianIndex.value];
            ensureTechnicianSelected(current?.uid);
        }

        resetQuickPlanner();
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
        const data = await getTechnicianShiftCalendar(selectedTechnician.value.uid, { days: planningDays });
        calendar.value = data;
        ensureTechnicianSelected(selectedTechnician.value?.uid);
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
    const tech = technicianList.value[technicianIndex.value];
    ensureTechnicianSelected(tech?.uid);
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

.quick-planner-card {
    margin-top: 16px;
    padding: 16px;
    border-radius: 12px;
    background-color: #ffffff;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.quick-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
}

.quick-title {
    font-size: 18px;
    font-weight: 600;
}

.quick-desc {
    display: block;
    font-size: 13px;
    color: #888888;
    margin-top: 4px;
}

.quick-actions {
    display: flex;
    gap: 8px;
}

.quick-controls {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.control-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.control-label {
    font-size: 14px;
    color: #666666;
}

.tech-checkbox-group {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.tech-checkbox-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border: 1px dashed #dcdfe6;
    border-radius: 6px;
}

.tech-name {
    font-size: 14px;
}

.planner-table {
    border: 1px solid #f0f0f0;
    border-radius: 10px;
    overflow: hidden;
}

.planner-row {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid #f0f0f0;
}

.planner-row:last-of-type {
    border-bottom: none;
}

.planner-row.header {
    background-color: #f9fafc;
    font-size: 14px;
    font-weight: 600;
}

.planner-date {
    flex: 1.2;
    padding: 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
}

.planner-periods {
    flex: 1.8;
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 12px;
    gap: 12px;
}

.period-title {
    flex: 1;
    text-align: center;
}

.period-label {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 14px;
}

.period-label checkbox {
    transform: scale(0.9);
}

.date-text {
    font-size: 15px;
    font-weight: 600;
}

.weekday-text {
    font-size: 12px;
    color: #909399;
}

.quick-footer {
    display: flex;
    justify-content: flex-end;
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
