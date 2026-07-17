import { db } from './db';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

  // Subscribe to Supabase Realtime for instant Kasir updates
  public static async subscribeToRealtime() {
    if (this.realtimeChannel) return; // already subscribed

    const storeConfig = await db.stores.toCollection().first();
    if (!storeConfig || !storeConfig.sync_enabled || !storeConfig.supabase_url || !storeConfig.supabase_anon_key) {
      return;
    }

    const url = storeConfig.supabase_url.replace(/\/$/, '');
    const key = storeConfig.supabase_anon_key;

    if (!this.supabase) {
      this.supabase = createClient(url, key);
    }

    console.log('Connecting to Supabase Realtime...');
    
    this.realtimeChannel = this.supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
        },
        async (payload: any) => {
          const { table, eventType, new: newRecord, old: oldRecord } = payload;

          // Apply targeted update to local IndexedDB - no full reload needed
          try {
            if (table === 'products') {
              if (eventType === 'DELETE') {
                await db.products.delete(oldRecord.id);
              } else if (newRecord?.id) {
                const normalized = {
                  ...newRecord,
                  varian: Array.isArray(newRecord.varian)
                    ? newRecord.varian
                    : (typeof newRecord.varian === 'string' ? JSON.parse(newRecord.varian) : ['Normal'])
                };
                await db.products.put(normalized);
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
            }
            // Notify views to re-read from IndexedDB or refetch
            window.dispatchEvent(new CustomEvent('masterdata-updated'));
          } catch (err) {
            console.error('Realtime update error:', err);
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to Supabase Realtime!');
        }
      });
  }


  /**
   * Instantly push a single record directly to Supabase with NO delay.
   * Use this for Admin operations (add/edit/delete product, category) so that
   * Supabase Realtime fires immediately and all devices update in real-time.
   */
  public static async directPush(
    tableName: string,
    action: 'INSERT' | 'UPDATE' | 'DELETE',
    recordId: number,
    payload?: any
  ): Promise<boolean> {
    if (!navigator.onLine) return false;

    const storeConfig = await db.stores.toCollection().first();
    if (!storeConfig?.sync_enabled || !storeConfig?.supabase_url || !storeConfig?.supabase_anon_key) {
      return false;
    }

    const url = storeConfig.supabase_url.replace(/\/$/, '');
    const key = storeConfig.supabase_anon_key;

    try {
      if (action === 'DELETE') {
        const res = await fetch(`${url}/rest/v1/${tableName}?id=eq.${recordId}`, {
          method: 'DELETE',
          headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        return res.ok;
      } else {
        const cleanPayload = { ...payload };
        delete cleanPayload.sync_status;
        if (tableName === 'transactions') {
          delete cleanPayload.items;
        }

        const res = await fetch(`${url}/rest/v1/${tableName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(cleanPayload)
        });
        
        if (!res.ok) {
           const errText = await res.text();
           console.error(`directPush error for ${tableName}:`, errText);
        }
        
        return res.ok || res.status === 201;
      }
    } catch (err) {
      console.error(`directPush error for ${tableName}:`, err);
      return false;
    }
  }

  /**
   * Fetch records directly from Supabase REST API.
   * Used by Dashboard and Laporan so they always show live server data.
   * @param tableName - Supabase table name
   * @param query - optional query params e.g. "tanggal=gte.2024-01-01&order=tanggal.desc"
   */
  public static async directFetch<T = any>(tableName: string, query?: string): Promise<T[] | null> {
    const storeConfig = await db.stores.toCollection().first();
    if (!storeConfig?.supabase_url || !storeConfig?.supabase_anon_key) return null;

    const url = storeConfig.supabase_url.replace(/\/$/, '');
    const key = storeConfig.supabase_anon_key;
    const qs = query ? `?${query}` : '?select=*';

    try {
      const res = await fetch(`${url}/rest/v1/${tableName}${qs}`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Prefer': 'return=representation'
        }
      });
      if (!res.ok) return null;
      return await res.json() as T[];
    } catch (err) {
      console.error(`directFetch error for ${tableName}:`, err);
      return null;
    }
  }

  // General check and sync trigger
  public static async syncAll(): Promise<{ success: boolean; syncedCount: number }> {
    if (this.isSyncing) return { success: false, syncedCount: 0 };
    
    // Check if network is available
    if (!navigator.onLine) {
      return { success: false, syncedCount: 0 };
    }

    const storeConfig = await db.stores.toCollection().first();
    // If not enabled or no keys, abort sync
    if (!storeConfig || !storeConfig.sync_enabled || !storeConfig.supabase_url || !storeConfig.supabase_anon_key) {
      return { success: false, syncedCount: 0 };
    }

    this.isSyncing = true;
    let totalSynced = 0;

    try {
      const url = storeConfig.supabase_url.replace(/\/$/, '');
      const key = storeConfig.supabase_anon_key;

      // 1. Sync Shifts
      const pendingShifts = await db.shifts.where('sync_status').equals('PENDING').toArray();
      for (const shift of pendingShifts) {
        const success = await this.syncRecord(url, key, 'shifts', shift);
        if (success) {
          await db.shifts.update(shift.id!, { sync_status: 'SYNCED' });
          totalSynced++;
        }
      }

      // 2. Sync Transactions
      const pendingTx = await db.transactions.where('sync_status').equals('PENDING').toArray();
      for (const tx of pendingTx) {
        // Sync the transaction itself (without embedded items)
        const success = await this.syncRecord(url, key, 'transactions', tx);
        
        if (success) {
          // Sync its items to transaction_items table
          const items = await db.transaction_items.where('transaksi_id').equals(tx.id!).toArray();
          let allItemsSuccess = true;
          for (const item of items) {
             const itemSuccess = await this.syncRecord(url, key, 'transaction_items', item);
             if (!itemSuccess) allItemsSuccess = false;
          }

          if (allItemsSuccess) {
             await db.transactions.update(tx.id!, { sync_status: 'SYNCED' });
             totalSynced++;
          }
        }
      }

      // 3. Sync Stock Logs
      const pendingLogs = await db.stock_logs.where('sync_status').equals('PENDING').toArray();
      for (const log of pendingLogs) {
        const success = await this.syncRecord(url, key, 'stock_logs', log);
        if (success) {
          await db.stock_logs.update(log.id!, { sync_status: 'SYNCED' });
          totalSynced++;
        }
      }

      // 4. Sync Master Data Queue
      const syncQueue = await db.sync_queue.orderBy('timestamp').toArray();

      for (const item of syncQueue) {
        let success = false;
        if (item.action === 'DELETE') {
          success = await this.deleteRecord(url, key, item.table_name, item.record_id);
        } else {
          const payload = JSON.parse(item.payload);
          success = await this.syncRecord(url, key, item.table_name, payload);
        }

        if (success) {
          await db.sync_queue.delete(item.id!);
          totalSynced++;
        }
      }

      return { success: true, syncedCount: totalSynced };
    } catch (error) {
      console.error('Data synchronization failed:', error);
      return { success: false, syncedCount: totalSynced };
    } finally {
      this.isSyncing = false;
    }
  }

  // Pull Master Data from Supabase
  public static async pullMasterData(): Promise<boolean> {
    if (!navigator.onLine) return false;

    const storeConfig = await db.stores.toCollection().first();
    if (!storeConfig || !storeConfig.sync_enabled || !storeConfig.supabase_url || !storeConfig.supabase_anon_key) {
      return false;
    }

    try {
      const url = storeConfig.supabase_url.replace(/\/$/, '');
      const key = storeConfig.supabase_anon_key;

      // Helper to fetch data
      const fetchData = async (tableName: string) => {
        const response = await fetch(`${url}/rest/v1/${tableName}?select=*`, {
          method: 'GET',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
          }
        });
        if (!response.ok) throw new Error(`Failed to fetch ${tableName}: ${response.status}`);
        return await response.json();
      };

      // Fetch Categories - safely merge keeping drafted data
      const categories = await fetchData('categories');
      if (Array.isArray(categories)) {
        const pendingCats = await db.sync_queue.where('table_name').equals('categories').toArray();
        const pendingIds = new Set(pendingCats.map(p => p.record_id));
        const serverIds = new Set(categories.map((c: any) => c.id));
        
        const localCats = await db.categories.toArray();
        for (const lc of localCats) {
          if (!pendingIds.has(lc.id!) && !serverIds.has(lc.id!)) {
            await db.categories.delete(lc.id!);
          }
        }
        for (const sc of categories) {
          if (!pendingIds.has(sc.id)) {
            await db.categories.put(sc);
          }
        }
      }

      // Fetch Products - safely merge keeping drafted data
      const products = await fetchData('products');
      if (Array.isArray(products)) {
        const pendingProds = await db.sync_queue.where('table_name').equals('products').toArray();
        const pendingIds = new Set(pendingProds.map(p => p.record_id));
        const serverIds = new Set(products.map((p: any) => p.id));
        
        const localProds = await db.products.toArray();
        for (const lp of localProds) {
          if (!pendingIds.has(lp.id!) && !serverIds.has(lp.id!)) {
            await db.products.delete(lp.id!);
          }
        }
        
        for (const sp of products) {
          if (!pendingIds.has(sp.id)) {
            const normalized = {
              ...sp,
              varian: Array.isArray(sp.varian) ? sp.varian : (typeof sp.varian === 'string' ? JSON.parse(sp.varian) : ['Normal'])
            };
            await db.products.put(normalized);
          }
        }
      }

      // Fetch and update Users
      const users = await fetchData('users');
      if (Array.isArray(users) && users.length > 0) {
        await db.users.bulkPut(users);
      }
      
      // Fetch and update Store settings (if any exist on server)
      const stores = await fetchData('stores');
      if (Array.isArray(stores) && stores.length > 0) {
        // Only update local store if the server has data
        const serverStore = stores[0];
        await db.stores.update(storeConfig.id!, {
          ...serverStore,
          sync_enabled: storeConfig.sync_enabled, // preserve local sync settings
          supabase_url: storeConfig.supabase_url,
          supabase_anon_key: storeConfig.supabase_anon_key
        });
      }

      return true;
    } catch (error) {
      console.error('Data pull failed:', error);
      return false;
    }
  }

  // Push single record to Supabase via REST API
  private static async syncRecord(url: string, anonKey: string, tableName: string, payload: any): Promise<boolean> {
    try {
      const cleanPayload = { ...payload };
      delete cleanPayload.sync_status;
      // ensure we don't send nested arrays that might break Postgres if not jsonb
      if (tableName === 'transactions') {
        delete cleanPayload.items;
      }

      const response = await fetch(`${url}/rest/v1/${tableName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Prefer': 'resolution=merge-duplicates' // UPSERT behavior if primary keys match
        },
        body: JSON.stringify(cleanPayload)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`SyncRecord failed for ${tableName}:`, errText);
        return false;
      }

      return true;
    } catch (e) {
      console.error(`Network error syncing ${tableName}:`, e);
      return false;
    }
  }

  // Delete single record from Supabase via REST API
  private static async deleteRecord(url: string, anonKey: string, tableName: string, id: number): Promise<boolean> {
    try {
      const response = await fetch(`${url}/rest/v1/${tableName}?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        }
      });
      return response.ok;
    } catch (e) {
      console.error(`Network error deleting from ${tableName}:`, e);
      return false;
    }
  }
}
