'use client';

import { useState, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useVoiceRecorder } from '@/hooks/use-voice-recorder';
import { parseVoiceCommand, speak } from '@/lib/voice-utils';
import {
  addLedgerEntry,
  getTodayStats,
  getAllEntries,
  getCustomerHistory,
  getTodayEntries,
} from '@/lib/supabase-client';
import { toast } from 'sonner';

export function VoiceRecorder() {
  const [entries, setEntries] = useState<any[]>([]);
  const [totalKret, setTotalKret] = useState(0);
  const [totalPayments, setTotalPayments] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState('');

  // 🔄 LOAD DATA
  async function refreshStats() {
    try {
      const stats = await getTodayStats();
      const all = await getAllEntries();

      setTotalKret(stats.totalKretToday);
      setTotalPayments(stats.totalPaymentsToday);
      setEntries(all);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    refreshStats();
  }, []);

  // 🎤 MAIN VOICE HANDLER
  async function handleTranscript(text: string) {
    setIsProcessing(true);
    setLastCommand(text);

    try {
      const normalized = text.toLowerCase();

      // 🟢 1. CUSTOMER HISTORY
      if (normalized.includes('hisab') || normalized.includes('detail')) {
        const command = parseVoiceCommand(text);
        const name = command?.customer_name;

        if (!name) {
          await speak('Naam samajh nahi aaya', 'hi-IN');
          setIsProcessing(false);
          return;
        }

        const result = await getCustomerHistory(name);

        const msg = `${name} ka hisab: ${result.totalKret} kret (kele) aur ${result.totalPayment} rupaye`;

        await speak(msg, 'hi-IN');
        toast.success(msg);

        setIsProcessing(false);
        return;
      }

      // 🟢 2. TODAY SUMMARY
      if (normalized.includes('aaj') && normalized.includes('kis')) {
        const data = await getTodayEntries();

        const names = [...new Set(data.map((e) => e.customer_name))];

        const msg =
          names.length > 0
            ? `Aaj ${names.join(', ')} ki entries hui`
            : 'Aaj koi entry nahi hui';

        await speak(msg, 'hi-IN');
        toast.success(msg);

        setIsProcessing(false);
        return;
      }

      // 🟢 3. NORMAL ENTRY (SALE / PAYMENT)
      const command = parseVoiceCommand(text);

      if (!command) {
        await speak('Samajh nahi aaya', 'hi-IN');
        setIsProcessing(false);
        return;
      }

      const result = await addLedgerEntry(
        command.type,
        command.customer_name,
        command.quantity,
        command.amount,
        command.raw_text
      );

      if (result) {
        const msg =
          command.type === 'sale'
            ? `${command.customer_name} ko ${command.quantity || 0} kret (kele) diya gaya`
            : `${command.customer_name} ne ${command.amount || 0} rupaye diye`;

        await speak(msg, 'hi-IN');
        toast.success(msg);

        await refreshStats();
      }
    } catch (err) {
      console.error(err);
      toast.error('Error aaya');
    }

    setIsProcessing(false);
  }

  // 🎤 VOICE HOOK
  const { isListening, transcript, startListening, stopListening } =
    useVoiceRecorder({
      language: 'hi-IN',
      onTranscript: handleTranscript,
      onError: (error) => toast.error(error),
    });

  return (
    <div className="min-h-screen bg-emerald-50 p-4">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <h1 className="text-3xl font-bold text-center mb-6">
          🍌 Banana Shop Voice Ledger
        </h1>

        {/* MIC */}
        <Card className="p-6 text-center mb-6">
          <button
            onClick={() => (isListening ? stopListening() : startListening())}
            disabled={isProcessing}
            className={`w-28 h-28 rounded-full mx-auto flex items-center justify-center text-white ${
              isListening ? 'bg-red-500 animate-pulse' : 'bg-green-600'
            }`}
          >
            <Mic size={40} />
          </button>

          <p className="mt-3 text-gray-600">
            {isProcessing
              ? 'Processing...'
              : isListening
              ? 'Listening...'
              : 'Tap to speak'}
          </p>

          {transcript && (
            <p className="mt-2 text-green-700 italic">
              "{transcript}"
            </p>
          )}
        </Card>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="p-4 text-center">
            <p>आज की कret (केले)</p>
            <h2 className="text-2xl font-bold">{totalKret}</h2>
          </Card>

          <Card className="p-4 text-center">
            <p>आज के पैसे</p>
            <h2 className="text-2xl font-bold">₹{totalPayments}</h2>
          </Card>
        </div>

        {/* LAST COMMAND */}
        {lastCommand && (
          <Card className="p-3 mb-4 text-sm text-gray-600">
            Last: {lastCommand}
          </Card>
        )}

        {/* ENTRIES */}
        <Card className="p-4">
          <h2 className="font-bold mb-3">Recent Entries</h2>

          {entries.length === 0 ? (
            <p className="text-gray-500 text-sm">No data yet</p>
          ) : (
            entries.slice(0, 10).map((e, i) => (
              <div
                key={i}
                className="flex justify-between border-b py-2 text-sm"
              >
                <span>{e.customer_name}</span>
                <span>{e.type}</span>
                <span>
                  {e.type === 'sale'
                    ? `${e.quantity} kret (kele)`
                    : `₹${e.amount}`}
                </span>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}