/**
 * Database Operations
 * 
 * All CRUD operations for expenses.
 * Uses Supabase when available, falls back to localStorage.
 * Each function returns { data, error } following Supabase convention.
 */

// ============================================================
// LocalStorage Engine (fallback)
// ============================================================

const LS_KEY = 'expense_tracker_data';

function lsGetAll() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function lsSaveAll(expenses) {
  localStorage.setItem(LS_KEY, JSON.stringify(expenses));
}

function generateUUID() {
  // Simple UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================================
// Fetch expenses for a given month
// ============================================================

async function fetchExpenses(year, month) {
  // Try Supabase first
  if (supabaseClient && !useLocalStorage) {
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabaseClient
        .from('expenses')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist, switch to localStorage
        if (error.code === 'PGRST205' || error.code === '42P01') {
          console.warn('Supabase table not found, switching to localStorage. Run database/schema.sql in your Supabase SQL Editor.');
          useLocalStorage = true;
        } else {
          throw error;
        }
      } else {
        return { data, error: null };
      }
    } catch (err) {
      // Network/auth errors — fall back to localStorage
      console.warn('Supabase unavailable, using localStorage:', err.message || err);
      useLocalStorage = true;
    }
  }

  // localStorage fallback
  const all = lsGetAll();
  const filtered = all.filter(function (exp) {
    const d = new Date(exp.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  });

  // Sort by date descending, then created_at descending
  filtered.sort(function (a, b) {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return (b.created_at || '').localeCompare(a.created_at || '');
  });

  return { data: filtered, error: null };
}

// ============================================================
// Search expenses within a month
// ============================================================

async function searchExpenses(year, month, query) {
  if (supabaseClient && !useLocalStorage) {
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabaseClient
        .from('expenses')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .ilike('details', `%${query}%`)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.warn('Supabase search failed, using localStorage:', err.message || err);
      useLocalStorage = true;
    }
  }

  // localStorage fallback
  const result = await fetchExpenses(year, month);
  const q = query.toLowerCase();
  const filtered = (result.data || []).filter(function (exp) {
    return exp.details.toLowerCase().includes(q);
  });
  return { data: filtered, error: null };
}

// ============================================================
// Create a new expense
// ============================================================

async function createExpense(expense) {
  if (supabaseClient && !useLocalStorage) {
    try {
      const { data, error } = await supabaseClient
        .from('expenses')
        .insert({
          date: expense.date,
          details: expense.details.trim(),
          price: Number(expense.price),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.warn('Supabase create failed, using localStorage:', err.message || err);
      useLocalStorage = true;
    }
  }

  // localStorage fallback
  const all = lsGetAll();
  const newExpense = {
    id: generateUUID(),
    date: expense.date,
    details: expense.details.trim(),
    price: Number(expense.price),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  all.push(newExpense);
  lsSaveAll(all);
  return { data: newExpense, error: null };
}

// ============================================================
// Update an existing expense
// ============================================================

async function updateExpense(id, updates) {
  if (supabaseClient && !useLocalStorage) {
    try {
      const { data, error } = await supabaseClient
        .from('expenses')
        .update({
          date: updates.date,
          details: updates.details.trim(),
          price: Number(updates.price),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.warn('Supabase update failed, using localStorage:', err.message || err);
      useLocalStorage = true;
    }
  }

  // localStorage fallback
  const all = lsGetAll();
  const idx = all.findIndex(function (exp) { return exp.id === id; });
  if (idx === -1) {
    return { data: null, error: { message: 'Expense not found' } };
  }
  all[idx].date = updates.date;
  all[idx].details = updates.details.trim();
  all[idx].price = Number(updates.price);
  all[idx].updated_at = new Date().toISOString();
  lsSaveAll(all);
  return { data: all[idx], error: null };
}

// ============================================================
// Delete an expense
// ============================================================

async function deleteExpense(id) {
  if (supabaseClient && !useLocalStorage) {
    try {
      const { error } = await supabaseClient
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      console.warn('Supabase delete failed, using localStorage:', err.message || err);
      useLocalStorage = true;
    }
  }

  // localStorage fallback
  const all = lsGetAll();
  const filtered = all.filter(function (exp) { return exp.id !== id; });
  lsSaveAll(filtered);
  return { error: null };
}
