<template>
    <view class="admin-page-container">
        <view class="header">
            <text class="title">资源管理</text>
            <view class="actions">
                <picker
                    mode="selector"
                    :range="locationList"
                    range-key="name"
                    @change="handleLocationChange"
                >
                    <view class="selector">
                        {{ currentLocationName }}
                        <uni-icons type="bottom" size="14" color="#666"></uni-icons>
                    </view>
                </picker>
                <button class="primary-btn" @click="openCreateForm" :disabled="!locationList.length">
                    <uni-icons type="plusempty" color="#fff" size="16"></uni-icons>
                    新建
                </button>
            </view>
        </view>

        <uni-list :border="true">
            <uni-list-item
                v-for="item in resourceList"
                :key="item.uid"
                :title="item.name"
                :note="formatResourceNote(item)"
                showArrow
                clickable
                @click="openEditForm(item)"
            >
                <template #footer>
                    <button class="list-delete-btn" @click.stop="confirmDelete(item)">
                        删除
                    </button>
                </template>
            </uni-list-item>
        </uni-list>

        <view v-if="locationList.length && !resourceList.length" class="empty-state">
            <text>该地点暂无资源，点击“新建”快速添加。</text>
        </view>
        <view v-else-if="!locationList.length" class="empty-state">
            <text>请先在后台创建地点，再添加资源。</text>
        </view>

        <uni-popup ref="formPopup" type="dialog">
            <uni-popup-dialog
                mode="input"
                :title="formTitle"
                confirmText="提交"
                @confirm="handleSubmit"
                :before-close="true"
                @close="formPopup.close()"
            >
                <view class="form-body">
                    <input
                        class="popup-input"
                        v-model="formData.name"
                        placeholder="资源名称"
                    />
                    <picker
                        mode="selector"
                        :range="locationList"
                        range-key="name"
                        @change="handleFormLocationChange"
                        :value="formLocationIndex"
                    >
                        <view class="selector selector-inline">
                            {{ locationList[formLocationIndex]?.name || '请选择地点' }}
                            <uni-icons type="bottom" size="14" color="#666"></uni-icons>
                        </view>
                    </picker>
                    <view class="input-group">
                        <text class="input-label">可提供服务</text>
                        <text class="input-hint" v-if="serviceOptions.length">选择该资源可支持的服务项目</text>
                        <view v-if="serviceOptions.length">
                            <uni-data-checkbox
                                multiple
                                :localdata="serviceOptions"
                                v-model="formData.service_uids"
                            />
                        </view>
                        <view v-else class="empty-hint">
                            暂无可选服务，请先前往服务管理创建。
                        </view>
                    </view>
                </view>
            </uni-popup-dialog>
        </uni-popup>
    </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import {
    getLocations,
    getResourcesByLocation,
    createResource,
    updateResource,
    deleteResource,
    getServices
} from '@/api/admin.js';

const locationList = ref([]);
const resourceList = ref([]);
const selectedLocationIndex = ref(0);
const formLocationIndex = ref(0);
const serviceList = ref([]);

const formPopup = ref(null);
const formTitle = ref('新建资源');
const isEditMode = ref(false);
const isSubmitting = ref(false);

const formData = ref({
    uid: null,
    name: '',
    location_uid: '',
    type: 'room',
    service_uids: []
});

const currentLocationName = computed(() => {
    if (!locationList.value.length) {
        return '暂无地点';
    }
    return locationList.value[selectedLocationIndex.value]?.name || '请选择地点';
});

const serviceOptions = computed(() => serviceList.value.map((service) => ({
    text: service.name,
    value: service.uid
})));

const fetchServices = async () => {
    try {
        const services = await getServices();
        serviceList.value = services;
    } catch (error) {
        console.error('加载服务失败:', error);
        uni.showToast({ title: '加载服务失败', icon: 'error' });
    }
};

const fetchLocations = async () => {
    try {
        const locations = await getLocations();
        locationList.value = locations;
        if (locations.length) {
            selectedLocationIndex.value = 0;
            await fetchResources();
        } else {
            resourceList.value = [];
        }
    } catch (error) {
        console.error('加载地点失败:', error);
        uni.showToast({ title: '加载地点失败', icon: 'error' });
    }
};

const fetchResources = async () => {
    const location = locationList.value[selectedLocationIndex.value];
    if (!location) {
        resourceList.value = [];
        return;
    }
    try {
        const data = await getResourcesByLocation(location.uid);
        resourceList.value = data;
    } catch (error) {
        console.error('加载资源失败:', error);
        uni.showToast({ title: '加载资源失败', icon: 'error' });
    }
};

const formatResourceNote = (item) => {
    const locationName = item.location?.name || '-';
    const serviceNames = (item.services || []).map((service) => service.name).join('、') || '未设置服务';
    return `地点：${locationName} · 服务：${serviceNames}`;
};

onMounted(async () => {
    await Promise.all([fetchServices(), fetchLocations()]);
});

const handleLocationChange = async (event) => {
    selectedLocationIndex.value = Number(event.detail.value);
    await fetchResources();
};

const handleFormLocationChange = (event) => {
    formLocationIndex.value = Number(event.detail.value);
};

const openCreateForm = () => {
    if (!serviceList.value.length) {
        fetchServices();
    }
    formTitle.value = '新建资源';
    isEditMode.value = false;
    formLocationIndex.value = selectedLocationIndex.value;
    formData.value = {
        uid: null,
        name: '',
        location_uid: locationList.value[formLocationIndex.value]?.uid || '',
        type: 'room',
        service_uids: []
    };
    formPopup.value.open();
};

const openEditForm = (item) => {
    if (!serviceList.value.length) {
        fetchServices();
    }
    formTitle.value = `编辑：${item.name}`;
    isEditMode.value = true;
    const index = locationList.value.findIndex((loc) => loc.uid === item.location?.uid);
    formLocationIndex.value = index >= 0 ? index : 0;
    formData.value = {
        uid: item.uid,
        name: item.name,
        location_uid: item.location?.uid || '',
        type: item.type || 'room',
        service_uids: (item.services || []).map((service) => service.uid)
    };
    formPopup.value.open();
};

const confirmDelete = (item) => {
    uni.showModal({
        title: '确认删除',
        content: `确定删除资源「${item.name}」吗？`,
        confirmText: '删除',
        confirmColor: '#e43d33',
        success: async (res) => {
            if (!res.confirm) {
                return;
            }
            await deleteResourceItem(item);
        }
    });
};

const deleteResourceItem = async (item) => {
    if (isSubmitting.value) {
        return;
    }
    isSubmitting.value = true;
    try {
        await deleteResource(item.uid);
        uni.showToast({ title: '删除成功', icon: 'success' });
        await fetchResources();
    } catch (error) {
        console.error('删除资源失败:', error);
        uni.showToast({ title: error.data?.detail || '删除失败', icon: 'error' });
    } finally {
        isSubmitting.value = false;
    }
};

const handleSubmit = async () => {
    if (!formData.value.name) {
        uni.showToast({ title: '名称不能为空', icon: 'none' });
        return;
    }
    const location = locationList.value[formLocationIndex.value];
    if (!location) {
        uni.showToast({ title: '请选择地点', icon: 'none' });
        return;
    }
    if (!formData.value.service_uids.length) {
        uni.showToast({ title: '请选择可提供的服务', icon: 'none' });
        return;
    }
    if (isSubmitting.value) {
        return;
    }
    isSubmitting.value = true;
    try {
        const payload = {
            name: formData.value.name,
            location_uid: location.uid,
            type: formData.value.type || 'room',
            service_uids: [...formData.value.service_uids]
        };
        if (isEditMode.value && formData.value.uid) {
            await updateResource(formData.value.uid, payload);
            uni.showToast({ title: '更新成功', icon: 'success' });
        } else {
            await createResource(payload);
            uni.showToast({ title: '创建成功', icon: 'success' });
        }
        formPopup.value.close();
        await fetchResources();
    } catch (error) {
        console.error('保存资源失败:', error);
        uni.showToast({ title: error.data?.detail || '操作失败', icon: 'error' });
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<style scoped>
@import '/static/css/admin.css';

.actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.selector {
    min-width: 140px;
    padding: 8px 12px;
    border: 1px solid #dddddd;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #ffffff;
}

.selector-inline {
    margin-top: 10px;
}

.empty-state {
    text-align: center;
    color: #888888;
    padding: 40px 20px;
    background-color: #ffffff;
    border-radius: 8px;
    margin-top: 20px;
}

.popup-input {
    height: 40px;
    border: 1px solid #e5e5e5;
    border-radius: 4px;
    padding: 0 10px;
    margin-bottom: 10px;
}

.form-body {
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.input-label {
    font-size: 14px;
    font-weight: 600;
    color: #333333;
}
.input-hint {
    font-size: 12px;
    color: #888888;
}
.empty-hint {
    font-size: 12px;
    color: #888888;
    background-color: #fafafa;
    border: 1px dashed #dddddd;
    border-radius: 6px;
    padding: 8px 12px;
}
.list-delete-btn {
    padding: 4px 10px;
    border: 1px solid #e43d33;
    border-radius: 16px;
    background-color: transparent;
    color: #e43d33;
    font-size: 12px;
}
</style>
