<template>
    <view class="quick-scheduling-container" v-if="isAdmin">
        <view class="page-header">
            <view>
                <text class="title">快速排班</text>
                <text class="subtitle">选择技师后，勾选上午/下午班次并批量提交</text>
            </view>
            <button class="secondary-btn" size="mini" @click="navigateBack">
                返回排班
            </button>
        </view>

        <view class="control-panel">
            <view class="control-group">
                <text class="label">目标技师</text>
                <picker
                    mode="selector"
                    :range="technicianOptions"
                    range-key="nickname"
                    :value="technicianPickerIndex"
                    @change="handleTechnicianChange"
                >
                    <view class="selector">
                        {{ technicianOptions[technicianPickerIndex]?.nickname || '选择技师' }}
                        <uni-icons type="bottom" size="14" color="#666"></uni-icons>
                    </view>
                </picker>
            </view>
            <view class="control-group" v-if="locationOptions.length">
                <text class="label">新班次默认地点</text>
                <picker
                    mode="selector"
                    :range="locationOptions"
                    range-key="name"
                    :value="defaultLocationIndex"
                    @change="handleDefaultLocationChange"
                >
                    <view class="selector">
                        {{ resolveLocationName(defaultLocationUid) || '请选择地点' }}
                        <uni-icons type="bottom" size="14" color="#666"></uni-icons>
                    </view>
                </picker>
            </view>
            <view class="control-buttons">
                <button class="secondary-btn" size="mini" @click="resetToCalendar">恢复数据</button>
                <button class="primary-outline-btn" size="mini" @click="applyDefaultTemplate">应用模板</button>
            </view>
        </view>

        <view class="board-table" v-if="plannerDays.length">
            <view class="board-header">
                <view class="board-date-col">日期</view>
                <view class="board-slot-col">上午</view>
                <view class="board-slot-col">下午</view>
            </view>
            <view
                class="board-row"
                v-for="(day, dayIndex) in plannerDays"
                :key="day.date"
            >
                <view class="board-date-col">
                    <text class="date-text">{{ day.date }}</text>
                    <text class="weekday-text">{{ day.weekday }}</text>
                </view>
                    <view
                        class="board-slot-col"
                        v-for="periodKey in periodOrder"
                        :key="periodKey"
                    >
                        <view
                            class="slot-card"
                            :class="{
                                'has-bookings': day.slots[periodKey].hasBookings && day.slots[periodKey].originalChecked,
                                'is-changed': day.slots[periodKey].checked !== day.slots[periodKey].originalChecked
                            }"
                        >
                            <checkbox-group
                                @change="(event) => handleSlotToggle(dayIndex, periodKey, event)"
                            >
                                <label class="slot-checkbox-label">
                                    <checkbox
                                        :value="periodKey"
                                        :checked="day.slots[periodKey].checked"
                                    />
                                    <text>{{ periodLabels[periodKey] }}</text>
                                </label>
                            </checkbox-group>
                            <view
                                class="slot-location"
                                @click="() => changeSlotLocation(day.slots[periodKey])"
                                :class="{ 'is-actionable': day.slots[periodKey].checked }"
                            >
                                <uni-icons type="location-filled" size="14" color="#909399"></uni-icons>
                                <text>{{ resolveLocationName(day.slots[periodKey].locationUid) || '请选择地点' }}</text>
                            </view>
                            <text
                                v-if="day.slots[periodKey].hasBookings && day.slots[periodKey].originalChecked"
                                class="slot-hint warning"
                            >
                                已有预约
                            </text>
                        </view>
                    </view>
            </view>
        </view>

        <view class="board-empty" v-else>
            <text>暂无排班数据</text>
        </view>

        <view class="footer-bar">
            <button
                class="primary-btn"
                :disabled="!hasChanges || isSubmitting"
                :loading="isSubmitting"
                @click="handleSubmit"
            >
                确认提交
            </button>
        </view>
    </view>
    <view class="not-allowed" v-else>
        <uni-icons type="closeempty" size="48" color="#c0c4cc"></uni-icons>
        <text>仅管理员可访问快速排班</text>
    </view>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useUserStore } from '@/store/user.js';
import {
    getTechnicians,
    getTechnicianShiftCalendar,
    bulkCreateShifts,
    cancelShift
} from '@/api/admin.js';

const props = defineProps({
    initialTechnicianUid: {
        type: String,
        default: ''
    }
});

const userStore = useUserStore();
const isAdmin = computed(() => userStore.userRole === 'admin');

const periodOrder = ['morning', 'afternoon'];
const periodLabels = {
    morning: '上午',
    afternoon: '下午'
};

const plannerDays = ref([]);
const technicianOptions = ref([]);
const technicianPickerIndex = ref(0);
const activeTechnicianUid = ref('');
const activeTechnicianName = ref('');

const locationOptions = ref([]);
const defaultLocationUid = ref('');
const isSubmitting = ref(false);
const planningDays = 14;

const defaultLocationIndex = computed(() => {
    if (!defaultLocationUid.value) {
        return 0;
    }
    const index = locationOptions.value.findIndex((item) => item.uid === defaultLocationUid.value);
    return index >= 0 ? index : 0;
});

const hasChanges = computed(() => plannerDays.value.some((day) =>
    periodOrder.some((periodKey) => {
        const slot = day.slots[periodKey];
        return slot.checked !== slot.originalChecked ||
            (slot.checked && !slot.originalChecked && !slot.locationUid);
    })
));

const resolveLocationName = (uid) => {
    const found = locationOptions.value.find((item) => item.uid === uid);
    return found?.name || '';
};

const fetchTechnicians = async () => {
    try {
        const list = await getTechnicians();
        technicianOptions.value = list.map((item) => ({
            uid: item.uid,
            nickname: item.nickname || item.phone || '未命名技师'
        }));
        if (!technicianOptions.value.length) {
            uni.showToast({ title: '暂无技师数据', icon: 'none' });
        }
    } catch (error) {
        console.error('加载技师列表失败:', error);
        uni.showToast({ title: '加载技师列表失败', icon: 'error' });
    }
};

const buildPlannerFromCalendar = (calendar) => {
    locationOptions.value = (calendar?.locations || []).map((item) => ({
        uid: item.uid,
        name: item.name || '未命名地点'
    }));
    if (locationOptions.value.length) {
        const exists = locationOptions.value.some((item) => item.uid === defaultLocationUid.value);
        if (!exists) {
            defaultLocationUid.value = locationOptions.value[0].uid;
        }
    }

    const days = calendar?.days || [];
    plannerDays.value = days.map((day) => {
        const dayObj = {
            date: day.date,
            weekday: day.weekday,
            slots: {}
        };
        periodOrder.forEach((periodKey) => {
            const slotData = day[periodKey] || {};
            dayObj.slots[periodKey] = reactive({
                date: day.date,
                period: periodKey,
                checked: !!slotData.is_active,
                originalChecked: !!slotData.is_active,
                shiftUid: slotData.shift_uid || null,
                locationUid: slotData.location_uid || '',
                hasBookings: !!slotData.has_bookings
            });
        });
        return dayObj;
    });
};

const loadCalendar = async () => {
    if (!activeTechnicianUid.value) {
        plannerDays.value = [];
        return;
    }
    try {
        const calendar = await getTechnicianShiftCalendar(activeTechnicianUid.value, { days: planningDays });
        buildPlannerFromCalendar(calendar);
    } catch (error) {
        console.error('加载排班失败:', error);
        uni.showToast({ title: '加载排班失败', icon: 'error' });
    }
};

const resetToCalendar = () => {
    loadCalendar();
};

const applyDefaultTemplate = () => {
    const workdays = new Set(['周二', '周三', '周四', '周五', '周六']);
    plannerDays.value.forEach((day) => {
        const isWorkDay = workdays.has(day.weekday);
        periodOrder.forEach((periodKey) => {
            const slot = day.slots[periodKey];
            if (slot.originalChecked && slot.hasBookings) {
                // keep booked slots checked
                slot.checked = true;
            } else {
                slot.checked = isWorkDay;
            }
            if (slot.checked && !slot.locationUid) {
                slot.locationUid = defaultLocationUid.value || locationOptions.value[0]?.uid || '';
            }
        });
    });
};

const handleSlotToggle = (dayIndex, periodKey, event) => {
    const slot = plannerDays.value[dayIndex].slots[periodKey];
    const values = event.detail?.value || [];
    const nextChecked = values.includes(periodKey);

    if (slot.hasBookings && slot.originalChecked && !nextChecked) {
        uni.showModal({
            title: '确认取消班次',
            content: '该班次已有预约，取消后需手动通知相关客户。确定继续吗？',
            success: (res) => {
                if (res.confirm) {
                    slot.checked = false;
                } else {
                    slot.checked = true;
                }
            }
        });
        return;
    }

    slot.checked = nextChecked;
    if (slot.checked && !slot.locationUid) {
        slot.locationUid = defaultLocationUid.value || locationOptions.value[0]?.uid || '';
    }
};

const changeSlotLocation = async (slot) => {
    if (!slot.checked) {
        return;
    }
    if (!locationOptions.value.length) {
        uni.showToast({ title: '请先维护地点', icon: 'none' });
        return;
    }
    try {
        const result = await uni.showActionSheet({
            itemList: locationOptions.value.map((item) => item.name || '未命名地点')
        });
        const option = locationOptions.value[result.tapIndex];
        if (option) {
            slot.locationUid = option.uid;
        }
    } catch (error) {
        // 用户取消无需处理
    }
};

const handleDefaultLocationChange = (event) => {
    const index = Number(event.detail?.value);
    const option = locationOptions.value[index];
    if (option) {
        defaultLocationUid.value = option.uid;
    }
};

const handleTechnicianChange = (event) => {
    technicianPickerIndex.value = Number(event.detail?.value);
    const option = technicianOptions.value[technicianPickerIndex.value];
    if (option) {
        activeTechnicianUid.value = option.uid;
        activeTechnicianName.value = option.nickname;
        loadCalendar();
    }
};

const computeChanges = () => {
    const additions = [];
    const removals = [];

    plannerDays.value.forEach((day) => {
        periodOrder.forEach((periodKey) => {
            const slot = day.slots[periodKey];
            if (slot.checked && !slot.originalChecked) {
                additions.push({
                    date: day.date,
                    period: periodKey,
                    location_uid: slot.locationUid
                });
            }
            if (slot.originalChecked && !slot.checked && slot.shiftUid) {
                removals.push(slot.shiftUid);
            }
        });
    });

    return { additions, removals };
};

const handleSubmit = async () => {
    if (!hasChanges.value || isSubmitting.value) {
        return;
    }
    const { additions, removals } = computeChanges();

    if (additions.some((item) => !item.location_uid)) {
        uni.showToast({ title: '请为新班次选择地点', icon: 'none' });
        return;
    }

    if (!additions.length && !removals.length) {
        uni.showToast({ title: '没有需要提交的调整', icon: 'none' });
        return;
    }

    const confirmRes = await uni.showModal({
        title: '确认批量排班',
        content: `技师：${activeTechnicianName.value}\n新增班次 ${additions.length} 个，取消班次 ${removals.length} 个`,
        confirmColor: '#007AFF'
    });
    if (!confirmRes.confirm) {
        return;
    }

    isSubmitting.value = true;
    try {
        if (additions.length) {
            await bulkCreateShifts(activeTechnicianUid.value, { items: additions }, { days: planningDays });
        }
        for (const shiftUid of removals) {
            await cancelShift(shiftUid);
        }
        uni.showToast({ title: '排班已更新', icon: 'success' });
        await loadCalendar();
    } catch (error) {
        console.error('提交快速排班失败:', error);
        const detail = error?.data?.detail || '提交失败，请稍后重试';
        uni.showToast({ title: detail, icon: 'error' });
    } finally {
        isSubmitting.value = false;
    }
};

const navigateBack = () => {
    uni.navigateBack();
};

watch(() => props.initialTechnicianUid, (newVal) => {
    if (!technicianOptions.value.length) {
        return;
    }
    if (!newVal) {
        return;
    }
    const index = technicianOptions.value.findIndex((item) => item.uid === newVal);
    if (index >= 0) {
        technicianPickerIndex.value = index;
        activeTechnicianUid.value = technicianOptions.value[index].uid;
        activeTechnicianName.value = technicianOptions.value[index].nickname;
        loadCalendar();
    }
});

onMounted(async () => {
    if (!isAdmin.value) {
        return;
    }
    await fetchTechnicians();
    if (!technicianOptions.value.length) {
        return;
    }
    const initialIndex = props.initialTechnicianUid
        ? technicianOptions.value.findIndex((item) => item.uid === props.initialTechnicianUid)
        : 0;
    technicianPickerIndex.value = initialIndex >= 0 ? initialIndex : 0;
    const option = technicianOptions.value[technicianPickerIndex.value];
    activeTechnicianUid.value = option?.uid || '';
    activeTechnicianName.value = option?.nickname || '';
    await loadCalendar();
});
</script>

<style scoped>
.quick-scheduling-container {
    padding: 16px;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
}

.title {
    font-size: 20px;
    font-weight: 600;
}

.subtitle {
    display: block;
    font-size: 13px;
    color: #8f9399;
    margin-top: 4px;
}

.control-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
}

.control-group {
    display: flex;
    align-items: center;
    gap: 10px;
}

.label {
    font-size: 14px;
    color: #666666;
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

.control-buttons {
    display: flex;
    gap: 10px;
}

.board-table {
    border: 1px solid #f0f0f0;
    border-radius: 10px;
    overflow: hidden;
}

.board-header,
.board-row {
    display: flex;
    align-items: stretch;
}

.board-header {
    background-color: #f9fafc;
    font-size: 14px;
    font-weight: 600;
}

.board-date-col {
    flex: 1.2;
    padding: 14px 12px;
    border-right: 1px solid #f0f0f0;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.board-slot-col {
    flex: 1;
    padding: 12px;
    border-right: 1px solid #f0f0f0;
}

.board-row {
    border-bottom: 1px solid #f0f0f0;
}

.board-row:last-of-type {
    border-bottom: none;
}

.board-row:last-of-type .board-slot-col,
.board-row:last-of-type .board-date-col {
    border-bottom: none;
}

.date-text {
    font-size: 16px;
    font-weight: 600;
}

.weekday-text {
    font-size: 12px;
    color: #909399;
}

.slot-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px;
    border: 1px dashed #e5e5e5;
    border-radius: 8px;
    background-color: #ffffff;
    transition: border-color 0.2s ease, background-color 0.2s ease;
}

.slot-card.has-bookings {
    border-color: #f56c6c;
    background-color: #fef0f0;
}

.slot-card.is-changed {
    border-color: #409eff;
}

.slot-checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
}

.slot-location {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #606266;
}

.slot-location.is-actionable {
    color: #409eff;
}

.slot-hint {
    font-size: 12px;
    color: #909399;
}

.slot-hint.warning {
    color: #f56c6c;
}

.board-empty {
    padding: 40px 0;
    text-align: center;
    color: #909399;
}

.footer-bar {
    margin-top: 20px;
}

.not-allowed {
    padding: 60px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    color: #c0c4cc;
    font-size: 14px;
}
</style>
