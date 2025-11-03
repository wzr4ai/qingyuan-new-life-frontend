<template>
    <CustomerBooking v-if="resolvedKey === 'customer-home'" />
    <CustomerAppointments v-else-if="resolvedKey === 'customer-appointments'" />
    <ScheduleBoard v-else-if="resolvedKey === 'technician-schedule'" />
    <TechnicianAppointments v-else-if="resolvedKey === 'technician-appointments'" />
    <AdminDashboard v-else-if="resolvedKey === 'admin-dashboard'" />
    <AdminManage v-else-if="resolvedKey === 'admin-manage'" />
    <ScheduleBoard v-else-if="resolvedKey === 'admin-scheduling'" />
    <ProfileCenter v-else-if="resolvedKey === 'profile-center'" />
    <ComingSoon v-else />
</template>

<script setup>
import { computed, watch } from 'vue';
import CustomerBooking from '@/components/customer/CustomerBooking.vue';
import CustomerAppointments from '@/components/customer/CustomerAppointments.vue';
import TechnicianAppointments from '@/components/technician/TechnicianAppointments.vue';
import AdminDashboard from '@/components/admin/AdminDashboard.vue';
import AdminManage from '@/components/admin/AdminManage.vue';
import ScheduleBoard from '@/components/schedule/ScheduleBoard.vue';
import ProfileCenter from '@/components/profile/ProfileCenter.vue';
import ComingSoon from '@/components/common/ComingSoon.vue';

const props = defineProps({
    component: {
        type: [Object, Function],
        default: null
    }
});

const registry = [
    { key: 'customer-home', component: CustomerBooking },
    { key: 'customer-appointments', component: CustomerAppointments },
    { key: 'technician-schedule', component: ScheduleBoard },
    { key: 'technician-appointments', component: TechnicianAppointments },
    { key: 'admin-dashboard', component: AdminDashboard },
    { key: 'admin-manage', component: AdminManage },
    { key: 'admin-scheduling', component: ScheduleBoard },
    { key: 'profile-center', component: ProfileCenter }
];

const getComponentName = (component) => component?.name || component?.__name || 'anonymous';
const getComponentFile = (component) => component?.__file || '';

const collectIdentifiers = (component) => {
    const identifiers = new Set();
    if (!component) {
        return identifiers;
    }
    identifiers.add(component);
    const name = getComponentName(component);
    if (name) {
        identifiers.add(name);
        identifiers.add(name.toLowerCase());
    }
    const file = getComponentFile(component);
    if (file) {
        identifiers.add(file);
    }
    return identifiers;
};

const registryEntries = registry.map((entry) => ({
    ...entry,
    identifiers: collectIdentifiers(entry.component)
}));

const resolvedKey = computed(() => {
    if (!props.component) {
        console.warn('[TabContentRenderer] Missing component prop, defaulting to ComingSoon.');
        return 'coming-soon';
    }

    const candidateIdentifiers = collectIdentifiers(props.component);
    const match = registryEntries.find((entry) => {
        for (const identifier of candidateIdentifiers) {
            if (entry.identifiers.has(identifier)) {
                return true;
            }
        }
        return false;
    });

    if (!match) {
        console.warn('[TabContentRenderer] Unregistered component received, defaulting to ComingSoon.', {
            name: getComponentName(props.component),
            file: getComponentFile(props.component),
            identifiers: Array.from(candidateIdentifiers)
        });
        uni.showToast({
            title: '视图未注册',
            icon: 'none'
        });
        return 'coming-soon';
    }
    return match.key;
});

watch(
    () => props.component,
    (next) => {
        console.debug('[TabContentRenderer] Component switch', {
            requested: {
                name: getComponentName(next),
                file: getComponentFile(next)
            },
            resolvedKey: resolvedKey.value
        });
    },
    { immediate: true }
);
</script>
