<template>
    <view class="admin-page-container">
        <view class="header">
            <view>
                <text class="title">管理仪表盘</text>
                <text class="subtitle">排班是核心，基础数据随时了解</text>
            </view>
            <button class="primary-btn" @click="refreshData" :disabled="isLoading">
                <uni-icons type="refresh" color="#fff" size="18"></uni-icons>
                刷新数据
            </button>
        </view>

        <view class="section-card highlight-card">
            <view class="section-header">
                <text class="section-title">未来 7 天排班概览</text>
                <text class="section-subtitle">共 {{ metrics.shifts }} 个班次</text>
            </view>
            <view class="shift-summary-grid">
                <view
                    v-for="item in shiftSummary"
                    :key="item.date"
                    class="shift-summary-item"
                    :class="{ 'is-empty': item.total === 0 }"
                >
                    <view class="shift-summary-date">
                        <text class="date-text">{{ item.date }}</text>
                        <text class="weekday-text">{{ item.weekday }}</text>
                    </view>
                    <view class="shift-summary-count">
                        <view class="count-line">
                            <text class="count-label">上午</text>
                            <text class="count-value">{{ item.morning }}</text>
                        </view>
                        <view class="count-line">
                            <text class="count-label">下午</text>
                            <text class="count-value">{{ item.afternoon }}</text>
                        </view>
                    </view>
                    <view class="tech-count">
                        <text>出勤技师 {{ item.techCount }}</text>
                    </view>
                </view>
            </view>
        </view>

        <view class="section-card">
            <text class="section-title">近期排班</text>
            <view v-if="upcomingShifts.length === 0" class="empty-state">
                暂无未来排班，点击右上角前往“排班管理”创建。
            </view>
            <uni-list v-else>
                <uni-list-item
                    v-for="shift in upcomingShifts"
                    :key="shift.uid"
                    :title="formatShiftTitle(shift)"
                    :note="formatShiftNote(shift)"
                    :to="`/pages/admin/scheduling?focus=${shift.uid}`"
                    link
                    showArrow
                >
                </uni-list-item>
            </uni-list>
        </view>

        <view class="section-card muted-card">
            <text class="section-title small">基础数据概览</text>
            <view class="metric-chip-grid">
                <view
                    v-for="item in baseMetricItems"
                    :key="item.key"
                    class="metric-chip"
                >
                    <text class="chip-label">{{ item.label }}</text>
                    <text class="chip-value">{{ item.value }}</text>
                </view>
            </view>
        </view>
    </view>
</template>

<script setup>
import { onMounted, ref, computed, reactive } from 'vue';
import {
    getLocations,
    getServices,
    getTechnicians,
    getShifts,
    getResourcesByLocation
} from '@/api/admin.js';

const isLoading = ref(false);
const metrics = reactive({
    locations: 0,
    services: 0,
    technicians: 0,
    resources: 0,
    shifts: 0
});
const upcomingShifts = ref([]);
const shiftSummary = ref([]);

const baseMetricItems = computed(() => [
    { key: 'locations', label: '地点数量', value: metrics.locations },
    { key: 'services', label: '服务项目', value: metrics.services },
    { key: 'technicians', label: '技师数量', value: metrics.technicians },
    { key: 'resources', label: '资源数量', value: metrics.resources }
]);

const formatDate = (dateInput) => {
    const date = new Date(dateInput);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatShiftTitle = (shift) => {
    const techName = shift.technician?.nickname || shift.technician?.phone || '未知技师';
    const locationName = shift.location?.name || '未分配地点';
    return `${techName} @ ${locationName}`;
};

const formatShiftNote = (shift) => {
    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);
    const formatTime = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${formatDate(start)} ${formatTime(start)} - ${formatTime(end)}`;
};

const SHIFT_SUMMARY_DAYS = 7;
const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const inferPeriod = (shift, start) => {
    if (shift.period) {
        return shift.period;
    }
    const hour = start.getHours();
    return hour < 13 ? 'morning' : 'afternoon';
};

const calculateShiftSummary = (shifts) => {
    const buckets = new Map();
    shifts.forEach((shift) => {
        const start = new Date(shift.start_time);
        const key = formatDate(start);
        if (!buckets.has(key)) {
            buckets.set(key, {
                date: key,
                weekday: WEEKDAY_LABELS[start.getDay()],
                morning: 0,
                afternoon: 0,
                techIds: new Set(),
                total: 0
            });
        }
        const bucket = buckets.get(key);
        const period = inferPeriod(shift, start);
        if (period === 'morning') {
            bucket.morning += 1;
        } else if (period === 'afternoon') {
            bucket.afternoon += 1;
        }
        const techUid = shift.technician?.uid || shift.technician_uid || shift.technician_id || '';
        if (techUid) {
            bucket.techIds.add(techUid);
        }
        bucket.total += 1;
    });

    const summary = [];
    const today = new Date();
    for (let i = 0; i < SHIFT_SUMMARY_DAYS; i += 1) {
        const current = new Date(today);
        current.setDate(today.getDate() + i);
        const key = formatDate(current);
        if (buckets.has(key)) {
            const bucket = buckets.get(key);
            summary.push({
                date: key,
                weekday: bucket.weekday,
                morning: bucket.morning,
                afternoon: bucket.afternoon,
                techCount: bucket.techIds.size,
                total: bucket.total
            });
        } else {
            summary.push({
                date: key,
                weekday: WEEKDAY_LABELS[current.getDay()],
                morning: 0,
                afternoon: 0,
                techCount: 0,
                total: 0
            });
        }
    }
    shiftSummary.value = summary;
};

const refreshData = async () => {
    if (isLoading.value) {
        return;
    }
    isLoading.value = true;
    console.debug('[AdminDashboard] Refresh triggered.');
    try {
        const [locations, services, technicians] = await Promise.all([
            getLocations(),
            getServices(),
            getTechnicians()
        ]);
        metrics.locations = locations.length;
        metrics.services = services.length;
        metrics.technicians = technicians.length;
        console.debug('[AdminDashboard] Base counts loaded.', {
            locations: locations.length,
            services: services.length,
            technicians: technicians.length
        });

        let resourcesCount = 0;
        for (const location of locations) {
            try {
                const resources = await getResourcesByLocation(location.uid);
                resourcesCount += resources.length;
            } catch (resourceError) {
                console.error('获取资源失败:', resourceError);
            }
        }
        metrics.resources = resourcesCount;
        console.debug('[AdminDashboard] Resource count aggregated.', { resources: resourcesCount });

        const today = formatDate(new Date());
        const shifts = await getShifts({ start_date: today });
        metrics.shifts = shifts.length;
        upcomingShifts.value = shifts.slice(0, 5);
        calculateShiftSummary(shifts);
        console.debug('[AdminDashboard] Upcoming shifts loaded.', {
            totalShifts: shifts.length,
            preview: upcomingShifts.value
        });
    } catch (error) {
        console.error('加载仪表盘数据失败:', error);
        uni.showToast({ title: '仪表盘加载失败', icon: 'error' });
    } finally {
        isLoading.value = false;
        console.debug('[AdminDashboard] Refresh complete.', {
            metrics: { ...metrics },
            upcomingShifts: upcomingShifts.value
        });
    }
};

onMounted(() => {
    console.debug('[AdminDashboard] Mounted, loading initial data.');
    refreshData();
});
</script>

<style scoped>
@import '/static/css/admin.css';

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.subtitle {
    display: block;
    font-size: 13px;
    color: #8f9399;
    margin-top: 4px;
}

.highlight-card {
    margin-bottom: 20px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 16px;
}

.section-title {
    font-size: 18px;
    font-weight: 600;
}

.section-title.small {
    font-size: 16px;
    margin-bottom: 12px;
}

.section-subtitle {
    font-size: 14px;
    color: #909399;
}

.shift-summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
}

.shift-summary-item {
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: border-color 0.2s ease, background-color 0.2s ease;
}

.shift-summary-item.is-empty {
    background-color: #f9fbff;
    border-color: #d6e4ff;
}

.shift-summary-date {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.date-text {
    font-size: 16px;
    font-weight: 600;
}

.weekday-text {
    font-size: 12px;
    color: #909399;
}

.shift-summary-count {
    display: flex;
    justify-content: space-between;
    gap: 10px;
}

.count-line {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px 0;
    border-radius: 6px;
    background-color: #f6f7fb;
}

.count-label {
    font-size: 12px;
    color: #888888;
}

.count-value {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
    margin-top: 4px;
}

.tech-count {
    font-size: 12px;
    color: #606266;
}

.section-card {
    background-color: #ffffff;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
    margin-bottom: 20px;
}

.empty-state {
    text-align: center;
    color: #888888;
    padding: 30px 0;
}

.metric-chip-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
}

.metric-chip {
    border: 1px dashed #e0e0e0;
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    background-color: #fafafa;
}

.chip-label {
    font-size: 12px;
    color: #909399;
}

.chip-value {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
}

.muted-card {
    margin-top: 8px;
}
</style>
