import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, XCircle, Info } from 'lucide-react';

// Simple Toast Component
const Toast = ({ 
  message, 
  type = 'success', 
  duration = 5000, 
  onClose, 
  isVisible = true 
}) => {
  const [show, setShow] = useState(isVisible);

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onClose, 300); // Wait for animation to complete
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 300);
  };

  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg border shadow-lg transition-all duration-300 ${getBgColor()} ${
        show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{message}</p>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Toast Container Component
const ToastContainer = ({ toasts }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={toast.onClose}
          isVisible={toast.isVisible}
        />
      ))}
    </div>
  );
};

// Custom Hook for Toast Management
const useSimpleToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success', duration = 5000) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      message,
      type,
      duration,
      isVisible: true,
      onClose: () => removeToast(id)
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const success = (message, duration) => showToast(message, 'success', duration);
  const error = (message, duration) => showToast(message, 'error', duration);
  const warning = (message, duration) => showToast(message, 'warning', duration);
  const info = (message, duration) => showToast(message, 'info', duration);

  return {
    toasts,
    toast: {
      success,
      error,
      warning,
      info,
      show: showToast
    },
    ToastContainer: () => <ToastContainer toasts={toasts} />
  };
};

// Example usage component
const ToastExample = () => {
  const { toast, ToastContainer } = useSimpleToast();

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Toast Examples</h2>
      
      <div className="space-x-4">
        <button
          onClick={() => toast.success('Payment successful! Your session has been booked.')}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Success Toast
        </button>
        
        <button
          onClick={() => toast.error('Payment failed. Please try again.')}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Error Toast
        </button>
        
        <button
          onClick={() => toast.warning('Please select a time slot before booking.')}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          Warning Toast
        </button>
        
        <button
          onClick={() => toast.info('Your session will start in 5 minutes.')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Info Toast
        </button>
      </div>

      <ToastContainer />
    </div>
  );
};

export default ToastExample;
export { useSimpleToast, Toast, ToastContainer };