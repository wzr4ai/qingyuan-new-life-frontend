<template>
    <view class="admin-page-container">
        <view class="header">
            <text class="title">管理仪表盘</text>
            <button class="primary-btn" @click="refreshData" :disabled="isLoading">
                <uni-icons type="refresh" color="#fff" size="18"></uni-icons>
                刷新数据
            </button>
        </view>

        <view class="metric-grid">
            <view
                v-for="item in metricItems"
                :key="item.key"
                class="metric-card"
            >
                <text class="metric-label">{{ item.label }}</text>
                <text class="metric-value">{{ item.value }}</text>
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
    </view>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue';
import {
    getLocations,
    getServices,
    getTechnicians,
    getShifts,
    getResourcesByLocation
} from '@/api/admin.js';

const isLoading = ref(false);
const metrics = ref({
    locations: 0,
    services: 0,
    technicians: 0,
    resources: 0,
    shifts: 0
});
const upcomingShifts = ref([]);

const metricItems = computed(() => [
    { key: 'locations', label: '地点数量', value: metrics.value.locations },
    { key: 'services', label: '服务项目', value: metrics.value.services },
    { key: 'technicians', label: '技师数量', value: metrics.value.technicians },
    { key: 'resources', label: '资源数量', value: metrics.value.resources },
    { key: 'shifts', label: '未来排班', value: metrics.value.shifts }
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
        metrics.value.locations = locations.length;
        metrics.value.services = services.length;
        metrics.value.technicians = technicians.length;
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
        metrics.value.resources = resourcesCount;
        console.debug('[AdminDashboard] Resource count aggregated.', { resources: resourcesCount });

        const today = formatDate(new Date());
        const shifts = await getShifts({ start_date: today });
        metrics.value.shifts = shifts.length;
        upcomingShifts.value = shifts.slice(0, 5);
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
            metrics: { ...metrics.value },
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

.metric-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
}

.metric-card {
    background-color: #ffffff;
    border-radius: 10px;
    padding: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.metric-label {
    color: #666666;
    font-size: 14px;
}

.metric-value {
    font-size: 28px;
    font-weight: bold;
    color: #222222;
}

.section-card {
    background-color: #ffffff;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.section-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 16px;
    display: block;
}

.empty-state {
    text-align: center;
    color: #888888;
    padding: 30px 0;
}
</style>
