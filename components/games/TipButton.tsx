'use client';

import { useState, useEffect, useCallback } from 'react';

interface TipButtonProps {
  botId: string;
  botName: string;
  playerFp: string;
}

const TIP_AMOUNTS = [1, 5, 10, 25];

export default function TipButton({ botId, botName, playerFp }: TipButtonProps) {
  const [wallet, setWallet] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [tipping, setTipping] = useState(false);
  const [message, setMessage] = useState('');

  const fetchWallet = useCallback(async () => {
    if (!playerFp) return;
    try {
      const res = await fetch(`/api/coins/wallet?playerFp=${playerFp}`);
      const data = await res.json();
      setWallet(data.coins_remaining ?? 50);
    } catch {
      setWallet(50);
    }
  }, [playerFp]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const handleTip = async (amount: number) => {
    if (tipping || wallet === null || wallet < amount) return;
    setTipping(true);
    setMessage('');

    try {
      const res = await fetch('/api/coins/tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId, playerFp, amount }),
      });

      const data = await res.json();

      if (res.ok) {
        setWallet(data.coins_remaining);
        setMessage(`+${amount} to ${botName}!`);
        setShowPicker(false);
        setTimeout(() => setMessage(''), 3000);
      } else if (res.status === 429) {
        setMessage('Too fast!');
        setTimeout(() => setMessage(''), 2000);
      } else {
        setMessage(data.error || 'Failed');
        setTimeout(() => setMessage(''), 2000);
      }
    } catch {
      setMessage('Error');
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setTipping(false);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-2">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded hover:border-yellow-400/50 transition-colors text-xs"
        title="Tip this bot"
      >
        <span className="text-yellow-400">&#x1FA99;</span>
        <span className="text-text-secondary">Tip</span>
        {wallet !== null && (
          <span className="text-text-muted text-[10px]">({wallet})</span>
        )}
      </button>

      {message && (
        <span className="text-yellow-400 text-[10px] animate-pulse">{message}</span>
      )}

      {showPicker && (
        <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded p-2 flex gap-1 z-50">
          {TIP_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => handleTip(amt)}
              disabled={tipping || (wallet !== null && wallet < amt)}
              className="px-2.5 py-1 text-[10px] rounded border border-border hover:border-yellow-400/50 hover:text-yellow-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary"
            >
              {amt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
