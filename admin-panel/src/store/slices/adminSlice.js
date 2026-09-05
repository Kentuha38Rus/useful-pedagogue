import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const fetchStats = createAsyncThunk('admin/fetchStats', async () => {
  const response = await api.get('/admin/stats');
  return response.data;
});

export const fetchUsers = createAsyncThunk('admin/fetchUsers', async (params = {}) => {
  const response = await api.get('/admin/users', { params });
  return response.data;
});

export const fetchTeachers = createAsyncThunk('admin/fetchTeachers', async () => {
  const response = await api.get('/admin/users', { params: { role: 'teacher', limit: 100 } });
  return response.data.users;
});

export const fetchGroups = createAsyncThunk('admin/fetchGroups', async () => {
  const response = await api.get('/admin/groups');
  return response.data;
});

export const fetchCourses = createAsyncThunk('admin/fetchCourses', async () => {
  const response = await api.get('/admin/courses');
  return response.data;
});

export const fetchPayments = createAsyncThunk('admin/fetchPayments', async () => {
  const response = await api.get('/admin/payments');
  return response.data;
});

export const updateUserRole = createAsyncThunk(
  'admin/updateUserRole',
  async ({ userId, role }) => {
    const response = await api.patch(`/admin/users/${userId}/role`, { role });
    return response.data;
  }
);

export const createUser = createAsyncThunk(
  'admin/createUser',
  async (userData) => {
    const response = await api.post('/admin/users', userData);
    return response.data;
  }
);

export const deleteUser = createAsyncThunk(
  'admin/deleteUser',
  async (userId) => {
    await api.delete(`/admin/users/${userId}`);
    return userId;
  }
);

export const createGroup = createAsyncThunk('admin/createGroup', async (groupData) => {
  const response = await api.post('/admin/groups', groupData);
  return response.data;
});

export const updateGroup = createAsyncThunk(
  'admin/updateGroup',
  async ({ id, groupData }) => {
    const response = await api.patch(`/admin/groups/${id}`, groupData);
    return response.data;
  }
);

export const deleteGroup = createAsyncThunk('admin/deleteGroup', async (groupId) => {
  await api.delete(`/admin/groups/${groupId}`);
  return groupId;
});

export const createCourse = createAsyncThunk('admin/createCourse', async (courseData) => {
  const response = await api.post('/admin/courses', courseData);
  return response.data;
});

export const deleteCourse = createAsyncThunk('admin/deleteCourse', async (courseId) => {
  await api.delete(`/admin/courses/${courseId}`);
  return courseId;
});

export const fetchAvailableChildren = createAsyncThunk('admin/fetchAvailableChildren', async () => {
  const response = await api.get('/admin/children/available');
  return response.data;
});

export const addChildToGroup = createAsyncThunk(
  'admin/addChildToGroup',
  async ({ childId, groupId }) => {
    const response = await api.post('/admin/groups/add-child', { childId, groupId });
    return response.data;
  }
);

export const removeChildFromGroup = createAsyncThunk(
  'admin/removeChildFromGroup',
  async (childId) => {
    const response = await api.delete('/admin/groups/remove-child', { data: { childId } });
    return childId;
  }
);

const initialState = {
  stats: null,
  users: { total: 0, page: 1, totalPages: 1, users: [] },
  teachers: [],
  groups: [],
  courses: [],
  payments: [],
  availableChildren: [],
  loading: false,
  error: null,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStats.pending, (state) => { state.loading = true; })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users = action.payload;
      })
      .addCase(fetchTeachers.fulfilled, (state, action) => {
        state.teachers = action.payload;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.users.users.unshift(action.payload);
        state.users.total += 1;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users.users = state.users.users.filter(u => u.id !== action.payload);
        state.users.total -= 1;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.groups = action.payload;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.groups.push(action.payload);
      })
      .addCase(updateGroup.fulfilled, (state, action) => {
        const index = state.groups.findIndex(g => g.id === action.payload.id);
        if (index !== -1) {
          state.groups[index] = action.payload;
        }
      })
      .addCase(deleteGroup.fulfilled, (state, action) => {
        state.groups = state.groups.filter(g => g.id !== action.payload);
      })
      .addCase(fetchAvailableChildren.fulfilled, (state, action) => {
        state.availableChildren = action.payload;
      })
      .addCase(addChildToGroup.fulfilled, (state, action) => {
        state.availableChildren = state.availableChildren.filter(
          child => child.id !== action.payload.id
        );
        const group = state.groups.find(g => g.id === action.payload.groupId);
        if (group) {
          if (!group.children) group.children = [];
          group.children.push(action.payload);
        }
      })
      .addCase(addChildToGroup.rejected, (state, action) => {
        state.error = action.error.message;
      })
      .addCase(removeChildFromGroup.fulfilled, (state, action) => {
        // Можно обновить состояние, но проще перезапросить группы
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.courses = action.payload;
      })
      .addCase(createCourse.fulfilled, (state, action) => {
        state.courses.push(action.payload);
      })
      .addCase(deleteCourse.fulfilled, (state, action) => {
        state.courses = state.courses.filter(c => c.id !== action.payload);
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.payments = action.payload;
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        const updated = action.payload.user;
        const index = state.users.users.findIndex(u => u.id === updated.id);
        if (index !== -1) {
          state.users.users[index].role = updated.role;
        }
      });
  },
});

export default adminSlice.reducer;