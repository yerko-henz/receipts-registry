import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types';

export enum ClientType {
  SERVER = 'server',
  SPA = 'spa'
}

export class SassClient {
  private client: SupabaseClient<Database, 'public', 'public'>;
  private clientType: ClientType;

  constructor(client: SupabaseClient<Database, 'public', 'public'>, clientType: ClientType) {
    this.client = client;
    this.clientType = clientType;
  }

  async loginEmail(email: string, password: string) {
    return this.client.auth.signInWithPassword({
      email: email,
      password: password
    });
  }

  async registerEmail(email: string, password: string, slug?: string) {
    return this.client.auth.signUp({
      email: email,
      password: password,
      options: {
        data: slug ? { slug: slug } : {}
      }
    });
  }

  async exchangeCodeForSession(code: string) {
    return this.client.auth.exchangeCodeForSession(code);
  }

  async resendVerificationEmail(email: string) {
    return this.client.auth.resend({
      email: email,
      type: 'signup'
    });
  }

  async verifyOtp(email: string, token: string) {
    return this.client.auth.verifyOtp({
      email,
      token,
      type: 'signup'
    });
  }

  async logout() {
    const { error } = await this.client.auth.signOut({
      scope: 'local'
    });
    if (error) throw error;
    if (this.clientType === ClientType.SPA) {
      window.location.href = '/auth/login';
    }
  }

  async uploadFile(myId: string, filename: string, file: File) {
    filename = filename.replace(/[^0-9a-zA-Z!\-_.*'()]/g, '_');
    filename = myId + '/' + filename;
    return this.client.storage.from('files').upload(filename, file);
  }

  async getFiles(myId: string) {
    return this.client.storage.from('files').list(myId);
  }

  async deleteFile(myId: string, filename: string) {
    filename = myId + '/' + filename;
    return this.client.storage.from('files').remove([filename]);
  }

  async shareFile(myId: string, filename: string, timeInSec: number, forDownload: boolean = false) {
    filename = myId + '/' + filename;
    return this.client.storage.from('files').createSignedUrl(filename, timeInSec, {
      download: forDownload
    });
  }

  async getQuestions(page: number = 1, pageSize: number = 50, order: string = 'created_at', status: string | null = null) {
    let query = this.client
      .from('questions')
      .select('*')
      .range(page * pageSize - pageSize, page * pageSize - 1)
      .order(order, { ascending: false });

    if (status) query = query.eq('status', status);

    return query;
  }

  async getQuestion(id: string) {
    return this.client.from('questions').select('*').eq('id', id).single();
  }

  async deleteQuestion(id: string) {
    return this.client.from('questions').delete().eq('id', id);
  }

  async answerQuestion(id: string, answer: string) {
    return this.client
      .from('questions')
      .update({
        answer_text: answer,
        answered_at: new Date().toISOString(),
        status: 'answered'
      })
      .eq('id', id)
      .single();
  }

  // USERS CRUD

  async getUsers(page: number = 1, pageSize: number = 50, order: string = 'created_at') {
    return this.client
      .from('users')
      .select('*')
      .range(page * pageSize - pageSize, page * pageSize - 1)
      .order(order, { ascending: false });
  }

  async getUser(id: string) {
    return this.client.from('users').select('*').eq('id', id).single();
  }

  async getUserBySlug(slug: string) {
    return this.client.from('users').select('*').eq('slug', slug).single();
  }

  async createUser(row: Database['public']['Tables']['users']['Insert']) {
    return this.client.from('users').insert(row).single();
  }

  async updateUser(id: string, patch: Database['public']['Tables']['users']['Update']) {
    return this.client.from('users').update(patch).eq('id', id).single();
  }

  async deleteUser(id: string) {
    return this.client.from('users').delete().eq('id', id);
  }

  getSupabaseClient() {
    return this.client;
  }
}
