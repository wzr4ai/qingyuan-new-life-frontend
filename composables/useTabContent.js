import { computed, watch } from 'vue';
import { useUserStore } from '@/store/user.js';
import { ROLE_TAB_CONFIG } from '@/config/tab-config.js';

const resolveTabConfig = (role, index) => {
    const roleConfig = ROLE_TAB_CONFIG[role] || ROLE_TAB_CONFIG.customer;
    const fallbackConfig = ROLE_TAB_CONFIG.customer[index] || ROLE_TAB_CONFIG.customer[0];
    return roleConfig[index] || fallbackConfig;
};

export const useTabContent = (tabIndex) => {
    const userStore = useUserStore();

    const currentRole = computed(() => userStore.userRole);
    const tabConfig = computed(() => resolveTabConfig(currentRole.value, tabIndex));

    watch(tabConfig, (config) => {
        if (config?.navTitle) {
            uni.setNavigationBarTitle({ title: config.navTitle });
        }
    }, { immediate: true });

    const currentComponent = computed(() => tabConfig.value?.component);

    return {
        currentComponent,
        tabConfig
    };
};
