"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Loader, ArrowRight } from 'lucide-react';

interface TransactionModalProps {
  assetName: string;
  price: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
}

export default function TransactionModal({
  assetName,
  price,
  isOpen,
  onClose,
  onConfirm,
}: TransactionModalProps) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');

  useEffect(() => {
    if (!isOpen) {
      // Reset status when modal is closed
      setTimeout(() => setStatus('idle'), 300);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    setStatus('pending');
    const success = await onConfirm();
    setStatus(success ? 'success' : 'failed');
  };

  const renderContent = () => {
    switch (status) {
      case 'pending':
        return (
          <div className="text-center">
            <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white">Processing Transaction</h3>
            <p className="text-gray-400">Please confirm in your wallet...</p>
          </div>
        );
      case 'success':
        return (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white">Transaction Successful!</h3>
            <p className="text-gray-400">You have purchased tokens for {assetName}.</p>
            <button
              onClick={onClose}
              className="mt-4 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
            >
              View in Portfolio
            </button>
          </div>
        );
      case 'failed':
        return (
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white">Transaction Failed</h3>
            <p className="text-gray-400">Something went wrong. Please try again.</p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        );
      default: // 'idle'
        return (
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">Confirm Purchase</h3>
            <div className="bg-gray-700/50 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Asset:</span>
                <span className="text-white font-medium">{assetName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Price:</span>
                <span className="text-white font-bold text-lg">${price.toLocaleString()}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-6">
              You are about to purchase 1 token of this asset. This is a mock transaction and no real funds will be used.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2"
              >
                Confirm <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-gray-800 rounded-xl p-8 border border-gray-700 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {renderContent()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
