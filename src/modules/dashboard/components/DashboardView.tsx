import React, { useEffect, useState } from 'react';
import { TrendingUp, ShoppingBag, Box, AlertTriangle, RefreshCw } from 'lucide-react';
import { db, type Transaction, type TransactionItem } from '../../../shared/services/db';
import { SyncService } from '../../../shared/services/syncService';
import { NeumorphicCard, NeumorphicButton } from '../../../shared/components';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

// Format currency helper
const formatRupiah = (number: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
};

const formatRupiahCompact = (val: number) => {
  if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1).replace('.0', '')}M`;
  if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)}k`;
  return formatRupiah(val);
};

export const DashboardView: React.FC = () => {
  const [stats, setStats] = useState(() => {
    const cached = sessionStorage.getItem('mokundo_cached_dashboard_stats');
    return cached ? JSON.parse(cached) : {
      omsetHariIni: 0,
      profitHariIni: 0,
      transaksiHariIni: 0,
      stokMenipis: 0,
    };
  });
  const [chartData, setChartData] = useState<any[]>(() => {
    const cached = sessionStorage.getItem('mokundo_cached_dashboard_chart');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(false);
  const [filterDays, setFilterDays] = useState<7 | 30>(7);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen for realtime Supabase updates to reload dashboard instantly
  useEffect(() => {
    const handleRealtimeUpdate = () => {
      loadDashboardData();
    };
    window.addEventListener('masterdata-updated', handleRealtimeUpdate);
    
    // Fallback polling: Refresh data every 15 seconds in case Supabase Realtime is not enabled on the tables
    const interval = setInterval(() => {
      loadDashboardData();
    }, 15000);

    return () => {
      window.removeEventListener('masterdata-updated', handleRealtimeUpdate);
      clearInterval(interval);
    };
  }, [filterDays]); // Depend on filterDays so it uses current filter

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      const filterDate = new Date();
      filterDate.setDate(filterDate.getDate() - filterDays);
      filterDate.setHours(0, 0, 0, 0);
      const startFilterStr = filterDate.toISOString();

      // 1. Fetch ALL transactions in filter period from Supabase to ensure realtime
      const serverTx = await SyncService.directFetch<Transaction>(
        'transactions',
        `tanggal=gte.${encodeURIComponent(startFilterStr)}`
      );

      let allTx: Transaction[] = [];
      if (serverTx !== null) {
        allTx = serverTx;
        // Optimistically cache locally
        for (const tx of serverTx) {
           await db.transactions.put(tx);
        }
      } else {
        allTx = await db.transactions
          .where('tanggal')
          .aboveOrEqual(startFilterStr)
          .toArray();
      }

      // 2. Fetch Transaction Items in bulk to avoid N+1 problem
      const completedTx = allTx.filter(tx => tx.status === 'COMPLETED');
      let allItems: TransactionItem[] = [];
      
      if (serverTx !== null && completedTx.length > 0) {
         const chunkSize = 50;
         for (let i = 0; i < completedTx.length; i += chunkSize) {
            const chunk = completedTx.slice(i, i + chunkSize);
            const ids = chunk.map(tx => tx.id).join(',');
            const itemsChunk = await SyncService.directFetch<TransactionItem>(
               'transaction_items',
               `transaksi_id=in.(${ids})`
            );
            if (itemsChunk) {
               allItems.push(...itemsChunk);
            }
         }
         // Cache items locally
         for (const item of allItems) {
             await db.transaction_items.put(item);
         }
      } else {
         // Fallback to local items if offline
         allItems = await db.transaction_items.toArray(); 
      }
      
      // Group items by transaksi_id
      const itemsByTx = new Map<number, TransactionItem[]>();
      for (const item of allItems) {
         const arr = itemsByTx.get(item.transaksi_id) || [];
         arr.push(item);
         itemsByTx.set(item.transaksi_id, arr);
      }

      // 3. Calculate Today's Stats
      const todayTx = allTx.filter(tx => tx.tanggal >= todayStr);
      let omsetToday = 0;
      let costToday = 0;
      let completedCount = 0;
      
      // We need products for HPP (COGS)
      const products = await db.products.toArray();
      const productMap = new Map();
      products.forEach(p => productMap.set(p.id, p.HPP));

      for (const tx of todayTx) {
        if (tx.status === 'COMPLETED') {
          omsetToday += tx.total;
          completedCount++;
          
          const items = itemsByTx.get(tx.id!) || [];
          for (const item of items) {
            const hpp = productMap.get(item.produk_id) || 0;
            costToday += hpp * item.qty;
          }
        }
      }

      // Count low-stock items
      const lowStockCount = products.filter(p => p.stok <= p.threshold_stok).length;

      const newStats = {
        omsetHariIni: omsetToday,
        profitHariIni: Math.max(0, omsetToday - costToday),
        transaksiHariIni: completedCount,
        stokMenipis: lowStockCount,
      };
      setStats(newStats);
      sessionStorage.setItem('mokundo_cached_dashboard_stats', JSON.stringify(newStats));

      // 4. Generate chart data for last 7/30 days
      const daysArray = [];

      for (let i = filterDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const start = d.toISOString();
        
        const endD = new Date(d);
        endD.setHours(23, 59, 59, 999);
        const end = endD.toISOString();

        const dayTx = allTx.filter(tx => tx.tanggal >= start && tx.tanggal <= end);

        let dayOmset = 0;
        let dayCost = 0;

        for (const tx of dayTx) {
          if (tx.status === 'COMPLETED') {
            dayOmset += tx.total;
            const items = itemsByTx.get(tx.id!) || [];
            items.forEach(item => {
              const hpp = productMap.get(item.produk_id) || 0;
              dayCost += hpp * item.qty;
            });
          }
        }

        daysArray.push({
          date: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
          Omset: dayOmset,
          Profit: Math.max(0, dayOmset - dayCost),
        });
      }

      setChartData(daysArray);
      sessionStorage.setItem('mokundo_cached_dashboard_chart', JSON.stringify(daysArray));
    } catch (error) {
      console.error('Failed loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [filterDays]);

  return (
    <div style={{ padding: isMobile ? '0' : '20px', height: isMobile ? 'auto' : '100%', overflowY: isMobile ? 'visible' : 'auto', overflowX: 'visible', width: '100%' }}>
      {/* Header Title */}
      {!isMobile && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Ringkasan Bisnis</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Pantau performa penjualan Anda secara real-time
            </p>
          </div>
          <NeumorphicButton onClick={loadDashboardData} size="sm">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </NeumorphicButton>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: isMobile ? '12px' : '20px',
          marginBottom: isMobile ? '16px' : '30px',
          width: '100%'
        }}
      >
        <NeumorphicCard 
          style={{ 
            display: 'flex', 
            flexDirection: 'row',
            alignItems: 'center', 
            gap: isMobile ? '12px' : '16px',
            padding: isMobile ? '14px 12px' : '16px',
            minWidth: 0
          }}
        >
          <div
            className="nm-inset"
            style={{
              width: isMobile ? '40px' : '48px',
              height: isMobile ? '40px' : '48px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-blue)',
              flexShrink: 0
            }}
          >
            <TrendingUp size={isMobile ? 20 : 24} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Omset Hari Ini
            </div>
            <div style={{ fontSize: isMobile ? '15px' : '18px', fontWeight: 800, marginTop: '2px', color: 'var(--accent-blue)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {formatRupiahCompact(stats.omsetHariIni)}
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard 
          style={{ 
            display: 'flex', 
            flexDirection: 'row',
            alignItems: 'center', 
            gap: isMobile ? '12px' : '16px',
            padding: isMobile ? '14px 12px' : '16px',
            minWidth: 0
          }}
        >
          <div
            className="nm-inset"
            style={{
              width: isMobile ? '40px' : '48px',
              height: isMobile ? '40px' : '48px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-green)',
              flexShrink: 0
            }}
          >
            <TrendingUp size={isMobile ? 20 : 24} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Profit Hari Ini
            </div>
            <div style={{ fontSize: isMobile ? '15px' : '18px', fontWeight: 800, marginTop: '2px', color: 'var(--accent-green)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {formatRupiahCompact(stats.profitHariIni)}
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard 
          style={{ 
            display: 'flex', 
            flexDirection: 'row',
            alignItems: 'center', 
            gap: isMobile ? '12px' : '16px',
            padding: isMobile ? '14px 12px' : '16px',
            minWidth: 0
          }}
        >
          <div
            className="nm-inset"
            style={{
              width: isMobile ? '40px' : '48px',
              height: isMobile ? '40px' : '48px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              flexShrink: 0
            }}
          >
            <ShoppingBag size={isMobile ? 20 : 24} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Transaksi
            </div>
            <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 800, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {stats.transaksiHariIni} <span style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>order</span>
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard 
          style={{ 
            display: 'flex', 
            flexDirection: 'row',
            alignItems: 'center', 
            gap: isMobile ? '12px' : '16px',
            padding: isMobile ? '14px 12px' : '16px',
            border: stats.stokMenipis > 0 ? '1px solid var(--accent-red)' : 'none',
            minWidth: 0
          }}
        >
          <div
            className="nm-inset"
            style={{
              width: isMobile ? '40px' : '48px',
              height: isMobile ? '40px' : '48px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: stats.stokMenipis > 0 ? 'var(--accent-red)' : 'var(--text-secondary)',
              flexShrink: 0
            }}
          >
            {stats.stokMenipis > 0 ? <AlertTriangle size={isMobile ? 20 : 24} /> : <Box size={isMobile ? 20 : 24} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Stok Menipis
            </div>
            <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 800, marginTop: '2px', color: stats.stokMenipis > 0 ? 'var(--accent-red)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {stats.stokMenipis} <span style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>produk</span>
            </div>
          </div>
        </NeumorphicCard>
      </div>

      {/* Recharts Chart Panel */}
      <NeumorphicCard style={{ padding: isMobile ? '16px 12px' : '24px', marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Grafik Pendapatan</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <NeumorphicButton
              size="sm"
              active={filterDays === 7}
              onClick={() => setFilterDays(7)}
            >
              7 Hari terakhir
            </NeumorphicButton>
            <NeumorphicButton
              size="sm"
              active={filterDays === 30}
              onClick={() => setFilterDays(30)}
            >
              30 Hari terakhir
            </NeumorphicButton>
          </div>
        </div>

        <div style={{ width: '100%', height: isMobile ? '180px' : '280px', marginTop: '10px', overflow: 'hidden' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ left: isMobile ? -5 : -10, right: 10, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--shadow-dark)" opacity={0.3} />
              <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={10} tickLine={false} />
              <YAxis 
                stroke="var(--text-secondary)" 
                fontSize={10} 
                tickLine={false} 
                width={isMobile ? 36 : 45} 
                tickFormatter={(val: number) => {
                  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                  if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                  return val.toString();
                }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light)',
                  color: 'var(--text-primary)'
                }}
                formatter={(value: any) => [formatRupiah(value), '']}
              />
              <Legend wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
              <Bar dataKey="Omset" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} opacity={0.8} />
              <Line type="monotone" dataKey="Profit" stroke="var(--accent-green)" strokeWidth={3} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </NeumorphicCard>
    </div>
  );
};
