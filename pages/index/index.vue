<template>
    <view class="tab-wrapper">
        <TabContentRenderer :component="currentComponent" />
    </view>
</template>

<script setup>
import { useTabContent } from '@/composables/useTabContent.js';
import TabContentRenderer from '@/components/common/TabContentRenderer.vue';

const { currentComponent } = useTabContent(0);
</script>

<style scoped>
.tab-wrapper {
    min-height: 100vh;
}
</style>
