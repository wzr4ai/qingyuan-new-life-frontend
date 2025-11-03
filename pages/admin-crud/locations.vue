<template>
	<view class="admin-page-container">
		<view class="header">
			<text class="title">地点管理</text>
			<button class="primary-btn" @click="openCreateForm">
				<uni-icons type="plusempty" color="#fff" size="16"></uni-icons>
				新建
			</button>
		</view>

		<uni-list :border="true">
			<uni-list-item 
				v-for="item in locationList" 
				:key="item.uid"
				:title="item.name"
				:note="item.address || '未设置地址'"
				showArrow
				@click="handleItemOptions(item)"
			>
                </uni-list-item>
		</uni-list>
        
        <view v-if="locationList.length === 0" class="empty-state">
            <text>暂无地点，请点击“新建”来添加您的第一个工作室地点。</text>
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
					<input class="popup-input" v-model="formData.name" placeholder="请输入地点名称" />
					<input class="popup-input" v-model="formData.address" placeholder="请输入详细地址 (可选)" />
				</view>
			</uni-popup-dialog>
		</uni-popup>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
// 导入我们已经写好的所有 admin API
import { getLocations, createLocation, updateLocation, deleteLocation } from '@/api/admin.js';

// --- 1. 列表数据 ---
const locationList = ref([]);
const isLoading = ref(false);

const fetchLocations = async () => {
    isLoading.value = true;
	try {
		const data = await getLocations();
		locationList.value = data;
	} catch (error) {
		console.error('获取地点列表失败:', error);
		uni.showToast({ title: '加载失败', icon: 'error' });
	} finally {
        isLoading.value = false;
    }
};

// 页面加载时获取数据
onMounted(fetchLocations);


// --- 2. 表单弹窗逻辑 (与 H5 版本完全相同) ---
const formPopup = ref(null); // 弹窗 ref
const formTitle = ref('新建地点');
const isEditMode = ref(false);

const initialFormData = {
    uid: null,
    name: '',
    address: ''
};
const formData = ref({ ...initialFormData });

// 打开 "新建" 弹窗
const openCreateForm = () => {
	formTitle.value = '新建地点';
	isEditMode.value = false;
	formData.value = { ...initialFormData };
	formPopup.value.open();
};

// 打开 "编辑" 弹窗 (通过点击列表项)
const openEditForm = (item) => {
	formTitle.value = `编辑: ${item.name}`;
	isEditMode.value = true;
	formData.value = { ...item }; // 复制数据到表单
	formPopup.value.open();
};

const handleItemOptions = (item) => {
    uni.showActionSheet({
        itemList: ['编辑', '删除'],
        success: ({ tapIndex }) => {
            if (tapIndex === 0) {
                openEditForm(item);
            } else if (tapIndex === 1) {
                confirmDelete(item);
            }
        }
    });
};

const confirmDelete = (item) => {
    uni.showModal({
        title: '确认删除',
        content: `确定删除地点「${item.name}」吗？`,
        confirmText: '删除',
        confirmColor: '#e43d33',
        success: async (res) => {
            if (!res.confirm) {
                return;
            }
            await deleteLocationItem(item);
        }
    });
};

const deleteLocationItem = async (item) => {
    if (isLoading.value) return;
    isLoading.value = true;
    try {
        await deleteLocation(item.uid);
        uni.showToast({ title: '删除成功', icon: 'success' });
        await fetchLocations();
    } catch (error) {
        console.error('删除地点失败:', error);
        uni.showToast({ title: error.data?.detail || '删除失败', icon: 'error' });
    } finally {
        isLoading.value = false;
    }
};

// 提交表单 (新建或编辑)
const handleSubmit = async () => {
	if (!formData.value.name) {
		uni.showToast({ title: '名称不能为空', icon: 'none' });
		return;
	}
    
    // (防止重复提交)
    if (isLoading.value) return; 
    isLoading.value = true;

	try {
		if (isEditMode.value) {
			// --- 编辑模式 ---
			await updateLocation(formData.value.uid, {
				name: formData.value.name,
				address: formData.value.address
			});
			uni.showToast({ title: '更新成功', icon: 'success' });
		} else {
			// --- 新建模式 ---
			await createLocation({
				name: formData.value.name,
				address: formData.value.address
			});
			uni.showToast({ title: '创建成功', icon: 'success' });
		}
		
		formPopup.value.close();
		fetchLocations(); // 重新加载列表
		
	} catch (error) {
		console.error('提交失败:', error);
		uni.showToast({ title: error.data?.detail || '操作失败', icon: 'error' });
	} finally {
        isLoading.value = false;
    }
};
</script>

<style>
/* 引入我们为 H5 编写的全局 Admin 样式 (它在移动端同样适用) */
@import '/static/css/admin.css';

/* 弹窗表单的样式 (与 H5 版本相同) */
.popup-input {
	height: 40px;
	border: 1px solid #e5e5e5;
	border-radius: 4px;
	padding: 0 10px;
	margin-bottom: 10px;
}
.form-body {
	padding: 10px;
}
.empty-state {
    text-align: center;
    color: #888;
    padding: 40px 20px;
    background-color: #fff;
    border-radius: 8px;
    margin-top: 20px;
}
</style>
