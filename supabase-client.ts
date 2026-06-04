import { createClient } from '@supabase/supabase-js';
import { LedgerEntry, Customer } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function addLedgerEntry(
  type: 'sale' | 'payment',
  customerName: string,
  quantity?: number,
  amount?: number,
  description?: string
): Promise<LedgerEntry | null> {
  try {
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('name', customerName)
      .maybeSingle();

    if (!customer) {
      await supabase.from('customers').insert([
        {
          name: customerName,
          balance: 0,
          last_transaction: new Date().toISOString(),
        },
      ]);
    }

    const { data, error } = await supabase
      .from('ledger_entries')
      .insert([
        {
          type,
          customer_name: customerName,
          quantity: quantity || null,
          amount: amount || null,
          description: description || '',
          created_at: new Date().toISOString(),
          created_date: new Date().toISOString().split('T')[0],
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error adding ledger entry:', error);
    return null;
  }
}

export async function getTodayStats() {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('created_date', today)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const entries: LedgerEntry[] = data || [];

    const totalKret = entries
      .filter((e) => e.type === 'sale')
      .reduce((sum, e) => sum + (e.quantity || 0), 0);

    const totalPayments = entries
      .filter((e) => e.type === 'payment')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      totalKretToday: totalKret,
      totalPaymentsToday: totalPayments,
      entries,
    };
  } catch (error) {
    console.error('Error fetching today stats:', error);
    return {
      totalKretToday: 0,
      totalPaymentsToday: 0,
      entries: [],
    };
  }
}

export async function getAllEntries(): Promise<LedgerEntry[]> {
  try {
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    return (data as LedgerEntry[]) || [];
  } catch (error) {
    console.error('Error fetching entries:', error);
    return [];
  }
}

export async function getCustomers(): Promise<Customer[]> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('last_transaction', { ascending: false });

    if (error) throw error;

    return (data as Customer[]) || [];
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
}

export async function getCustomerHistory(name: string) {
  try {
    const { data } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('customer_name', name)
      .order('created_at', { ascending: false });

    let kret = 0;
    let payment = 0;

    (data || []).forEach((e) => {
      if (e.type === 'sale') kret += e.quantity || 0;
      else payment += e.amount || 0;
    });

    return {
      entries: data || [],
      totalKret: kret,
      totalPayment: payment,
    };
  } catch (err) {
    console.error('Error fetching customer history:', err);
    return {
      entries: [],
      totalKret: 0,
      totalPayment: 0,
    };
  }
}

export async function getTodayEntries(): Promise<LedgerEntry[]> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('created_date', today)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (err) {
    console.error('Error fetching today entries:', err);
    return [];
  }
}