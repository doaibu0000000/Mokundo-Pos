import React, { useEffect, useState } from 'react';
import { TrendingUp, ShoppingBag, Box, AlertTriangle, RefreshCw } from 'lucide-react';
import { db } from '../../../shared/services/db';
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

export const DashboardView: React.FC = () => {
  const [stats, setStats] = useState({
    omsetHariIni: 0,
    profitHariIni: 0,
    transaksiHariIni: 0,
    stokMenipis: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterDays, setFilterDays] = useState<7 | 30>(7);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      // 1. Get transactions for today
      const todayTx = await db.transactions
        .where('tanggal')
        .aboveOrEqual(todayStr)
        .toArray();

      let omsetToday = 0;
      let costToday = 0;
      let completedCount = 0;

      for (const tx of todayTx) {
        if (tx.status === 'COMPLETED') {
          omsetToday += tx.total;
          completedCount++;

          // Fetch items to calculate COGS/HPP
          const items = await db.transaction_items.where('transaksi_id').equals(tx.id!).toArray();
          for (const item of items) {
            const product = await db.products.get(item.produk_id);
            const hpp = product?.HPP || 0;
            costToday += hpp * item.qty;
          }
        }
      }

      // 2. Count low-stock items
      const products = await db.products.toArray();
      const lowStockCount = products.filter(p => p.stok <= p.threshold_stok).length;

      setStats({
        omsetHariIni: omsetToday,
        profitHariIni: Math.max(0, omsetToday - costToday),
        transaksiHariIni: completedCount,
        stokMenipis: lowStockCount,
      });

      // 3. Generate chart data for last 7/30 days
      const daysArray = [];
      const productMap = new Map();
      products.forEach(p => productMap.set(p.id, p.HPP));

      for (let i = filterDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const start = d.toISOString();
        
        const endD = new Date(d);
        endD.setHours(23, 59, 59, 999);
        const end = endD.toISOString();

        const dayTx = await db.transactions
          .where('tanggal')
          .between(start, end, true, true)
          .toArray();

        let dayOmset = 0;
        let dayCost = 0;

        for (const tx of dayTx) {
          if (tx.status === 'COMPLETED') {
            dayOmset += tx.total;
            const items = await db.transaction_items.where('transaksi_id').equals(tx.id!).toArray();
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
    <div style={{ padding: isMobile ? '0' : '20px', height: '100%', overflowY: 'auto' }}>
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
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: isMobile ? '12px' : '20px',
          marginBottom: '30px',
        }}
      >
        {/* Card 1: Omset */}
        <NeumorphicCard 
          style={{ 
            display: 'flex', 
            flexDirection: 'row',
            alignItems: 'center', 
            gap: isMobile ? '8px' : '16px',
            padding: isMobile ? '10px 8px' : '16px'
          }}
        >
          <div
            className="nm-inset"
            style={{
              width: isMobile ? '36px' : '48px',
              height: isMobile ? '36px' : '48px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-blue)',
              flexShrink: 0
            }}
          >
            <TrendingUp size={isMobile ? 18 : 24} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? '9px' : '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Omset Hari Ini
            </div>
            <div style={{ fontSize: isMobile ? '13px' : '18px', fontWeight: 800, marginTop: '2px', color: 'var(--accent-blue)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {formatRupiah(stats.omsetHariIni)}
            </div>
          </div>
        </NeumorphicCard>

        {/* Card 2: Profit */}
        <NeumorphicCard 
          style={{ 
            display: 'flex', 
            flexDirection: 'row',
            alignItems: 'center', 
            gap: isMobile ? '8px' : '16px',
            padding: isMobile ? '10px 8px' : '16px'
          }}
        >
          <div
            className="nm-inset"
            style={{
              width: isMobile ? '36px' : '48px',
              height: isMobile ? '36px' : '48px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-green)',
              flexShrink: 0
            }}
          >
            <TrendingUp size={isMobile ? 18 : 24} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? '9px' : '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Profit Hari Ini
            </div>
            <div style={{ fontSize: isMobile ? '13px' : '18px', fontWeight: 800, marginTop: '2px', color: 'var(--accent-green)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {formatRupiah(stats.profitHariIni)}
            </div>
          </div>
        </NeumorphicCard>

        {/* Card 3: Transaksi */}
        <NeumorphicCard 
          style={{ 
            display: 'flex', 
            flexDirection: 'row',
            alignItems: 'center', 
            gap: isMobile ? '8px' : '16px',
            padding: isMobile ? '10px 8px' : '16px'
          }}
        >
          <div
            className="nm-inset"
            style={{
              width: isMobile ? '36px' : '48px',
              height: isMobile ? '36px' : '48px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              flexShrink: 0
            }}
          >
            <ShoppingBag size={isMobile ? 18 : 24} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? '9px' : '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Transaksi Hari Ini
            </div>
            <div style={{ fontSize: isMobile ? '13px' : '20px', fontWeight: 800, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {stats.transaksiHariIni} <span style={{ fontSize: isMobile ? '9px' : '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>order</span>
            </div>
          </div>
        </NeumorphicCard>

        {/* Card 4: Low Stock Alert */}
        <NeumorphicCard 
          style={{ 
            display: 'flex', 
            flexDirection: 'row',
            alignItems: 'center', 
            gap: isMobile ? '8px' : '16px',
            padding: isMobile ? '10px 8px' : '16px',
            border: stats.stokMenipis > 0 ? '1px solid var(--accent-red)' : 'none'
          }}
        >
          <div
            className="nm-inset"
            style={{
              width: isMobile ? '36px' : '48px',
              height: isMobile ? '36px' : '48px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: stats.stokMenipis > 0 ? 'var(--accent-red)' : 'var(--text-secondary)',
              flexShrink: 0
            }}
          >
            {stats.stokMenipis > 0 ? <AlertTriangle size={isMobile ? 18 : 24} /> : <Box size={isMobile ? 18 : 24} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? '9px' : '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Stok Menipis
            </div>
            <div style={{ fontSize: isMobile ? '13px' : '20px', fontWeight: 800, marginTop: '2px', color: stats.stokMenipis > 0 ? 'var(--accent-red)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {stats.stokMenipis} <span style={{ fontSize: isMobile ? '9px' : '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>produk</span>
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

        <div style={{ width: '100%', height: isMobile ? '180px' : '280px', marginTop: '10px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ left: isMobile ? -5 : -10, right: 10, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--shadow-dark)" opacity={0.3} />
              <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--text-secondary)" fontSize={10} tickLine={false} width={isMobile ? 28 : 40} />
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
