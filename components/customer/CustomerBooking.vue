<template>
    <scroll-view class="booking-container" scroll-y>
        <view class="section">
            <view class="section-header">
                <text class="section-title">到店信息</text>
            </view>
            <view class="info-grid">
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
                <button
                    class="selector"
                    :disabled="!dateOptions.length"
                    @click="openDatePopup"
                >
                    <view class="date-button">
                        <text>{{ selectedDateDisplay }}</text>
                        <uni-icons type="calendar" size="16" color="#666"></uni-icons>
                    </view>
                </button>
            </view>
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
            <view v-if="timeSummaries.length" class="period-list">
                <view
                    v-for="summary in timeSummaries"
                    :key="summary.period"
                    class="period-section"
                >
                    <view class="period-header">
                        <text class="period-title">{{ summary.label }}</text>
                        <text class="period-hint" v-if="summary.totalMinutes">
                            空闲 {{ formatAvailableMinutes(summary.totalMinutes) }}
                        </text>
                    </view>
                    <view class="times-grid slot-grid">
                        <button
                            v-for="slot in summary.items"
                            :key="slot.id"
                            class="time-chip slot-chip"
                            :class="{ disabled: slot.disabled, available: slot.isAvailable }"
                            :disabled="slot.disabled"
                            @click="() => handleSelectSlot(slot.raw)"
                        >
                            <text class="time-text">{{ slot.time }}</text>
                            <text class="time-range" v-if="slot.range">{{ slot.range }}</text>
                            <text class="time-hint" v-if="slot.technician">{{ slot.technician }}</text>
                            <text class="time-sub-hint" v-if="slot.resource">{{ slot.resource }}</text>
                        </button>
                    </view>
                </view>
            </view>
            <view v-else class="times-empty">
                <text>暂无符合条件的时间，请调整条件后重试。</text>
            </view>
        </view>
    </uni-popup>

    <uni-popup ref="datePopup" type="bottom" background-color="#ffffff">
        <scroll-view class="date-popup" scroll-y :scroll-top="datePopupScrollTop">
            <view class="popup-header">
                <button class="back-btn" @click="closeDatePopup">
                    <uni-icons type="back" size="18" color="#666"></uni-icons>
                    <text>返回</text>
                </button>
                <text class="popup-title">选择预约日期</text>
                <uni-icons type="close" size="18" color="#666" @click="closeDatePopup"></uni-icons>
            </view>
            <view v-if="dateWeeks.length" class="date-week-list">
                <view
                    v-for="section in dateWeeks"
                    :key="section.label"
                    class="date-week-group"
                >
                    <text class="week-label">{{ section.label }}</text>
                    <view
                        v-for="item in section.days"
                        :key="item.date"
                        class="date-list-item"
                        :class="{
                            active: item.date === selectedDate,
                            disabled: !item.hasShift
                        }"
                        @click="() => handleDateSelect(item)"
                    >
                        <view class="date-list-left">
                            <text class="date-text">{{ item.display }}</text>
                            <text class="weekday-text">{{ item.weekday }}</text>
                        </view>
                        <view class="date-list-right">
                            <view class="period-summary-group" v-if="item.morningSlots.length || item.afternoonSlots.length">
                                <view v-if="item.morningSlots.length" class="period-summary">
                                    <text class="period-label">上午</text>
                                    <text
                                        class="period-status"
                                        :class="{
                                            available: hasPeriodAvailability(item.morningSlots, item.date),
                                            full: !hasPeriodAvailability(item.morningSlots, item.date)
                                        }"
                                    >
                                        {{ hasPeriodAvailability(item.morningSlots, item.date) ? '有空' : '已满' }}
                                    </text>
                                </view>
                                <view v-if="item.afternoonSlots.length" class="period-summary">
                                    <text class="period-label">下午</text>
                                    <text
                                        class="period-status"
                                        :class="{
                                            available: hasPeriodAvailability(item.afternoonSlots, item.date),
                                            full: !hasPeriodAvailability(item.afternoonSlots, item.date)
                                        }"
                                    >
                                        {{ hasPeriodAvailability(item.afternoonSlots, item.date) ? '有空' : '已满' }}
                                    </text>
                                </view>
                            </view>
                            <uni-icons v-if="item.date === selectedDate" type="checkbox-filled" size="18" color="#409eff"></uni-icons>
                        </view>
                    </view>
                </view>
            </view>
            <view v-else class="times-empty">
                <text>暂无可预约日期</text>
            </view>
        </scroll-view>
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
import { addDays, getISODate, formatDisplayDate, formatWeekday, weekdayLabels } from '@/components/customer/DateUtil.js';

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
const datePopup = ref(null);
const datePopupScrollTop = ref(0);

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

const DEFAULT_SLOT_DURATION_MINUTES = 30;

const PERIOD_SEQUENCE = ['morning', 'afternoon'];
const PERIOD_SLOT_DEFINITIONS = {
    morning: [
        { start: '08:30', end: '09:30' },
        { start: '09:30', end: '10:30' },
        { start: '10:30', end: '11:30' },
        { start: '11:30', end: '12:30' }
    ],
    afternoon: [
        { start: '14:00', end: '15:00' },
        { start: '15:00', end: '16:00' },
        { start: '16:00', end: '17:00' },
        { start: '17:00', end: '18:00' }
    ]
};

const packageDurationInfo = computed(() => calculatePackageDurations());

const getSlotTimestamp = (slot) => {
    if (!slot) {
        return Number.NaN;
    }
    if (typeof slot === 'string') {
        if (!selectedDate.value) {
            return Number.NaN;
        }
        return new Date(`${selectedDate.value}T${slot}:00`).getTime();
    }
    if (slot.start_time) {
        return new Date(slot.start_time).getTime();
    }
    return Number.NaN;
};

const normalizeSlotPayload = (slot) => {
    if (!slot) {
        return null;
    }
    if (typeof slot === 'string') {
        if (!selectedDate.value) {
            return null;
        }
        return {
            start_time: `${selectedDate.value}T${slot}:00`,
            technician: null,
            resource: null
        };
    }
    if (slot.start_time) {
        return slot;
    }
    return null;
};

const slotDurationMinutes = computed(() => {
    const inferred = packageDurationInfo.value.total || 0;
    if (inferred > 0) {
        return inferred;
    }
    const sortedTimes = availableSlots.value
        .map((item) => getSlotTimestamp(item))
        .filter((timestamp) => Number.isFinite(timestamp))
        .sort((a, b) => a - b);
    if (sortedTimes.length >= 2) {
        const diffMinutes = Math.round((sortedTimes[1] - sortedTimes[0]) / 60000);
        if (diffMinutes > 0) {
            return diffMinutes;
        }
    }
    return DEFAULT_SLOT_DURATION_MINUTES;
});
const slotAvailabilityMap = computed(() => {
    const map = new Map();
    availableSlots.value.forEach((slot) => {
        const normalized = normalizeSlotPayload(slot);
        if (!normalized) {
            return;
        }
        const start = new Date(normalized.start_time);
        if (Number.isNaN(start.getTime())) {
            return;
        }
        const timeLabel = formatSlotTime(start);
        if (!map.has(timeLabel)) {
            map.set(timeLabel, []);
        }
        map.get(timeLabel).push(normalized);
    });
    return map;
});

const timeSummaries = computed(() => {
    const buildItemsForPeriod = (periodKey) => {
        const definitions = PERIOD_SLOT_DEFINITIONS[periodKey] || [];
        const definedStarts = new Set(definitions.map((definition) => definition.start));
        const items = definitions.map((definition) => {
            const timeLabel = definition.start;
            const availableSlotsForTime = slotAvailabilityMap.value.get(timeLabel) || [];
            const slot = availableSlotsForTime[0] || null;
            const technicianName = slot?.technician?.nickname || slot?.technician?.phone || '';
            const resourceName = slot?.resource?.name || '';
            const isHeld = !isSlotFree(timeLabel, selectedDate.value);
            const hasAvailability = Boolean(slot) && !isHeld;
            const durationLabel = definition.end
                ? `${definition.start} - ${definition.end}`
                : '';
            return {
                id: slot
                    ? [slot.start_time, slot.technician?.uid || 'tech', slot.resource?.uid || 'res'].join('-')
                    : `placeholder-${periodKey}-${timeLabel}`,
                time: timeLabel,
                range: durationLabel,
                technician: technicianName ? `技师 ${technicianName}` : '',
                resource: resourceName ? `房间 ${resourceName}` : '',
                disabled: !hasAvailability,
                isAvailable: hasAvailability,
                raw: hasAvailability ? slot : null
            };
        });
        slotAvailabilityMap.value.forEach((slotList, timeLabel) => {
            if (definedStarts.has(timeLabel)) {
                return;
            }
            const hour = Number.parseInt(timeLabel.split(':')[0], 10);
            const derivedPeriod = Number.isNaN(hour) ? null : (hour < 12 ? 'morning' : 'afternoon');
            if (derivedPeriod !== periodKey || !slotList.length) {
                return;
            }
            const slot = slotList[0];
            const technicianName = slot.technician?.nickname || slot.technician?.phone || '';
            const resourceName = slot.resource?.name || '';
            const isHeld = !isSlotFree(timeLabel, selectedDate.value);
            const durationMinutes = slotDurationMinutes.value || DEFAULT_SLOT_DURATION_MINUTES;
            const end = new Date(new Date(slot.start_time).getTime() + durationMinutes * 60000);
            items.push({
                id: [slot.start_time, slot.technician?.uid || 'tech', slot.resource?.uid || 'res'].join('-'),
                time: timeLabel,
                range: durationMinutes ? `${timeLabel} - ${formatSlotTime(end)}` : '',
                technician: technicianName ? `技师 ${technicianName}` : '',
                resource: resourceName ? `房间 ${resourceName}` : '',
                disabled: isHeld,
                isAvailable: !isHeld,
                raw: !isHeld ? slot : null
            });
        });
        items.sort((a, b) => a.time.localeCompare(b.time));
        return items;
    };

    return PERIOD_SEQUENCE
        .map((periodKey) => {
            const label = periodKey === 'morning' ? '上午' : '下午';
            const items = buildItemsForPeriod(periodKey);
            const availableCount = items.filter((item) => item.isAvailable).length;
            const totalMinutes = availableCount * slotDurationMinutes.value;
            return {
                period: periodKey,
                label,
                totalMinutes,
                items
            };
        })
        .filter((group) => group.items.length);
});

const dateWeeks = computed(() => {
    const today = new Date();
    const startOfWeek = addDays(new Date(today), -today.getDay());
    const thisWeek = [];
    const nextWeek = [];

    for (let i = 0; i < 14; i += 1) {
        const current = addDays(startOfWeek, i);
        const iso = getISODate(current);
        const option = dateOptions.value.find((item) => item.date === iso);
        const dayPayload = {
            date: iso,
            display: formatDisplayDate(iso),
            weekday: weekdayLabels[current.getDay()],
            hasShift: option ? option.hasShift : false,
            morningSlots: option ? option.morningSlots || [] : [],
            afternoonSlots: option ? option.afternoonSlots || [] : []
        };

        if (i < 7) {
            thisWeek.push(dayPayload);
        } else {
            nextWeek.push(dayPayload);
        }
    }

    return [
        { label: '本周', days: thisWeek },
        { label: '下周', days: nextWeek }
    ];
});

const selectedDateDisplay = computed(() => {
    if (!selectedDate.value) {
        return '选择日期';
    }
    const option = dateOptions.value.find((item) => item.date === selectedDate.value);
    if (option) {
        return `${option.display} ${option.weekday}`;
    }
    const parsed = new Date(selectedDate.value);
    if (Number.isNaN(parsed.getTime())) {
        return '选择日期';
    }
    return `${formatDisplayDate(selectedDate.value)} ${formatWeekday(parsed)}`;
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
            display: formatDisplayDate(item.date),
            morningSlots: item.morning_slots || [],
            afternoonSlots: item.afternoon_slots || []
        }));
        dateOptions.value = formatted;
        const tomorrowISO = getISODate(addDays(new Date(), 1));
        const tomorrowOption = formatted.find((item) => item.date === tomorrowISO && item.hasShift);
        const firstAvailable = formatted.find((item) => item.hasShift);
        selectedDate.value = (tomorrowOption && tomorrowOption.date) ||
            (firstAvailable && firstAvailable.date) ||
            (formatted[0]?.date || '');
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
    availableSlots.value = [];
    closeDatePopup();
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
    availableSlots.value = [];
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

const openDatePopup = () => {
    if (!dateOptions.value.length) {
        uni.showToast({ title: '暂无可选日期', icon: 'none' });
        return;
    }
    datePopupScrollTop.value = 0;
    datePopup.value?.open();
};

const closeDatePopup = () => {
    datePopup.value?.close();
};

const handleSelectSlot = (slot) => {
    if (!slot) {
        return;
    }
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

const holdsMap = computed(() => {
    const map = new Map();
    cartItems.value.forEach((item) => {
        const start = new Date(item.startTimeISO);
        const slotKey = formatSlotTime(start);
        const day = item.date;
        if (!map.has(day)) {
            map.set(day, new Set());
        }
        map.get(day).add(slotKey);
    });
    return map;
});

const isSlotFree = (slot, date) => {
    const daySet = holdsMap.value.get(date);
    return !(daySet && daySet.has(slot));
};

const hasPeriodAvailability = (slots, date) => {
    if (!Array.isArray(slots) || !slots.length) {
        return false;
    }
    return slots.some((slot) => isSlotFree(slot, date));
};

function formatSlotTime(value) {
    const date = new Date(value);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function formatCountdown(ms) {
    if (!ms || ms <= 0) {
        return '00:00';
    }
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

const formatAvailableMinutes = (minutes) => {
    if (!minutes || minutes <= 0) {
        return '0分钟';
    }
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (hours && remainder) {
        return `${hours}小时${remainder}分钟`;
    }
    if (hours) {
        return `${hours}小时`;
    }
    return `${remainder}分钟`;
};

watch(selectedLocationUid, async (next) => {
    if (!next) {
        return;
    }
    closeDatePopup();
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
    width: 100%;
    line-height: 1.4;
    color: #303133;
}

.selector:disabled {
    color: #c0c4cc;
    border-color: #eaeaea;
}

.info-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.date-button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
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

.popup-title {
    font-size: 16px;
    font-weight: 600;
}

.back-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: none;
    color: #303133;
    padding: 4px 0;
}

.period-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.period-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.period-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.period-title {
    font-size: 15px;
    font-weight: 600;
}

.period-hint {
    font-size: 12px;
    color: #606266;
}

.times-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.slot-grid {
    width: 100%;
}

.slot-chip {
    flex: 1 0 calc(33.33% - 10px);
}

.time-chip {
    min-width: 100px;
    padding: 12px;
    border-radius: 10px;
    border: 1px solid #e5e5e5;
    text-align: center;
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
}

.time-text {
    font-size: 16px;
    font-weight: 600;
}

.time-range {
    font-size: 12px;
    color: #909399;
}

.time-hint {
    font-size: 12px;
    color: #606266;
}

.time-sub-hint {
    font-size: 12px;
    color: #909399;
}

.time-chip.available {
    border-color: #67c23a;
    background-color: #f0f9eb;
}

.time-chip.available .time-text {
    color: #3c8c3a;
}

.time-chip.available .time-range,
.time-chip.available .time-hint,
.time-chip.available .time-sub-hint {
    color: #3c8c3a;
}

.time-chip.disabled {
    border-color: #ebeef5;
    background-color: #f5f7fa;
    color: #c0c4cc;
}

.time-chip.disabled .time-text,
.time-chip.disabled .time-range,
.time-chip.disabled .time-hint,
.time-chip.disabled .time-sub-hint {
    color: #c0c4cc;
}

.times-empty {
    padding: 20px 0;
    text-align: center;
    color: #909399;
}

.date-popup {
    padding: 16px;
    max-height: 70vh;
    overflow-y: auto;
    box-sizing: border-box;
}

.date-week-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.date-week-group {
    margin-bottom: 12px;
}

.date-week-group + .date-week-group {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #f0f0f0;
}

.week-label {
    font-size: 14px;
    font-weight: 600;
    color: #606266;
    margin-bottom: 8px;
}

.date-list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    background-color: #ffffff;
    margin-bottom: 10px;
}

.date-list-item:last-of-type {
    margin-bottom: 0;
}

.date-list-item.active {
    border-color: #409eff;
    background-color: #ecf5ff;
}

.date-list-item.disabled {
    opacity: 0.4;
    pointer-events: none;
}

.date-list-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.date-list-right {
    display: flex;
    align-items: center;
    gap: 8px;
}

.period-summary-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.period-summary {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 12px;
    background-color: #f5f7fa;
}

.period-label {
    font-size: 10px;
    color: #606266;
}

.period-status {
    font-size: 12px;
    font-weight: 600;
    color: #606266;
}

.period-status.available {
    color: #2f7a48;
}

.period-status.full {
    color: #c44747;
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
