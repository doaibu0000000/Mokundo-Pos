import { db } from './db';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { APP_CONFIG } from '../config';

export class SyncService {
  private static isSyncing = false;
  private static supabase: SupabaseClient | null = null;
  private static realtimeChannel: any = null;

  // Listen to network changes and sync
  public static init() {
    window.addEventListener('online', () => {
      console.log('Device is online, triggering sync...');
      this.syncAll().catch(err => console.error('Sync error on network return:', err));
      this.pullMasterData()
        .then((ok) => {
          if (ok) window.dispatchEvent(new CustomEvent('masterdata-updated'));
        })
        .catch(err => console.error('Pull master data error on network return:', err));
    });
  }

  // Get configured Supabase URL and key (with fallback to hardcoded config)
  public static async getSupabaseConfig() {
    const storeConfig = await db.stores.toCollection().first();
    const url = storeConfig?.supabase_url || APP_CONFIG.SUPABASE_URL;
    const key = storeConfig?.supabase_anon_key || APP_CONFIG.SUPABASE_ANON_KEY;
    
    // Anggap aktif jika URL dan Key ada (baik dari lokal maupun hardcoded)
    if (!url || !key) {
      return null;
    }
    return {
      url: url.replace(/\/$/, ''),
      key: key,
    };
  }

  // Alias for backward compatibility internally
  private static async getConfig() {
    return this.getSupabaseConfig();
  }

  // Subscribe to Supabase Realtime for instant cross-device updates
  public static async subscribeToRealtime() {
    if (this.realtimeChannel) return; // already subscribed

    const cfg = await this.getConfig();
    if (!cfg) return;

    if (!this.supabase) {
      this.supabase = createClient(cfg.url, cfg.key);
    }

    console.log('[Realtime] Connecting to Supabase Realtime...');

    this.realtimeChannel = this.supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, async (payload: any) => {
        const { table, eventType, new: newRecord, old: oldRecord } = payload;
        console.log(`[Realtime] ${eventType} on ${table}`, newRecord || oldRecord);

        try {
          if (table === 'products') {
            if (eventType === 'DELETE') {
              await db.products.delete(oldRecord.id);
            } else if (newRecord?.id) {
              await db.products.put({
                ...newRecord,
                varian: Array.isArray(newRecord.varian)
                  ? newRecord.varian
                  : (typeof newRecord.varian === 'string' ? JSON.parse(newRecord.varian) : ['Normal'])
              });
            }
          } else if (table === 'categories') {
            if (eventType === 'DELETE') {
              await db.categories.delete(oldRecord.id);
            } else if (newRecord?.id) {
              await db.categories.put(newRecord);
            }
          } else if (table === 'transactions') {
            if (eventType === 'DELETE') {
              await db.transactions.delete(oldRecord.id);
            } else if (newRecord?.id) {
              await db.transactions.put(newRecord);
            }
          } else if (table === 'transaction_items') {
            if (eventType === 'DELETE') {
              await db.transaction_items.delete(oldRecord.id);
            } else if (newRecord?.id) {
              await db.transaction_items.put(newRecord);
            }
          } else if (table === 'users') {
            if (eventType === 'UPDATE' && newRecord?.id) {
              const localUser = await db.users.get(newRecord.id);
              await db.users.put(newRecord);
              
              // Cek jika password berubah untuk user yang sedang aktif (login) di browser ini
              if (localUser && localUser.password_hash !== newRecord.password_hash) {
                const storedUserRaw = localStorage.getItem('mokundo_user');
                if (storedUserRaw) {
                  const storedUser = JSON.parse(storedUserRaw);
                  if (storedUser.id === newRecord.id) {
                    localStorage.removeItem('mokundo_user');
                    localStorage.removeItem('mokundo_cart');
                    localStorage.removeItem('mokundo_platform');
                    localStorage.removeItem('mokundo_activeTab');
                    window.dispatchEvent(new CustomEvent('show-force-logout-modal'));
                  }
                }
              }
            }
          }
          // Fire event so all open views refresh instantly
          window.dispatchEvent(new CustomEvent('masterdata-updated'));
        } catch (err) {
          console.error('[Realtime] Update error:', err);
        }
      })
      .on('broadcast', { event: 'force-logout' }, (payload: any) => {
        // Menerima sinyal force-logout secara instant dari device Admin via Broadcast channel
        const { targetUserId } = payload.payload;
        const storedUserRaw = localStorage.getItem('mokundo_user');
        if (storedUserRaw) {
          const storedUser = JSON.parse(storedUserRaw);
          if (storedUser.id === targetUserId) {
            localStorage.removeItem('mokundo_user');
            localStorage.removeItem('mokundo_cart');
            localStorage.removeItem('mokundo_platform');
            localStorage.removeItem('mokundo_activeTab');
            window.dispatchEvent(new CustomEvent('show-force-logout-modal'));
          }
        }
      })
      .on('broadcast', { event: 'dashboard-refresh' }, () => {
        // Trigger explicit refresh on Admin Dashboard
        window.dispatchEvent(new CustomEvent('force-dashboard-refresh'));
      })
      .subscribe((status: string) => {
        console.log('[Realtime] Channel status:', status);
      });
  }

  // Fungsi untuk memancarkan sinyal force-logout instan ke semua device yang terkoneksi
  public static async broadcastForceLogout(targetUserId: number) {
    if (!this.realtimeChannel) return;
    await this.realtimeChannel.send({
      type: 'broadcast',
      event: 'force-logout',
      payload: { targetUserId }
    });
  }

  // Sinyal instan agar Dashboard Admin segera memuat ulang datanya
  public static async broadcastDashboardRefresh() {
    if (!this.realtimeChannel) return;
    await this.realtimeChannel.send({
      type: 'broadcast',
      event: 'dashboard-refresh',
      payload: {}
    });
  }

  /**
   * Instantly push a single record directly to Supabase.
   * Triggers Supabase Realtime so all connected devices update immediately.
   */
  public static async directPush(
    tableName: string,
    action: 'INSERT' | 'UPDATE' | 'DELETE',
    recordId: number,
    payload?: any
  ): Promise<{ success: boolean, error?: string }> {
    if (!navigator.onLine) return { success: false, error: 'Offline' };

    const cfg = await this.getConfig();
    if (!cfg) return { success: false, error: 'No config' };

    try {
      if (action === 'DELETE') {
        const res = await fetch(`${cfg.url}/rest/v1/${tableName}?id=eq.${recordId}`, {
          method: 'DELETE',
          headers: { 'apikey': cfg.key, 'Authorization': `Bearer ${cfg.key}` }
        });
        if (!res.ok) return { success: false, error: await res.text() };
        return { success: true };
      } else {
        // Strip local-only fields before sending
        const clean = this.cleanPayload(tableName, payload);
        const res = await fetch(`${cfg.url}/rest/v1/${tableName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': cfg.key,
            'Authorization': `Bearer ${cfg.key}`,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(clean)
        });
        if (!res.ok) {
          const err = await res.text();
          console.error(`[directPush] ${tableName} failed:`, err);
          return { success: false, error: err };
        }
        return { success: true };
      }
    } catch (err: any) {
      console.error(`[directPush] error for ${tableName}:`, err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetch records directly from Supabase REST API.
   */
  public static async directFetch<T = any>(tableName: string, query?: string): Promise<T[] | null> {
    const cfg = await this.getConfig();
    if (!cfg) return null;

    const qs = query ? `?${query}` : '?select=*';
    try {
      const res = await fetch(`${cfg.url}/rest/v1/${tableName}${qs}`, {
        headers: {
          'apikey': cfg.key,
          'Authorization': `Bearer ${cfg.key}`,
          'Prefer': 'return=representation'
        }
      });
      if (!res.ok) {
        const err = await res.text();
        console.error(`[directFetch] ${tableName} failed:`, err);
        return null;
      }
      return await res.json() as T[];
    } catch (err) {
      console.error(`[directFetch] error for ${tableName}:`, err);
      return null;
    }
  }

  // Sync all pending local records to Supabase
  public static async syncAll(): Promise<{ success: boolean; syncedCount: number }> {
    if (this.isSyncing) return { success: false, syncedCount: 0 };
    if (!navigator.onLine) return { success: false, syncedCount: 0 };

    const cfg = await this.getConfig();
    if (!cfg) return { success: false, syncedCount: 0 };

    this.isSyncing = true;
    let totalSynced = 0;

    try {
      // 1. Sync Shifts
      const pendingShifts = await db.shifts.where('sync_status').equals('PENDING').toArray();
      for (const shift of pendingShifts) {
        const ok = await this.upsert(cfg, 'shifts', shift);
        if (ok) {
          await db.shifts.update(shift.id!, { sync_status: 'SYNCED' });
          totalSynced++;
        }
      }

      // 2. Sync Transactions + Items
      const pendingTx = await db.transactions.where('sync_status').equals('PENDING').toArray();
      for (const tx of pendingTx) {
        const ok = await this.upsert(cfg, 'transactions', tx);
        if (ok) {
          const items = await db.transaction_items.where('transaksi_id').equals(tx.id!).toArray();
          let allOk = true;
          for (const item of items) {
            const itemOk = await this.upsert(cfg, 'transaction_items', item);
            if (!itemOk) allOk = false;
          }
          if (allOk) {
            await db.transactions.update(tx.id!, { sync_status: 'SYNCED' });
            totalSynced++;
          }
        }
      }

      // 3. Sync Stock Logs
      const pendingLogs = await db.stock_logs.where('sync_status').equals('PENDING').toArray();
      for (const log of pendingLogs) {
        const ok = await this.upsert(cfg, 'stock_logs', log);
        if (ok) {
          await db.stock_logs.update(log.id!, { sync_status: 'SYNCED' });
          totalSynced++;
        }
      }

      // 4. Sync Master Data Queue (product/category adds, edits, deletes)
      const syncQueue = await db.sync_queue.orderBy('timestamp').toArray();
      for (const item of syncQueue) {
        let ok = false;
        if (item.action === 'DELETE') {
          ok = await this.delete(cfg, item.table_name, item.record_id);
        } else {
          const payload = JSON.parse(item.payload);
          ok = await this.upsert(cfg, item.table_name, payload);
        }
        if (ok) {
          await db.sync_queue.delete(item.id!);
          totalSynced++;
        }
      }

      return { success: true, syncedCount: totalSynced };
    } catch (error) {
      console.error('[syncAll] failed:', error);
      return { success: false, syncedCount: totalSynced };
    } finally {
      this.isSyncing = false;
    }
  }

  // Pull fresh master data from Supabase to local IndexedDB
  public static async pullMasterData(): Promise<boolean> {
    if (!navigator.onLine) return false;

    const cfg = await this.getConfig();
    if (!cfg) return false;

    try {
      const fetchTable = async (name: string) => {
        const res = await fetch(`${cfg.url}/rest/v1/${name}?select=*`, {
          headers: { 'apikey': cfg.key, 'Authorization': `Bearer ${cfg.key}` }
        });
        if (!res.ok) {
          console.warn(`[pullMasterData] fetch ${name} failed: ${res.status} ${await res.text()}`);
          return null;
        }
        return res.json();
      };

      // Fetch categories
      const categories = await fetchTable('categories');
      if (Array.isArray(categories)) {
        const pendingCats = await db.sync_queue.where('table_name').equals('categories').toArray();
        const pendingIds = new Set(pendingCats.map(p => p.record_id));
        const serverIds = new Set(categories.map((c: any) => c.id));
        const localCats = await db.categories.toArray();
        for (const lc of localCats) {
          if (!pendingIds.has(lc.id!) && !serverIds.has(lc.id!)) await db.categories.delete(lc.id!);
        }
        for (const sc of categories) {
          if (!pendingIds.has(sc.id)) await db.categories.put(sc);
        }
      }

      // Fetch products
      const products = await fetchTable('products');
      if (Array.isArray(products)) {
        const pendingProds = await db.sync_queue.where('table_name').equals('products').toArray();
        const pendingIds = new Set(pendingProds.map(p => p.record_id));
        const serverIds = new Set(products.map((p: any) => p.id));
        const localProds = await db.products.toArray();
        for (const lp of localProds) {
          if (!pendingIds.has(lp.id!) && !serverIds.has(lp.id!)) await db.products.delete(lp.id!);
        }
        for (const sp of products) {
          if (!pendingIds.has(sp.id)) {
            await db.products.put({
              ...sp,
              varian: Array.isArray(sp.varian) ? sp.varian : (typeof sp.varian === 'string' ? JSON.parse(sp.varian) : ['Normal'])
            });
          }
        }
      }

      // Fetch users
      const users = await fetchTable('users');
      if (Array.isArray(users) && users.length > 0) {
        await db.users.bulkPut(users);
      }

      return true;
    } catch (error) {
      console.error('[pullMasterData] failed:', error);
      return false;
    }
  }

  // Wipe all transactional and master data from Supabase
  public static async wipeSupabaseData(): Promise<void> {
    const cfg = await this.getConfig();
    if (!cfg) return;

    try {
      if (!this.supabase) {
        this.supabase = createClient(cfg.url, cfg.key);
      }
      console.log('[SyncService] Wiping Supabase data...');
      
      await this.supabase.from('transaction_items').delete().neq('id', -1);
      await this.supabase.from('transactions').delete().neq('id', -1);
      await this.supabase.from('products').delete().neq('id', -1);
      await this.supabase.from('categories').delete().neq('id', -1);
      await this.supabase.from('shifts').delete().neq('id', -1);
      
      console.log('[SyncService] Supabase data wiped successfully');
    } catch (e) {
      console.error('[SyncService] Failed to wipe Supabase:', e);
    }
  }

  // --- Private Helpers ---

  private static cleanPayload(_tableName: string, payload: any): any {
    const clean = { ...payload };
    // Remove local-only fields that Supabase doesn't know about
    delete clean.sync_status;
    delete clean.store_id;   // Don't send store_id - schema now allows NULL
    delete clean.items;      // Remove nested items if accidentally included
    return clean;
  }

  private static async upsert(cfg: { url: string; key: string }, tableName: string, payload: any): Promise<boolean> {
    try {
      const clean = this.cleanPayload(tableName, payload);
      const res = await fetch(`${cfg.url}/rest/v1/${tableName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': cfg.key,
          'Authorization': `Bearer ${cfg.key}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(clean)
      });
      if (!res.ok) {
        const err = await res.text();
        console.error(`[upsert] ${tableName} failed:`, err);
        return false;
      }
      return true;
    } catch (e) {
      console.error(`[upsert] error for ${tableName}:`, e);
      return false;
    }
  }

  private static async delete(cfg: { url: string; key: string }, tableName: string, id: number): Promise<boolean> {
    try {
      const res = await fetch(`${cfg.url}/rest/v1/${tableName}?id=eq.${id}`, {
        method: 'DELETE',
        headers: { 'apikey': cfg.key, 'Authorization': `Bearer ${cfg.key}` }
      });
      return res.ok;
    } catch (e) {
      console.error(`[delete] error for ${tableName}:`, e);
      return false;
    }
  }
}
