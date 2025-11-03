<template>
    <scroll-view class="booking-container" scroll-y>
        <view class="section">
            <view class="section-header">
                <text class="section-title">选择地点</text>
            </view>
            <picker
                mode="selector"
                :range="locationOptions"
                range-key="name"
                :value="selectedLocationIndex"
                @change="handleLocationChange"
            >
                <view class="selector">
                    {{ currentLocation?.name || '请选择地点' }}
                    <uni-icons type="bottom" size="14" color="#666"></uni-icons>
                </view>
            </picker>
        </view>

        <view class="section" v-if="dateOptions.length">
            <view class="section-header">
                <text class="section-title">选择日期</text>
            </view>
            <scroll-view class="date-scroll" scroll-x>
                <view
                    v-for="item in dateOptions"
                    :key="item.date"
                    class="date-chip"
                    :class="{
                        active: item.date === selectedDate,
                        disabled: !item.hasShift
                    }"
                    @click="() => handleDateSelect(item)"
                >
                    <text class="date-text">{{ item.display }}</text>
                    <text class="weekday-text">{{ item.weekday }}</text>
                </view>
            </scroll-view>
        </view>

        <view class="section">
            <view class="section-header">
                <text class="section-title">选择服务</text>
            </view>
            <view class="service-list">
                <checkbox-group @change="handleServiceChange">
                    <label
                        v-for="service in serviceOptions"
                        :key="service.uid"
                        class="service-item"
                        :class="{ disabled: !service.is_active }"
                    >
                        <checkbox
                            :value="service.uid"
                            :checked="selectedServiceUids.includes(service.uid)"
                            :disabled="!service.is_active"
                        />
                        <view class="service-info">
                            <text class="service-name">{{ service.name }}</text>
                            <text class="service-meta">技师 {{ service.technician_duration }} 分钟 · 房间 {{ service.room_duration }} 分钟</text>
                        </view>
                    </label>
                </checkbox-group>
            </view>
        </view>

        <view class="section" v-if="showOrderControls">
            <view class="section-header">
                <text class="section-title">服务顺序</text>
            </view>
            <radio-group @change="handleServiceOrderChange">
                <label class="radio-item">
                    <radio value="default" :checked="serviceOrderMode === 'default'" />
                    <text>{{ orderOptionDefault }}</text>
                </label>
                <label class="radio-item">
                    <radio value="reverse" :checked="serviceOrderMode === 'reverse'" />
                    <text>{{ orderOptionReverse }}</text>
                </label>
            </radio-group>
        </view>

        <view class="section" v-if="technicianOptionsView.length">
            <view class="section-header">
                <text class="section-title">技师偏好</text>
            </view>
            <radio-group @change="handleTechnicianPreference">
                <label class="radio-item">
                    <radio value="any" :checked="preferredTechnicianUid === 'any'" />
                    <text>任何人</text>
                </label>
                <label
                    v-for="tech in technicianOptionsView"
                    :key="tech.uid"
                    class="radio-item"
                    :class="{ disabled: !tech.is_available }"
                >
                    <radio
                        :value="tech.uid"
                        :checked="preferredTechnicianUid === tech.uid"
                        :disabled="!tech.is_available"
                    />
                    <text>{{ tech.nickname || tech.phone || '未命名技师' }}</text>
                    <text v-if="tech.disabled_reason" class="radio-hint">{{ tech.disabled_reason }}</text>
                </label>
            </radio-group>
        </view>

        <view class="section">
            <view class="section-header">
                <text class="section-title">预约人</text>
                <button class="link-btn" size="mini" @click="handleAddAttendee">添加</button>
            </view>
            <radio-group @change="handleAttendeeChange">
                <label
                    v-for="attendee in attendees"
                    :key="attendee.id"
                    class="radio-item"
                >
                    <radio :value="attendee.id" :checked="selectedAttendeeId === attendee.id" />
                    <text>{{ attendee.label }}</text>
                </label>
            </radio-group>
        </view>

        <view class="section">
            <button
                class="primary-btn"
                :disabled="!canQuery || isQuerying"
                :loading="isQuerying"
                @click="handleQueryTimes"
            >
                查看可用时段
            </button>
        </view>

        <view class="section" v-if="cartItems.length">
            <view class="section-header">
                <text class="section-title">已选预约</text>
            </view>
            <view class="cart-preview">
                <view
                    v-for="item in cartItems"
                    :key="item.id"
                    class="cart-item"
                >
                    <view class="cart-item-header">
                        <text class="cart-appointment-person">{{ item.attendee.label }}</text>
                        <text class="cart-time">{{ item.date }} {{ item.displayTime }}</text>
                    </view>
                    <view class="cart-detail-line">地点：{{ item.locationName }}</view>
                    <view class="cart-detail-line">服务：{{ item.services.map((s) => s.name).join('，') }}</view>
                    <view class="cart-detail-line" v-if="item.technician">技师：{{ item.technician.nickname || item.technician.phone || item.technician.uid }}</view>
                    <view class="cart-detail-line" v-if="item.resource">资源：{{ item.resource.name }}</view>
                    <view class="cart-countdown">剩余锁定 {{ formatCountdown(item.expiresAt - currentTick) }}</view>
                    <button class="link-btn" size="mini" @click="() => removeCartItem(item.id)">移除</button>
                </view>
            </view>
        </view>
    </scroll-view>

    <view v-if="cartSummary.count" class="cart-footer">
        <view class="summary">
            <text>已选 {{ cartSummary.count }} 项预约</text>
            <text class="countdown">锁定剩余 {{ cartSummary.countdown }}</text>
        </view>
        <button class="primary-btn" size="default" @click="goCheckout">去结算</button>
    </view>

    <uni-popup ref="timesPopup" type="bottom" background-color="#ffffff">
        <view class="times-popup">
            <view class="popup-header">
                <text>请选择开始时间</text>
                <uni-icons type="close" size="18" color="#666" @click="closeTimesPopup"></uni-icons>
            </view>
            <view v-if="availableSlots.length" class="times-grid">
                <button
                    v-for="slot in availableSlots"
                    :key="slot.start_time"
                    class="time-chip"
                    @click="() => handleSelectSlot(slot)"
                >
                    <text class="time-text">{{ formatSlotTime(slot.start_time) }}</text>
                    <text class="time-subtext" v-if="slot.technician">{{ slot.technician.nickname || slot.technician.phone || '技师' }}</text>
                </button>
            </view>
            <view v-else class="times-empty">
                <text>暂无符合条件的时间，请调整条件后重试。</text>
            </view>
        </view>
    </uni-popup>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
    getScheduleLocations,
    getLocationDays,
    getLocationServices,
    getLocationTechnicians,
    queryPackageAvailability
} from '@/api/schedule.js';
import { useBookingCartStore } from '@/store/bookingCart.js';

const cartStore = useBookingCartStore();

const locationOptions = ref([]);
const selectedLocationUid = ref('');
const dateOptions = ref([]);
const selectedDate = ref('');

const serviceOptions = ref([]);
const serviceOptionMap = computed(() => {
    const map = new Map();
    serviceOptions.value.forEach((service) => {
        map.set(service.uid, service);
    });
    return map;
});
const selectedServiceUids = ref([]);
const orderedServiceUids = ref([]);
const serviceOrderMode = ref('default');

const technicianOptions = ref([]);
const preferredTechnicianUid = ref('any');

const attendees = ref([
    { id: 'self', label: '本人', isSelf: true }
]);
const selectedAttendeeId = ref('self');

const availableSlots = ref([]);
const isQuerying = ref(false);
const timesPopup = ref(null);

const currentTick = ref(Date.now());
let countdownTimer = null;

const attendeesMap = computed(() => {
    const map = new Map();
    attendees.value.forEach((item) => {
        map.set(item.id, item);
    });
    return map;
});

const selectedLocationIndex = computed(() => {
    if (!selectedLocationUid.value) {
        return 0;
    }
    const index = locationOptions.value.findIndex((item) => item.uid === selectedLocationUid.value);
    return index >= 0 ? index : 0;
});

const currentLocation = computed(() => locationOptions.value[selectedLocationIndex.value]);

const showOrderControls = computed(() => selectedServiceUids.value.length === 2);

const orderOptionDefault = computed(() => {
    if (selectedServiceUids.value.length !== 2) {
        return '默认顺序';
    }
    const [first, second] = selectedServiceUids.value;
    return `${serviceOptionMap.value.get(first)?.name || '服务 A'} → ${serviceOptionMap.value.get(second)?.name || '服务 B'}`;
});

const orderOptionReverse = computed(() => {
    if (selectedServiceUids.value.length !== 2) {
        return '逆序';
    }
    const [first, second] = selectedServiceUids.value.slice().reverse();
    return `${serviceOptionMap.value.get(first)?.name || '服务 A'} → ${serviceOptionMap.value.get(second)?.name || '服务 B'}`;
});

const technicianOptionsView = computed(() => technicianOptions.value);

const canQuery = computed(() => {
    return Boolean(
        selectedLocationUid.value &&
        selectedDate.value &&
        selectedServiceUids.value.length > 0
    );
});

const cartItems = computed(() => {
    currentTick.value; // ensure countdown updates reactively
    return cartStore.activeItems.map((item) => ({
        ...item,
        displayTime: formatSlotTime(item.startTimeISO)
    }));
});

const cartSummary = computed(() => {
    const count = cartItems.value.length;
    let minRemaining = Infinity;
    cartItems.value.forEach((item) => {
        minRemaining = Math.min(minRemaining, Math.max(item.expiresAt - currentTick.value, 0));
    });
    if (!count || !isFinite(minRemaining)) {
        minRemaining = 0;
    }
    const countdown = formatCountdown(minRemaining);
    return { count, countdown };
});

const calculatePackageDurations = () => {
    const serviceOrder = orderedServiceUids.value.length ? orderedServiceUids.value : selectedServiceUids.value;
    let technicianTotal = 0;
    let roomTotal = 0;
    serviceOrder.forEach((uid) => {
        const service = serviceOptionMap.value.get(uid);
        if (!service) {
            return;
        }
        const buffer = Math.max(service.buffer_time || 0, 0);
        technicianTotal += Math.max(service.technician_duration || 0, 0) + buffer;
        roomTotal += Math.max(service.room_duration || 0, 0) + buffer;
    });
    const total = Math.max(technicianTotal, roomTotal, 0);
    return { technicianTotal, roomTotal, total, serviceOrder };
};

const loadLocations = async () => {
    try {
        const data = await getScheduleLocations();
        locationOptions.value = data;
        if (!data.length) {
            return;
        }
        const stored = uni.getStorageSync('preferred_location_uid');
        const matched = data.find((item) => item.uid === stored);
        selectedLocationUid.value = matched ? matched.uid : data[0].uid;
        if (selectedLocationUid.value) {
            uni.setStorageSync('preferred_location_uid', selectedLocationUid.value);
        }
    } catch (error) {
        console.error('加载地点失败:', error);
        uni.showToast({ title: '加载地点失败', icon: 'error' });
    }
};

const handleLocationChange = (event) => {
    const index = Number(event.detail?.value);
    const option = locationOptions.value[index];
    if (option) {
        selectedLocationUid.value = option.uid;
        uni.setStorageSync('preferred_location_uid', option.uid);
        availableSlots.value = [];
    }
};

const updateDateOptions = async () => {
    if (!selectedLocationUid.value) {
        dateOptions.value = [];
        selectedDate.value = '';
        return;
    }
    try {
        const days = await getLocationDays(selectedLocationUid.value, 14);
        const formatted = days.map((item) => ({
            date: item.date,
            weekday: item.weekday,
            hasShift: item.has_any_shift,
            display: formatDisplayDate(item.date)
        }));
        dateOptions.value = formatted;
        const firstAvailable = formatted.find((item) => item.hasShift);
        selectedDate.value = firstAvailable ? firstAvailable.date : (formatted[0]?.date || '');
    } catch (error) {
        console.error('加载可用日期失败:', error);
    }
};

const updateServices = async () => {
    if (!selectedLocationUid.value) {
        serviceOptions.value = [];
        selectedServiceUids.value = [];
        orderedServiceUids.value = [];
        return;
    }
    try {
        const services = await getLocationServices(selectedLocationUid.value);
        serviceOptions.value = services;
        selectedServiceUids.value = [];
        orderedServiceUids.value = [];
        serviceOrderMode.value = 'default';
    } catch (error) {
        console.error('加载服务列表失败:', error);
    }
};

const updateTechnicians = async () => {
    if (!selectedLocationUid.value || !selectedServiceUids.value.length) {
        technicianOptions.value = [];
        preferredTechnicianUid.value = 'any';
        return;
    }
    try {
        const data = await getLocationTechnicians({
            location_uid: selectedLocationUid.value,
            service_uids: selectedServiceUids.value
        });
        technicianOptions.value = data;
        if (preferredTechnicianUid.value !== 'any') {
            const match = data.find((item) => item.uid === preferredTechnicianUid.value && item.is_available);
            if (!match) {
                preferredTechnicianUid.value = 'any';
            }
        }
    } catch (error) {
        console.error('加载技师列表失败:', error);
        technicianOptions.value = [];
        preferredTechnicianUid.value = 'any';
    }
};

const handleDateSelect = (item) => {
    if (!item.hasShift) {
        return;
    }
    selectedDate.value = item.date;
};

const handleServiceChange = (event) => {
    const values = event.detail?.value || [];
    selectedServiceUids.value = values;
    orderedServiceUids.value = [...values];
    serviceOrderMode.value = 'default';
    availableSlots.value = [];
    updateTechnicians();
};

const handleServiceOrderChange = (event) => {
    serviceOrderMode.value = event.detail?.value || 'default';
    if (selectedServiceUids.value.length !== 2) {
        return;
    }
    if (serviceOrderMode.value === 'default') {
        orderedServiceUids.value = [...selectedServiceUids.value];
    } else {
        orderedServiceUids.value = [...selectedServiceUids.value].reverse();
    }
};

const handleTechnicianPreference = (event) => {
    preferredTechnicianUid.value = event.detail?.value || 'any';
};

const handleAttendeeChange = (event) => {
    selectedAttendeeId.value = event.detail?.value || 'self';
};

const handleAddAttendee = () => {
    uni.showModal({
        title: '添加预约人',
        editable: true,
        placeholderText: '输入姓名',
        success: (res) => {
            if (res.confirm && res.content?.trim()) {
                const id = `guest_${Date.now()}`;
                attendees.value.push({ id, label: res.content.trim(), isSelf: false });
                selectedAttendeeId.value = id;
            }
        }
    });
};

const handleQueryTimes = async () => {
    if (!canQuery.value) {
        return;
    }
    if (!selectedDate.value) {
        uni.showToast({ title: '请选择日期', icon: 'none' });
        return;
    }
    isQuerying.value = true;
    try {
        const serviceOrder = orderedServiceUids.value.length ? orderedServiceUids.value : selectedServiceUids.value;
        const payload = {
            location_uid: selectedLocationUid.value,
            target_date: selectedDate.value,
            ordered_service_uids: serviceOrder,
            preferred_technician_uid: preferredTechnicianUid.value === 'any' ? null : preferredTechnicianUid.value,
            holds: cartStore.getHoldPayload()
        };
        const response = await queryPackageAvailability(payload);
        availableSlots.value = response.available_slots || [];
        if (availableSlots.value.length) {
            timesPopup.value?.open();
        } else {
            uni.showToast({ title: '暂无可用时段', icon: 'none' });
        }
    } catch (error) {
        console.error('查询可用时间失败:', error);
        uni.showToast({ title: '查询失败', icon: 'error' });
    } finally {
        isQuerying.value = false;
    }
};

const closeTimesPopup = () => {
    timesPopup.value?.close();
};

const handleSelectSlot = (slot) => {
    const { total, serviceOrder } = calculatePackageDurations();
    const totalMinutes = total || 0;
    const start = new Date(slot.start_time);
    const end = new Date(start.getTime() + totalMinutes * 60000);

    const attendee = attendeesMap.value.get(selectedAttendeeId.value) || attendeesMap.value.get('self');

    const itemPayload = {
        locationUid: selectedLocationUid.value,
        locationName: currentLocation.value?.name || '',
        date: selectedDate.value,
        startTimeISO: start.toISOString(),
        endTimeISO: end.toISOString(),
        services: serviceOrder.map((uid) => ({
            uid,
            name: serviceOptionMap.value.get(uid)?.name || '服务'
        })),
        serviceOrder: serviceOrder,
        technician: slot.technician || null,
        resource: slot.resource || null,
        attendee,
        totalMinutes
    };

    cartStore.addItem(itemPayload);
    uni.showToast({ title: '已加入预约', icon: 'success' });
    closeTimesPopup();
};

const removeCartItem = (id) => {
    cartStore.removeItem(id);
};

const goCheckout = () => {
    uni.navigateTo({ url: '/pages/appointment/checkout' });
};

const formatDisplayDate = (value) => {
    const date = new Date(value);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
};

const formatSlotTime = (value) => {
    const date = new Date(value);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const formatCountdown = (ms) => {
    if (!ms || ms <= 0) {
        return '00:00';
    }
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
};

watch(selectedLocationUid, async (next) => {
    if (!next) {
        return;
    }
    await updateDateOptions();
    await updateServices();
    await updateTechnicians();
});

watch(selectedServiceUids, () => {
    if (!selectedServiceUids.value.length) {
        preferredTechnicianUid.value = 'any';
    }
});

onMounted(async () => {
    cartStore.pruneExpired();
    await loadLocations();
    await updateDateOptions();
    await updateServices();
    await updateTechnicians();
    countdownTimer = setInterval(() => {
        currentTick.value = Date.now();
        cartStore.pruneExpired();
    }, 1000);
});

onBeforeUnmount(() => {
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
});
</script>

<style scoped>
.booking-container {
    min-height: 100vh;
    background-color: #f7f8fa;
    padding-bottom: 120rpx;
}

.section {
    background-color: #ffffff;
    margin: 12px 16px;
    padding: 16px;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}

.section-title {
    font-size: 16px;
    font-weight: 600;
}

.selector {
    padding: 12px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #ffffff;
}

.date-scroll {
    display: flex;
    gap: 8px;
    padding: 4px 0;
}

.date-chip {
    min-width: 96px;
    padding: 10px;
    margin-right: 8px;
    border-radius: 10px;
    border: 1px solid #e5e5e5;
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
}

.date-chip.active {
    border-color: #409eff;
    background-color: #ecf5ff;
}

.date-chip.disabled {
    opacity: 0.4;
}

.date-text {
    font-size: 15px;
    font-weight: 600;
}

.weekday-text {
    font-size: 12px;
    color: #909399;
}

.service-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.service-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
}

.service-item.disabled {
    opacity: 0.5;
}

.service-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.service-name {
    font-size: 15px;
    font-weight: 600;
}

.service-meta {
    font-size: 12px;
    color: #999999;
}

.radio-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 0;
}

.radio-item.disabled {
    opacity: 0.5;
}

.radio-hint {
    font-size: 12px;
    color: #f56c6c;
}

.link-btn {
    font-size: 12px;
    color: #409eff;
    background: transparent;
    border: none;
}

.cart-footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background-color: #ffffff;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.06);
}

.summary {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.countdown {
    font-size: 12px;
    color: #f56c6c;
}

.times-popup {
    padding: 16px;
}

.popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.times-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.time-chip {
    min-width: 100px;
    padding: 12px;
    border-radius: 10px;
    border: 1px solid #e5e5e5;
    text-align: center;
    background-color: #ffffff;
}

.time-text {
    font-size: 16px;
    font-weight: 600;
}

.time-subtext {
    display: block;
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
}

.times-empty {
    padding: 20px 0;
    text-align: center;
    color: #909399;
}

.cart-preview {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.cart-item {
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    padding: 12px;
    background-color: #ffffff;
}

.cart-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
}

.cart-appointment-person {
    font-weight: 600;
}

.cart-detail-line {
    font-size: 12px;
    color: #606266;
    margin-bottom: 4px;
}

.cart-countdown {
    font-size: 12px;
    color: #f56c6c;
}
</style>
