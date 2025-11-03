<template>
    <CustomerHome v-if="resolvedComponent === CustomerHome" />
    <CustomerAppointments v-else-if="resolvedComponent === CustomerAppointments" />
    <TechnicianSchedule v-else-if="resolvedComponent === TechnicianSchedule" />
    <TechnicianAppointments v-else-if="resolvedComponent === TechnicianAppointments" />
    <AdminDashboard v-else-if="resolvedComponent === AdminDashboard" />
    <AdminManage v-else-if="resolvedComponent === AdminManage" />
    <AdminScheduling v-else-if="resolvedComponent === AdminScheduling" />
    <ProfileCenter v-else-if="resolvedComponent === ProfileCenter" />
    <ComingSoon v-else />
</template>

<script setup>
import { computed } from 'vue';
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

const resolvedComponent = computed(() => props.component || ComingSoon);
</script>
