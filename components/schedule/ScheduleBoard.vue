<template>
    <view class="schedule-board-container">
        <view class="top-bar">
            <view class="top-left">
                <text class="title">未来 {{ planningDays }} 天排班</text>
                <text class="subtitle">勾选上午/下午班次，确认后生效</text>
            </view>
            <view class="top-actions" v-if="isAdminView">
                <picker
                    mode="selector"
                    :range="technicianOptions"
                    range-key="nickname"
                    :value="technicianPickerIndex"
                    @change="handleTechnicianPicker"
                >
                    <view class="selector">
                        {{ technicianOptions[technicianPickerIndex]?.nickname || '选择技师' }}
                        <uni-icons type="bottom" size="14" color="#666"></uni-icons>
                    </view>
                </picker>
                <button class="secondary-btn" size="mini" @click="goQuickScheduling">
                    快速排班
                </button>
            </view>
        </view>

        <view class="settings-bar" v-if="locationOptions.length">
            <text class="settings-label">新班次默认地点</text>
            <picker
                mode="selector"
                :range="locationOptions"
                range-key="name"
                :value="defaultLocationIndex"
                @change="handleDefaultLocationChange"
            >
                <view class="selector selector-inline">
                    {{ resolveLocationName(defaultLocationUid) || '请选择地点' }}
                    <uni-icons type="bottom" size="14" color="#666"></uni-icons>
                </view>
            </picker>
        </view>

        <view class="board-table" v-if="boardDays.length">
            <view class="board-header">
                <view class="board-date-col">日期</view>
                <view class="board-slot-col">
                    <text>上午</text>
                </view>
                <view class="board-slot-col">
                    <text>下午</text>
                </view>
            </view>

            <view
                class="board-row"
                v-for="(day, dayIndex) in boardDays"
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
                                        :disabled="slotDisabled(day.slots[periodKey])"
                                    />
                                    <text>{{ periodLabels[periodKey] }}</text>
                                </label>
                            </checkbox-group>
                            <view
                                class="slot-location"
                                @click="() => changeSlotLocation(day.slots[periodKey])"
                                :class="{ 'is-actionable': canChangeLocation(day.slots[periodKey]) }"
                            >
                                <uni-icons type="location-filled" size="14" color="#909399"></uni-icons>
                                <text>{{ resolveLocationName(day.slots[periodKey].locationUid) || '请选择地点' }}</text>
                            </view>
                            <text
                                v-if="!isAdminView && day.slots[periodKey].originalChecked && day.slots[periodKey].hasBookings"
                                class="slot-hint"
                            >
                                已有预约，需联系管理员调整
                            </text>
                            <text
                                v-else-if="day.slots[periodKey].hasBookings && day.slots[periodKey].originalChecked"
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
import {
    getScheduleLocations,
    getMyShiftCalendar,
    createMyShifts
} from '@/api/schedule.js';

const planningDays = 14;
const periodOrder = ['morning', 'afternoon'];
const periodLabels = {
    morning: '上午',
    afternoon: '下午'
};

const userStore = useUserStore();
const userRole = computed(() => userStore.userRole);
const isAdminView = computed(() => userRole.value === 'admin');

const technicianOptions = ref([]);
const technicianPickerIndex = ref(0);
const activeTechnicianUid = ref('');
const activeTechnicianName = ref('');

const locationOptions = ref([]);
const defaultLocationUid = ref('');

const boardDays = ref([]);

const isLoading = ref(false);
const isSubmitting = ref(false);

const defaultLocationIndex = computed(() => {
    if (!defaultLocationUid.value) {
        return 0;
    }
    const index = locationOptions.value.findIndex((item) => item.uid === defaultLocationUid.value);
    return index >= 0 ? index : 0;
});

const hasChanges = computed(() => {
    return boardDays.value.some((day) =>
        periodOrder.some((periodKey) => {
            const slot = day.slots[periodKey];
            return slot.checked !== slot.originalChecked ||
                (slot.checked && !slot.originalChecked && !slot.locationUid) ||
                (slot.checked && slot.originalChecked && slot.locationUid !== slot.originalLocationUid);
        })
    );
});

const fetchTechnicians = async () => {
    if (!isAdminView.value) {
        technicianOptions.value = [];
        return;
    }
    try {
        const list = await getTechnicians();
        technicianOptions.value = list.map((item) => ({
            uid: item.uid,
            nickname: item.nickname || item.phone || '未命名技师'
        }));
    } catch (error) {
        console.error('加载技师列表失败:', error);
        uni.showToast({ title: '加载技师列表失败', icon: 'error' });
    }
};

const resolveLocationName = (uid) => {
    const found = locationOptions.value.find((item) => item.uid === uid);
    return found?.name || '';
};

const buildBoardFromCalendar = (calendar) => {
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
    boardDays.value = days.map((day) => {
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
                originalLocationUid: slotData.location_uid || '',
                hasBookings: !!slotData.has_bookings,
                lockedByAdmin: !!slotData.locked_by_admin
            });
        });
        return dayObj;
    });
};

const loadCalendarForTechnician = async () => {
    if (!activeTechnicianUid.value && isAdminView.value) {
        return;
    }
    isLoading.value = true;
    try {
        let calendar;
        if (isAdminView.value) {
            calendar = await getTechnicianShiftCalendar(activeTechnicianUid.value, { days: planningDays });
        } else {
            calendar = await getMyShiftCalendar({ days: planningDays });
        }

        buildBoardFromCalendar(calendar);
    } catch (error) {
        console.error('加载排班日历失败:', error);
        uni.showToast({ title: '加载排班失败', icon: 'error' });
    } finally {
        isLoading.value = false;
    }
};

const initializeTechnician = () => {
    if (isAdminView.value) {
        const option = technicianOptions.value[technicianPickerIndex.value];
        if (option) {
            activeTechnicianUid.value = option.uid;
            activeTechnicianName.value = option.nickname;
        }
    } else {
        activeTechnicianUid.value = userStore.userInfo?.uid || '';
        activeTechnicianName.value = userStore.userInfo?.nickname || '我';
    }
};

const slotDisabled = (slot) => {
    if (isAdminView.value) {
        return false;
    }
    return slot.originalChecked && slot.shiftUid !== null;
};

const handleSlotToggle = (dayIndex, periodKey, event) => {
    const slot = boardDays.value[dayIndex].slots[periodKey];
    const values = event.detail?.value || [];
    const nextChecked = values.includes(periodKey);

    if (!isAdminView.value && slot.originalChecked && !nextChecked) {
        uni.showToast({ title: '已有排班不可取消，请联系管理员', icon: 'none' });
        slot.checked = true;
        return;
    }

    if (slot.hasBookings && slot.originalChecked && !nextChecked && isAdminView.value) {
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

const canChangeLocation = (slot) => {
    if (!slot.checked) {
        return false;
    }
    if (!locationOptions.value.length) {
        return false;
    }
    if (slot.originalChecked && !isAdminView.value) {
        return false;
    }
    return true;
};

const changeSlotLocation = async (slot) => {
    if (!canChangeLocation(slot)) {
        return;
    }

    try {
        const result = await uni.showActionSheet({
            itemList: locationOptions.value.map((item) => item.name || '未命名地点')
        });
        const target = locationOptions.value[result.tapIndex];
        if (target) {
            slot.locationUid = target.uid;
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

const computeChanges = () => {
    const additions = [];
    const removals = [];

    boardDays.value.forEach((day) => {
        periodOrder.forEach((periodKey) => {
            const slot = day.slots[periodKey];
            const locationChanged = slot.checked && slot.originalChecked && slot.locationUid !== slot.originalLocationUid;
            if (slot.checked && !slot.originalChecked) {
                additions.push({
                    date: day.date,
                    period: periodKey,
                    location_uid: slot.locationUid
                });
            }
            if (locationChanged) {
                additions.push({
                    date: day.date,
                    period: periodKey,
                    location_uid: slot.locationUid
                });
            }
            if (slot.shiftUid && ((slot.originalChecked && !slot.checked) || locationChanged)) {
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

    const warningLines = [];
    if (isAdminView.value) {
        warningLines.push(`技师：${activeTechnicianName.value || '未知'}`);
    }
    if (additions.length) {
        warningLines.push(`新增班次：${additions.length} 个`);
    }
    if (isAdminView.value && removals.length) {
        warningLines.push(`取消班次：${removals.length} 个`);
    }

    const modalContent = warningLines.join('\n') || '确认提交排班调整吗？';
    const modalTitle = isAdminView.value ? '确认修改他人排班' : '确认我的排班';

    const confirmRes = await uni.showModal({
        title: modalTitle,
        content: modalContent,
        confirmColor: '#007AFF'
    });

    if (!confirmRes.confirm) {
        return;
    }

    isSubmitting.value = true;

    try {
        if (additions.length) {
            if (isAdminView.value) {
                await bulkCreateShifts(activeTechnicianUid.value, { items: additions }, { days: planningDays });
            } else {
                await createMyShifts(additions);
            }
        }

        if (isAdminView.value && removals.length) {
            for (const shiftUid of removals) {
                await cancelShift(shiftUid);
            }
        }

        uni.showToast({ title: '排班已更新', icon: 'success' });
        await loadCalendarForTechnician();
    } catch (error) {
        console.error('提交排班调整失败:', error);
        const detail = error?.data?.detail || '提交失败，请稍后重试';
        uni.showToast({ title: detail, icon: 'error' });
    } finally {
        isSubmitting.value = false;
    }
};

const handleTechnicianPicker = (event) => {
    technicianPickerIndex.value = Number(event.detail?.value);
    const option = technicianOptions.value[technicianPickerIndex.value];
    if (option) {
        activeTechnicianUid.value = option.uid;
        activeTechnicianName.value = option.nickname;
        loadCalendarForTechnician();
    }
};

const goQuickScheduling = () => {
    if (!isAdminView.value) {
        return;
    }
    const targetUid = activeTechnicianUid.value || '';
    uni.navigateTo({
        url: targetUid ? `/pages/admin/quick-scheduling?technicianUid=${targetUid}` : '/pages/admin/quick-scheduling'
    });
};

const bootstrap = async () => {
    await fetchTechnicians();
    initializeTechnician();
    await loadCalendarForTechnician();
    if (!isAdminView.value && !locationOptions.value.length) {
        try {
            const locations = await getScheduleLocations();
            locationOptions.value = locations.map((item) => ({
                uid: item.uid,
                name: item.name || '未命名地点'
            }));
            if (locationOptions.value.length) {
                defaultLocationUid.value = locationOptions.value[0].uid;
            }
        } catch (error) {
            console.error('加载可选地点失败:', error);
        }
    }
};

onMounted(async () => {
    await bootstrap();
});

watch(userRole, async () => {
    technicianOptions.value = [];
    technicianPickerIndex.value = 0;
    activeTechnicianUid.value = '';
    activeTechnicianName.value = '';
    defaultLocationUid.value = '';
    locationOptions.value = [];
    boardDays.value = [];
    await bootstrap();
});
</script>

<style scoped>
.schedule-board-container {
    padding: 16px;
}

.top-bar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
}

.top-left .title {
    font-size: 20px;
    font-weight: 600;
}

.subtitle {
    display: block;
    font-size: 13px;
    color: #8f9399;
    margin-top: 4px;
}

.top-actions {
    display: flex;
    gap: 10px;
    align-items: center;
}

.selector {
    min-width: 150px;
    padding: 8px 12px;
    border: 1px solid #dddddd;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #ffffff;
}

.selector-inline {
    min-width: 180px;
}

.settings-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
}

.settings-label {
    font-size: 14px;
    color: #666666;
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

.board-row:last-of-type .board-slot-col,
.board-row:last-of-type .board-date-col {
    border-bottom: none;
}

.board-row {
    border-bottom: 1px solid #f0f0f0;
}

.board-row:last-of-type {
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
</style>
