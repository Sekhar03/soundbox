import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchData',
  async (filters: { bankIds?: string; years?: string; dateFilter?: string; fromDate?: string; toDate?: string } | undefined, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters?.bankIds) params.append('bankIds', filters.bankIds);
      if (filters?.years) params.append('years', filters.years);
      if (filters?.dateFilter) params.append('dateFilter', filters.dateFilter);
      if (filters?.fromDate) params.append('fromDate', filters.fromDate);
      if (filters?.toDate) params.append('toDate', filters.toDate);
      
      const response = await api.get(`/dashboard/data?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard data');
    }
  }
);

interface DashboardState {
  summary: any[];
  pivot: any[];
  graphData: any[];
  availableBanks: any[];
  availableYears: number[];
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  summary: [],
  pivot: [],
  graphData: [],
  availableBanks: [],
  availableYears: [],
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload.summary;
        state.pivot = action.payload.pivot;
        state.graphData = action.payload.graphData;
        state.availableBanks = action.payload.availableBanks;
        state.availableYears = action.payload.availableYears;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default dashboardSlice.reducer;
