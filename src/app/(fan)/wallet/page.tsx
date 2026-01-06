import { Wallet, Plus } from 'lucide-react';

export default function WalletPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Wallet</h1>
        <p className="text-gray-400 mt-1">Manage your payment methods</p>
      </div>

      {/* Balance */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6 mb-6">
        <p className="text-sm text-gray-400 mb-1">Available Balance</p>
        <p className="text-3xl font-bold">£0.00</p>
      </div>

      {/* Payment Methods */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Payment Methods</h2>

        <div className="text-center py-12 bg-zinc-900 rounded-xl border border-white/10">
          <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-500" />
          <p className="text-gray-400 mb-4">No payment methods added</p>
          <button className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium flex items-center gap-2 mx-auto hover:opacity-90 transition">
            <Plus className="w-4 h-4" />
            Add Payment Method
          </button>
        </div>
      </div>
    </div>
  );
}
