import { supabase } from './supabase';
import type { Household } from './types';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(length = 8): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export async function createHousehold(name: string): Promise<Household> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    const { data, error } = await supabase
      .from('households')
      .insert({ code, name: name.trim() || 'Vårt hushåll' })
      .select()
      .single();

    if (!error && data) {
      return data as Household;
    }

    if (error?.code !== '23505') {
      throw error;
    }
  }

  throw new Error('Kunde inte skapa hushåll. Försök igen.');
}

export async function joinHousehold(code: string): Promise<Household> {
  const normalized = code.trim().toUpperCase();
  const { data, error } = await supabase
    .from('households')
    .select('*')
    .eq('code', normalized)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Inget hushåll hittades med den koden.');

  return data as Household;
}

export async function getHousehold(id: string): Promise<Household | null> {
  const { data, error } = await supabase
    .from('households')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data as Household) ?? null;
}
