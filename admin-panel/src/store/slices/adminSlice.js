import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

// 👇 принимаем { date: 'YYYY-MM-DD' } и передаём как query
export const fetchStats = createAsyncThunk('admin/fetchStats', async (params = {}) => {
  const response = await api.get('/admin/stats', { params });
  return response.data;
});

// 👇 Уведомить всех по сегодняшним занятиям (родители + преподаватели)
export const notifyTodayLessons = createAsyncThunk(
  'admin/notifyTodayLessons',
  async ({ date } = {}, { rejectWithValue }) => {
    try {
      const response = await api.post('/admin/lessons/notify-today', { date });
      return response.data;
    } catch (err) {
      const data = err.response?.data || { message: err.message };
      return rejectWithValue(data);
    }
  }
);

export const fetchSalary = createAsyncThunk(
  'admin/fetchSalary',
  async (params = {}) => {
    const response = await api.get('/admin/salary', { params });
    return response.data;
  }
);

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

export const createUser = createAsyncThunk('admin/createUser', async (userData) => {
  const response = await api.post('/admin/users', userData);
  return response.data;
});

export const deleteUser = createAsyncThunk('admin/deleteUser', async (userId) => {
  await api.delete(`/admin/users/${userId}`);
  return userId;
});

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
  async ({ childId, groupId }) => {
    const response = await api.delete('/admin/groups/remove-child', {
      data: { childId, groupId },
    });
    return { childId, groupId };
  }
);

const initialState = {
  stats: null,
  salary: { period: {}, share: 0.4, teachers: [], totals: { revenue: 0, salary: 0 } },
  users: { total: 0, page: 1, totalPages: 1, users: [] },
  teachers: [],
  groups: [],
  courses: [],
  payments: [],
  availableChildren: [],
  loading: false,
  error: null,
  notify: {
    loading: false,
    message: null,
    error: null,
    retryAfterSec: null,
  },
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearNotifyState: (state) => {
      state.notify = { loading: false, message: null, error: null, retryAfterSec: null };
    },
  },
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
      .addCase(notifyTodayLessons.pending, (state) => {
        state.notify.loading = true;
        state.notify.message = null;
        state.notify.error = null;
        state.notify.retryAfterSec = null;
      })
      .addCase(notifyTodayLessons.fulfilled, (state, action) => {
        state.notify.loading = false;
        state.notify.message = action.payload.message || 'Уведомления отправлены.';
      })
      .addCase(notifyTodayLessons.rejected, (state, action) => {
        state.notify.loading = false;
        state.notify.error =
          action.payload?.message || action.error?.message || 'Не удалось отправить.';
        state.notify.retryAfterSec = action.payload?.retryAfterSec ?? null;
      })
      .addCase(fetchSalary.pending, (state) => { state.loading = true; })
      .addCase(fetchSalary.fulfilled, (state, action) => {
        state.loading = false;
        state.salary = action.payload;
      })
      .addCase(fetchSalary.rejected, (state, action) => {
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
        if (index !== -1) state.groups[index] = action.payload;
      })
      .addCase(deleteGroup.fulfilled, (state, action) => {
        state.groups = state.groups.filter(g => g.id !== action.payload);
      })
      .addCase(fetchAvailableChildren.fulfilled, (state, action) => {
        state.availableChildren = action.payload;
      })
      .addCase(addChildToGroup.fulfilled, (state) => {
        // Лучше перезапросить группы
      })
      .addCase(removeChildFromGroup.fulfilled, (state) => {
        // перезапросить группы
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
        if (index !== -1) state.users.users[index].role = updated.role;
      });
  },
});

export const { clearNotifyState } = adminSlice.actions;
export default adminSlice.reducer;