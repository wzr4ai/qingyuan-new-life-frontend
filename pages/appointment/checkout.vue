<template>
    <view class="checkout-container">
        <view v-if="!items.length" class="empty-state">
            <uni-icons type="calendar" size="48" color="#c0c4cc"></uni-icons>
            <text>购物车为空，请先添加预约。</text>
        </view>
        <view v-else>
            <view
                v-for="group in groupedItems"
                :key="group.attendee.id"
                class="group-card"
            >
                <view class="group-header">
                    <text class="attendee-name">{{ group.attendee.label }}</text>
                    <text class="group-countdown">锁定剩余 {{ formatCountdown(group.minRemainingMs) }}</text>
                </view>
                <view
                    v-for="item in group.items"
                    :key="item.id"
                    class="booking-item"
                >
                    <view class="item-row">
                        <text class="item-title">{{ item.date }} {{ item.displayTime }}</text>
                        <button class="link-btn" size="mini" @click="() => removeItem(item.id)">移除</button>
                    </view>
                    <view class="item-line">地点：{{ item.locationName }}</view>
                    <view class="item-line">服务：{{ item.services.map((s) => s.name).join('，') }}</view>
                    <view class="item-line" v-if="item.technician">技师：{{ item.technician.nickname || item.technician.phone || item.technician.uid }}</view>
                    <view class="item-line" v-if="item.resource">资源：{{ item.resource.name }}</view>
                </view>
            </view>
            <button class="primary-btn" :disabled="!items.length" @click="handleSubmit">
                提交预约
            </button>
        </view>
    </view>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useBookingCartStore } from '@/store/bookingCart.js';

const cartStore = useBookingCartStore();
const currentTick = ref(Date.now());
let timer = null;

const items = computed(() => {
    cartStore.pruneExpired();
    return cartStore.activeItems.map((item) => ({
        ...item,
        displayTime: formatTime(item.startTimeISO)
    }));
});

const groupedItems = computed(() => {
    const groupsMap = new Map();
    items.value.forEach((item) => {
        const attendeeId = item.attendee?.id || 'self';
        if (!groupsMap.has(attendeeId)) {
            groupsMap.set(attendeeId, {
                attendee: item.attendee,
                items: [],
                minRemainingMs: Infinity
            });
        }
        const group = groupsMap.get(attendeeId);
        group.items.push(item);
        const remaining = Math.max(item.expiresAt - currentTick.value, 0);
        group.minRemainingMs = Math.min(group.minRemainingMs, remaining);
    });
    return Array.from(groupsMap.values());
});

const formatTime = (value) => {
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

const removeItem = (id) => {
    cartStore.removeItem(id);
};

const handleSubmit = () => {
    uni.showToast({ title: '已提交预约（示例）', icon: 'success' });
    // 真实环境下应调用后端提交接口，这里仅做占位
};

onMounted(() => {
    timer = setInterval(() => {
        currentTick.value = Date.now();
        cartStore.pruneExpired();
    }, 1000);
});

onBeforeUnmount(() => {
    if (timer) {
        clearInterval(timer);
    }
});
</script>

<style scoped>
.checkout-container {
    min-height: 100vh;
    background-color: #f7f8fa;
    padding: 16px;
}

.empty-state {
    min-height: 60vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #909399;
}

.group-card {
    background-color: #ffffff;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.attendee-name {
    font-size: 16px;
    font-weight: 600;
}

.group-countdown {
    font-size: 12px;
    color: #f56c6c;
}

.booking-item {
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 10px;
}

.booking-item:last-of-type {
    margin-bottom: 0;
}

.item-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
}

.item-title {
    font-weight: 600;
}

.item-line {
    font-size: 12px;
    color: #606266;
    margin-bottom: 4px;
}

.link-btn {
    font-size: 12px;
    color: #409eff;
    background: transparent;
    border: none;
}

.primary-btn {
    width: 100%;
    margin-top: 12px;
}
</style>
