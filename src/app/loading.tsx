export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center gap-6">
      <div
        className="w-20 h-20 rounded-[22px] flex items-center justify-center text-4xl font-black text-white animate-pulse"
        style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
      >
        A
      </div>
      <p className="text-[#6B7280] text-sm tracking-wide">Loading...</p>
    </div>
  )
}
