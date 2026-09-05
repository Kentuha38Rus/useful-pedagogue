import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';
import { handleApiError } from '../../utils/helpers';

export const login = createAsyncThunk(
  'auth/login',
  async ({ identifier, password }, thunkAPI) => {
    try {
      const res = await api.post('/auth/login', { identifier, password });
      const { accessToken, refreshToken, user } = res.data;
      if (accessToken) localStorage.setItem('token', accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      return user;
    } catch (err) {
      return thunkAPI.rejectWithValue(handleApiError(err));
    }
  }
);

export const loadUser = createAsyncThunk('auth/loadUser', async (_, thunkAPI) => {
  try {
    const res = await api.get('/users/me');
    return res.data;
  } catch (err) {
    // При любой ошибке (включая таймаут) чистим токены
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return thunkAPI.rejectWithValue(handleApiError(err));
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  return null;
});

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  loginLoading: false,
  error: null,
  initialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // Принудительная инициализация (для случаев, когда loadUser завис)
    forceInitialized: (state) => {
      state.initialized = true;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loginLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loginLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.initialized = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loginLoading = false;
        state.error = action.payload || 'Ошибка входа';
        state.initialized = true;
      })
      .addCase(loadUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.initialized = true;
      })
      .addCase(loadUser.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.initialized = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.loginLoading = false;
        state.initialized = true;
      });
  },
});

export const { clearError, forceInitialized } = authSlice.actions;
export default authSlice.reducer;