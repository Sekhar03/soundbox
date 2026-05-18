import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchIndents = createAsyncThunk(
  'indent/fetchIndents',
  async (params: any, { rejectWithValue }) => {
    try {
      const response = await api.get('/indents', { params });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch indents');
    }
  }
);

export const updateIndentStatus = createAsyncThunk(
  'indent/updateStatus',
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/indents/${id}/status`, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update status');
    }
  }
);

export const createIndent = createAsyncThunk(
  'indent/createIndent',
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await api.post('/indents', data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create indent');
    }
  }
);

interface IndentState {
  items: any[];
  loading: boolean;
  error: string | null;
}

const initialState: IndentState = {
  items: [],
  loading: false,
  error: null,
};

const indentSlice = createSlice({
  name: 'indent',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIndents.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchIndents.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchIndents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateIndentStatus.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(createIndent.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      });
  },
});

export default indentSlice.reducer;
