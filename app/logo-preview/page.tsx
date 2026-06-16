'use client'

export default function LogoPreview() {
  return (
    <div style={{ 
      fontFamily: 'Inter, system-ui, sans-serif',
      background: '#16161f',
      color: 'white',
      padding: '40px 20px',
      minHeight: '100vh'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '10px',
          background: 'linear-gradient(135deg, #a855f7, #06b6d4)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontSize: '36px'
        }}>
          🎨 FinWise Logo Options
        </h1>
        <p style={{ textAlign: 'center', color: '#888', marginBottom: '40px' }}>
          Konsep 1: Wallet + Growth
        </p>
        
        <h2 style={{ fontSize: '24px', margin: '40px 0 20px', paddingBottom: '10px', borderBottom: '2px solid #2a2a3a' }}>
          📱 Logo Options
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '50px' }}>
          <div style={{ background: '#1e1e2e', borderRadius: '16px', padding: '30px', border: '1px solid #2a2a3a' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '8px', color: '#a855f7' }}>Option 1: Wallet + Growth</h2>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '20px' }}>Dompet terbuka dengan panah pertumbuhan. Modern & clean.</p>
            <img src="/logo-wallet-growth.svg" alt="Wallet Growth Logo" style={{ width: '100%', background: '#0d0d14', borderRadius: '12px', padding: '20px' }} />
          </div>
          
          <div style={{ background: '#1e1e2e', borderRadius: '16px', padding: '30px', border: '1px solid #2a2a3a' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '8px', color: '#a855f7' }}>Option 2: Wallet V2</h2>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '20px' }}>Versi lebih minimalis dengan circle background.</p>
            <img src="/logo-wallet-v2.svg" alt="Wallet V2 Logo" style={{ width: '100%', background: '#0d0d14', borderRadius: '12px', padding: '20px' }} />
          </div>
          
          <div style={{ background: '#1e1e2e', borderRadius: '16px', padding: '30px', border: '1px solid #2a2a3a' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '8px', color: '#a855f7' }}>Option 3: Text Logo</h2>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '20px' }}>Typografi &quot;FinWise&quot; dengan gradient. Cocok untuk header.</p>
            <img src="/logo-text.svg" alt="Text Logo" style={{ width: '100%', background: '#0d0d14', borderRadius: '12px', padding: '20px' }} />
          </div>
          
          <div style={{ background: '#1e1e2e', borderRadius: '16px', padding: '30px', border: '1px solid #2a2a3a' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '8px', color: '#a855f7' }}>Option 4: Full Logo</h2>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '20px' }}>Icon + Text lengkap. Untuk splash screen atau hero section.</p>
            <img src="/logo-full.svg" alt="Full Logo" style={{ width: '100%', background: '#0d0d14', borderRadius: '12px', padding: '20px' }} />
          </div>
        </div>
        
        <h2 style={{ fontSize: '24px', margin: '40px 0 20px', paddingBottom: '10px', borderBottom: '2px solid #2a2a3a' }}>
          🎨 Color Palette
        </h2>
        
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', margin: '20px 0' }}>
          {[
            { name: 'Purple', code: '#a855f7' },
            { name: 'Cyan', code: '#06b6d4' },
            { name: 'Light Purple', code: '#c084fc' },
            { name: 'Green', code: '#10b981' },
            { name: 'Gold', code: '#fbbf24' }
          ].map((color) => (
            <div key={color.code} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: color.code, border: '2px solid #2a2a3a' }} />
              <span style={{ fontSize: '12px', color: '#888' }}>{color.name}</span>
              <span style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>{color.code}</span>
            </div>
          ))}
        </div>
        
        <h2 style={{ fontSize: '24px', margin: '40px 0 20px', paddingBottom: '10px', borderBottom: '2px solid #2a2a3a' }}>
          ✏️ Typography
        </h2>
        
        <div style={{ background: '#1e1e2e', borderRadius: '16px', padding: '30px', margin: '20px 0' }}>
          <div style={{ margin: '15px 0' }}>
            <div style={{ fontSize: '12px', color: '#a855f7', marginBottom: '5px' }}>Primary: Inter (Bold)</div>
            <div style={{ 
              fontSize: '36px', 
              fontWeight: 800,
              background: 'linear-gradient(135deg, #a855f7, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              FinWise
            </div>
          </div>
          <div style={{ margin: '15px 0' }}>
            <div style={{ fontSize: '12px', color: '#a855f7', marginBottom: '5px' }}>Secondary: Sora</div>
            <div style={{ fontSize: '36px', fontWeight: 400, color: 'white' }}>
              FinWise
            </div>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <h2 style={{ fontSize: '24px', margin: '40px 0 20px', paddingBottom: '10px', borderBottom: '2px solid #2a2a3a' }}>
            📥 Download
          </h2>
          <a href="/logo-wallet-growth.svg" download style={{ 
            display: 'inline-block', 
            padding: '12px 24px', 
            background: 'linear-gradient(135deg, #a855f7, #06b6d4)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            fontSize: '14px', 
            fontWeight: 600, 
            cursor: 'pointer', 
            textDecoration: 'none', 
            margin: '5px' 
          }}>Download Option 1</a>
          <a href="/logo-wallet-v2.svg" download style={{ 
            display: 'inline-block', 
            padding: '12px 24px', 
            background: 'linear-gradient(135deg, #a855f7, #06b6d4)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            fontSize: '14px', 
            fontWeight: 600, 
            cursor: 'pointer', 
            textDecoration: 'none', 
            margin: '5px' 
          }}>Download Option 2</a>
          <a href="/logo-text.svg" download style={{ 
            display: 'inline-block', 
            padding: '12px 24px', 
            background: 'linear-gradient(135deg, #a855f7, #06b6d4)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            fontSize: '14px', 
            fontWeight: 600, 
            cursor: 'pointer', 
            textDecoration: 'none', 
            margin: '5px' 
          }}>Download Text Logo</a>
          <a href="/logo-full.svg" download style={{ 
            display: 'inline-block', 
            padding: '12px 24px', 
            background: 'linear-gradient(135deg, #a855f7, #06b6d4)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            fontSize: '14px', 
            fontWeight: 600, 
            cursor: 'pointer', 
            textDecoration: 'none', 
            margin: '5px' 
          }}>Download Full Logo</a>
        </div>
      </div>
    </div>
  )
}
