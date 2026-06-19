import Link from "next/link"

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "2rem",
      textAlign: "center",
      background: "linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)",
    }}>
      <div style={{ fontSize: "6rem", marginBottom: "1rem" }}>🐱</div>
      <h1 style={{
        fontSize: "2rem",
        fontWeight: 700,
        color: "#1a1a2e",
        marginBottom: "0.5rem",
      }}>
        404 — Halaman Tidak Ditemukan
      </h1>
      <p style={{
        fontSize: "1.1rem",
        color: "#555",
        marginBottom: "2rem",
        maxWidth: "400px",
      }}>
        Sepertinya halaman yang kamu cari sudah dipindah atau tidak ada.
      </p>
      <Link
        href="/"
        style={{
          padding: "0.75rem 2rem",
          borderRadius: "12px",
          background: "#4f46e5",
          color: "#fff",
          fontWeight: 600,
          fontSize: "1rem",
          textDecoration: "none",
          boxShadow: "0 4px 14px rgba(79,70,229,0.3)",
        }}
      >
        Kembali ke Beranda
      </Link>
    </div>
  )
}
