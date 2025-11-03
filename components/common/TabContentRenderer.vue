<template>
    <CustomerHome v-if="resolvedKey === 'customer-home'" />
    <CustomerAppointments v-else-if="resolvedKey === 'customer-appointments'" />
    <TechnicianSchedule v-else-if="resolvedKey === 'technician-schedule'" />
    <TechnicianAppointments v-else-if="resolvedKey === 'technician-appointments'" />
    <AdminDashboard v-else-if="resolvedKey === 'admin-dashboard'" />
    <AdminManage v-else-if="resolvedKey === 'admin-manage'" />
    <AdminScheduling v-else-if="resolvedKey === 'admin-scheduling'" />
    <ProfileCenter v-else-if="resolvedKey === 'profile-center'" />
    <ComingSoon v-else />
</template>

<script setup>
import { computed, watch } from 'vue';
import CustomerHome from '@/components/customer/CustomerHome.vue';
import CustomerAppointments from '@/components/customer/CustomerAppointments.vue';
import TechnicianSchedule from '@/components/technician/TechnicianSchedule.vue';
import TechnicianAppointments from '@/components/technician/TechnicianAppointments.vue';
import AdminDashboard from '@/components/admin/AdminDashboard.vue';
import AdminManage from '@/components/admin/AdminManage.vue';
import AdminScheduling from '@/components/admin/AdminScheduling.vue';
import ProfileCenter from '@/components/profile/ProfileCenter.vue';
import ComingSoon from '@/components/common/ComingSoon.vue';

const props = defineProps({
    component: {
        type: [Object, Function],
        default: null
    }
});

const registry = [
    { key: 'customer-home', component: CustomerHome },
    { key: 'customer-appointments', component: CustomerAppointments },
    { key: 'technician-schedule', component: TechnicianSchedule },
    { key: 'technician-appointments', component: TechnicianAppointments },
    { key: 'admin-dashboard', component: AdminDashboard },
    { key: 'admin-manage', component: AdminManage },
    { key: 'admin-scheduling', component: AdminScheduling },
    { key: 'profile-center', component: ProfileCenter }
];

const getComponentName = (component) => component?.name || component?.__name || 'anonymous';

const resolvedKey = computed(() => {
    if (!props.component) {
        console.warn('[TabContentRenderer] Missing component prop, defaulting to ComingSoon.');
        return 'coming-soon';
    }
    const match = registry.find((item) => item.component === props.component);
    if (!match) {
        console.warn('[TabContentRenderer] Unregistered component received, defaulting to ComingSoon.', {
            name: getComponentName(props.component)
        });
        return 'coming-soon';
    }
    return match.key;
});

watch(() => props.component, (next) => {
    console.debug('[TabContentRenderer] Component switch', {
        requested: getComponentName(next),
        resolvedKey: resolvedKey.value
    });
}, { immediate: true });
</script>
