export default function ReceiptCard({ children, className = '' }) {
  return (
    <div
      className={`bg-[#111008] border border-[#2a2000] rounded-lg p-4 shadow-lg ${className}`}
    >
      {children}
    </div>
  )
}
