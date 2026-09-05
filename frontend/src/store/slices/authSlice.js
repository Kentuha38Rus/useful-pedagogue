import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';
import { handleApiError } from '../../utils/helpers';

// Thunks
export const loadUser = createAsyncThunk('auth/loadUser', async (_, thunkAPI) => {
  try {
    const res = await api.get('/users/me');
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(handleApiError(err));
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
    return user;
  } catch (err) {
    return thunkAPI.rejectWithValue(handleApiError(err));
  }
});

export const register = createAsyncThunk('auth/register', async (userData, thunkAPI) => {
  try {
    const res = await api.post('/auth/register', userData);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(handleApiError(err));
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
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
      return thunkAPI.rejectWithValue(handleApiError(err));
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
      return thunkAPI.rejectWithValue(handleApiError(err));
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
      return thunkAPI.rejectWithValue(handleApiError(err));
    }
  }
);

const initialState = {
  user: null,
  children: [],
  courses: [],
  settings: { pushEnabled: true },
  isAuthenticated: false,
  loading: false,       // для loadUser
  loginLoading: false,  // для логина
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    addChild: (state, action) => {
      state.children.push(action.payload);
    },
    updateChild: (state, action) => {
      const idx = state.children.findIndex(c => c.id === action.payload.id);
      if (idx !== -1) state.children[idx] = action.payload;
    },
    removeChild: (state, action) => {
      state.children = state.children.filter(c => c.id !== action.payload);
    },
    updateSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    clearAuth: (state) => {
      state.user = null;
      state.children = [];
      state.isAuthenticated = false;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(loadUser.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.children = [];
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
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.loginLoading = false;
        state.error = action.payload || 'Ошибка входа';
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = false;
        state.children = [];
      })
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.children = [];
        state.loginLoading = false;
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.courses = action.payload;
      })
      .addCase(addChildThunk.fulfilled, (state, action) => {
        state.children.push(action.payload);
      })
      .addCase(updateChildThunk.fulfilled, (state, action) => {
        const idx = state.children.findIndex(c => c.id === action.payload.id);
        if (idx !== -1) state.children[idx] = action.payload;
      })
      .addCase(removeChildThunk.fulfilled, (state, action) => {
        state.children = state.children.filter(c => c.id !== action.payload);
      });
  }
});

export const { addChild, updateChild, removeChild, updateSettings, setUser, clearAuth } = authSlice.actions;
export default authSlice.reducer;