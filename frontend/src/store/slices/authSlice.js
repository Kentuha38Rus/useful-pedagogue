import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';
import { getImpersonation, stopImpersonation } from '../../utils/impersonation';

export const loadUser = createAsyncThunk('auth/loadUser', async (_, thunkAPI) => {
  try {
    const res = await api.get('/users/me');
    return res.data;
  } catch (err) {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return thunkAPI.rejectWithValue(getErrorMessage(err, 'Не удалось загрузить пользователя'));
  }
});

export const fetchChildren = createAsyncThunk('auth/fetchChildren', async () => {
  const res = await api.get('/children');
  return res.data;
});

export const login = createAsyncThunk('auth/login', async (credentials, thunkAPI) => {
  try {
    const res = await api.post('/auth/login', credentials);
    const { accessToken, refreshToken, user } = res.data;
    if (accessToken) localStorage.setItem('token', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    // user из login уже содержит tenantSlug/tenantName/isPlatformAdmin
    return user;
  } catch (err) {
    return thunkAPI.rejectWithValue(getErrorMessage(err, 'Ошибка входа'));
  }
});

export const register = createAsyncThunk('auth/register', async (userData, thunkAPI) => {
  try {
    const res = await api.post('/auth/register', userData);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(getErrorMessage(err, 'Ошибка регистрации'));
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  stopImpersonation();
  return null;
});

export const fetchCourses = createAsyncThunk('auth/fetchCourses', async () => {
  const res = await api.get('/courses');
  return res.data;
});

export const addChildThunk = createAsyncThunk(
  'auth/addChildThunk',
  async (childData, thunkAPI) => {
    try {
      const res = await api.post('/children', childData);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(getErrorMessage(err, 'Не удалось добавить ребёнка'));
    }
  }
);

export const updateChildThunk = createAsyncThunk(
  'auth/updateChildThunk',
  async ({ id, ...data }, thunkAPI) => {
    try {
      const res = await api.patch(`/children/${id}`, data);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(getErrorMessage(err, 'Не удалось обновить ребёнка'));
    }
  }
);

export const removeChildThunk = createAsyncThunk(
  'auth/removeChildThunk',
  async (id, thunkAPI) => {
    try {
      await api.delete(`/children/${id}`);
      return id;
    } catch (err) {
      return thunkAPI.rejectWithValue(getErrorMessage(err, 'Не удалось удалить ребёнка'));
    }
  }
);

const initialImpersonation = getImpersonation();

const initialState = {
  user: null,
  children: [],
  courses: [],
  settings: { pushEnabled: true },
  isAuthenticated: false,
  // Мультитенантность
  tenant: null,            // { id, slug, name } — текущий тенант
  isPlatformAdmin: false,  // role === 'platform_admin'
  effectiveRole: null,     // 'admin' при имперсонации, иначе role
  impersonation: initialImpersonation, // { id, name } | null
  // UI-статусы
  loading: false,
  loginLoading: false,
  registerLoading: false,
  error: null,
};

// Хелпер: обновить tenant/isPlatformAdmin/effectiveRole/impersonation из user
const applyUserToState = (state, user) => {
  state.user = user;
  state.isAuthenticated = !!user;
  state.isPlatformAdmin =
    !!user?.isPlatformAdmin || user?.role === 'platform_admin';
  state.effectiveRole = user?.effectiveRole || user?.role || null;
  state.impersonation = getImpersonation();

  if (user?.tenantSlug) {
    state.tenant = {
      id: user.tenantId,
      slug: user.tenantSlug,
      name: user.tenantName,
    };
  } else {
    state.tenant = null;
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    addChild: (state, action) => {
      state.children.push(action.payload);
    },
    updateChild: (state, action) => {
      const idx = state.children.findIndex((c) => c.id === action.payload.id);
      if (idx !== -1) state.children[idx] = action.payload;
    },
    removeChild: (state, action) => {
      state.children = state.children.filter((c) => c.id !== action.payload);
    },
    updateSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    setUser: (state, action) => {
      applyUserToState(state, action.payload);
    },
    refreshImpersonation: (state) => {
      state.impersonation = getImpersonation();
    },
    clearAuth: (state) => {
      state.user = null;
      state.children = [];
      state.isAuthenticated = false;
      state.tenant = null;
      state.isPlatformAdmin = false;
      state.effectiveRole = null;
      state.impersonation = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.loading = false;
        applyUserToState(state, action.payload);
      })
      .addCase(loadUser.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.children = [];
        state.tenant = null;
        state.isPlatformAdmin = false;
        state.effectiveRole = null;
        state.impersonation = null;
      })
      .addCase(fetchChildren.fulfilled, (state, action) => {
        state.children = action.payload;
      })
      .addCase(login.pending, (state) => {
        state.loginLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loginLoading = false;
        applyUserToState(state, action.payload);
      })
      .addCase(login.rejected, (state, action) => {
        state.loginLoading = false;
        state.error = action.payload || 'Ошибка входа';
      })
      .addCase(register.pending, (state) => {
        state.registerLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.registerLoading = false;
        // После регистрации пользователь не аутентифицирован (нет токенов).
        // Авто-логин делает RegisterPage через dispatch(login(...)).
      })
      .addCase(register.rejected, (state, action) => {
        state.registerLoading = false;
        state.error = action.payload || 'Ошибка регистрации';
      })
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.children = [];
        state.tenant = null;
        state.isPlatformAdmin = false;
        state.effectiveRole = null;
        state.impersonation = null;
        state.loginLoading = false;
        state.registerLoading = false;
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.courses = action.payload;
      })
      .addCase(addChildThunk.fulfilled, (state, action) => {
        state.children.push(action.payload);
      })
      .addCase(updateChildThunk.fulfilled, (state, action) => {
        const idx = state.children.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.children[idx] = action.payload;
      })
      .addCase(removeChildThunk.fulfilled, (state, action) => {
        state.children = state.children.filter((c) => c.id !== action.payload);
      });
  },
});

export const {
  addChild,
  updateChild,
  removeChild,
  updateSettings,
  setUser,
  clearAuth,
  refreshImpersonation,
} = authSlice.actions;

export default authSlice.reducer;