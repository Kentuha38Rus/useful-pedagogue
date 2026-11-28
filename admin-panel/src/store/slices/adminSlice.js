import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const fetchStats = createAsyncThunk('admin/fetchStats', async (params = {}) => {
  const response = await api.get('/admin/stats', { params });
  return response.data;
});

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

// Полная карточка пользователя (для раскрытия родителя/учителя в дашборде)
export const fetchUserDetails = createAsyncThunk(
  'admin/fetchUserDetails',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Не удалось загрузить данные пользователя'
      );
    }
  }
);

// Ребёнка создаёт администратор для выбранного родителя
export const createChild = createAsyncThunk(
  'admin/createChild',
  async (childData, { rejectWithValue }) => {
    try {
      const response = await api.post('/children', childData);
      return response.data;
    } catch (err) {
      const errors = err.response?.data?.errors;
      return rejectWithValue(
        Array.isArray(errors) && errors.length
          ? errors.join('; ')
          : err.response?.data?.message || 'Не удалось добавить ребёнка'
      );
    }
  }
);

export const updateChild = createAsyncThunk(
  'admin/updateChild',
  async ({ id, ...childData }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/children/${id}`, childData);
      return response.data;
    } catch (err) {
      const errors = err.response?.data?.errors;
      return rejectWithValue(
        Array.isArray(errors) && errors.length
          ? errors.join('; ')
          : err.response?.data?.message || 'Не удалось сохранить ребёнка'
      );
    }
  }
);

// Карточка ребёнка для дашборда
export const fetchChildDetails = createAsyncThunk(
  'admin/fetchChildDetails',
  async (childId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/children/${childId}`);
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Не удалось загрузить данные ребёнка'
      );
    }
  }
);

// Карточка группы: состав, преподаватель, занятия текущей недели
export const fetchGroupDetails = createAsyncThunk(
  'admin/fetchGroupDetails',
  async (arg, { rejectWithValue }) => {
    try {
      const groupId = typeof arg === 'string' ? arg : arg.groupId;
      const date = typeof arg === 'string' ? undefined : arg.date;
      const response = await api.get(`/admin/groups/${groupId}`, {
        params: date ? { date } : {},
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Не удалось загрузить данные группы'
      );
    }
  }
);

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

// 👇 Добавлена обработка ошибок
export const createUser = createAsyncThunk('admin/createUser', async (userData, { rejectWithValue }) => {
  try {
    const response = await api.post('/admin/users', userData);
    return response.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Ошибка при создании пользователя');
  }
});

export const deleteUser = createAsyncThunk('admin/deleteUser', async (userId) => {
  await api.delete(`/admin/users/${userId}`);
  return userId;
});

export const updateUser = createAsyncThunk(
  'admin/updateUser',
  async ({ id, ...userData }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/admin/users/${id}`, userData);
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Не удалось сохранить пользователя'
      );
    }
  }
);

const getApiErrorMessage = (err, fallback) =>
  err.response?.data?.message || err.response?.data?.error || fallback;

export const createGroup = createAsyncThunk(
  'admin/createGroup',
  async (groupData, { rejectWithValue }) => {
    try {
      const response = await api.post('/admin/groups', groupData);
      return response.data;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Не удалось создать группу'));
    }
  }
);

export const updateGroup = createAsyncThunk(
  'admin/updateGroup',
  async ({ id, groupData }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/admin/groups/${id}`, groupData);
      return response.data;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Не удалось сохранить группу'));
    }
  }
);

export const deleteGroup = createAsyncThunk('admin/deleteGroup', async (groupId) => {
  await api.delete(`/admin/groups/${groupId}`);
  return groupId;
});

// Замена преподавателя на конкретном занятии
export const substituteLessonTeacher = createAsyncThunk(
  'admin/substituteLessonTeacher',
  async ({ lessonId, teacherId }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/admin/lessons/${lessonId}/substitute`, {
        teacherId,
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(
        getApiErrorMessage(err, 'Не удалось назначить преподавателя')
      );
    }
  }
);

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
  async ({ childId, groupId }, { rejectWithValue }) => {
    try {
      const response = await api.post('/admin/groups/add-child', {
        childId,
        groupId,
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(
        getApiErrorMessage(err, 'Не удалось добавить ребёнка в группу')
      );
    }
  }
);

export const removeChildFromGroup = createAsyncThunk(
  'admin/removeChildFromGroup',
  async ({ childId, groupId }, { rejectWithValue }) => {
    try {
      await api.delete('/admin/groups/remove-child', {
        data: { childId, groupId },
      });
      return { childId, groupId };
    } catch (err) {
      return rejectWithValue(
        getApiErrorMessage(err, 'Не удалось удалить ребёнка из группы')
      );
    }
  }
);

const initialState = {
  stats: null,
  salary: { period: {}, share: 0.4, teachers: [], totals: { revenue: 0, salary: 0 } },
  users: { total: 0, page: 1, totalPages: 1, users: [] },
  userDetails: { user: null, loading: false, error: null },
  childDetails: { child: null, loading: false, error: null },
  groupDetails: { group: null, loading: false, error: null },
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
      .addCase(fetchUserDetails.pending, (state) => {
        state.userDetails.loading = true;
        state.userDetails.error = null;
      })
      .addCase(fetchUserDetails.fulfilled, (state, action) => {
        state.userDetails.loading = false;
        state.userDetails.user = action.payload;
      })
      .addCase(fetchUserDetails.rejected, (state, action) => {
        state.userDetails.loading = false;
        state.userDetails.error = action.payload || 'Ошибка загрузки';
      })
      .addCase(fetchChildDetails.pending, (state) => {
        state.childDetails.loading = true;
        state.childDetails.error = null;
      })
      .addCase(fetchChildDetails.fulfilled, (state, action) => {
        state.childDetails.loading = false;
        state.childDetails.child = action.payload;
      })
      .addCase(fetchChildDetails.rejected, (state, action) => {
        state.childDetails.loading = false;
        state.childDetails.error = action.payload || 'Ошибка загрузки';
      })
      .addCase(fetchGroupDetails.pending, (state) => {
        state.groupDetails.loading = true;
        state.groupDetails.error = null;
      })
      .addCase(fetchGroupDetails.fulfilled, (state, action) => {
        state.groupDetails.loading = false;
        state.groupDetails.group = action.payload;
      })
      .addCase(fetchGroupDetails.rejected, (state, action) => {
        state.groupDetails.loading = false;
        state.groupDetails.error = action.payload || 'Ошибка загрузки';
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
      .addCase(updateUser.fulfilled, (state, action) => {
        const updated = action.payload;
        if (!updated) return;
        const index = state.users.users.findIndex(u => u.id === updated.id);
        if (index !== -1) {
          state.users.users[index] = {
            ...state.users.users[index],
            ...updated,
          };
        }
        if (state.userDetails.user?.id === updated.id) {
          state.userDetails.user = updated;
        }
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