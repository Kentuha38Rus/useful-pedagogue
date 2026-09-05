import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const fetchSchedule = createAsyncThunk('schedule/fetchSchedule', async (childId) => {
  const res = await api.get(`/schedule/${childId || ''}`);
  return res.data;
});

const initialState = {
  lessons: [],
  loading: false,
};

const scheduleSlice = createSlice({
  name: 'schedule',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchedule.pending, (state) => { state.loading = true; })
      .addCase(fetchSchedule.fulfilled, (state, action) => {
        state.loading = false;
        state.lessons = action.payload;
      })
      .addCase(fetchSchedule.rejected, (state) => {
        state.loading = false;
      });
  }
});

export default scheduleSlice.reducer;