<template>
    <view class="tab-wrapper">
        <component v-if="currentComponent" :is="currentComponent" />
    </view>
</template>

<script setup>
import { useTabContent } from '@/composables/useTabContent.js';

const { currentComponent } = useTabContent(2);
</script>

<style scoped>
.tab-wrapper {
    min-height: 100vh;
}
</style>
