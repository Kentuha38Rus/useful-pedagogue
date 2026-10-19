import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const fetchMySchedule = createAsyncThunk(
  'schedule/fetchMySchedule',
  async (_, thunkAPI) => {
    try {
      const res = await api.get('/schedule/me');
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || 'Ошибка загрузки расписания'
      );
    }
  }
);

const initialState = {
  lessons: [],
  loading: false,
  error: null,
};

const scheduleSlice = createSlice({
  name: 'schedule',
  initialState,
  reducers: {
    clearSchedule: (state) => {
      state.lessons = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMySchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMySchedule.fulfilled, (state, action) => {
        state.loading = false;
        state.lessons = action.payload;
      })
      .addCase(fetchMySchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSchedule } = scheduleSlice.actions;
export default scheduleSlice.reducer;