<template>
    <QuickScheduling :initial-technician-uid="initialTechnicianUid" />
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import QuickScheduling from '@/components/admin/QuickScheduling.vue';

const initialTechnicianUid = ref('');

onLoad((options) => {
    if (options?.technicianUid) {
        initialTechnicianUid.value = options.technicianUid;
    }
});
</script>
