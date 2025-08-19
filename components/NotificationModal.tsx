
import React from 'react';
import type { DailyPlanItem } from '../types';
import { IconBell, IconX, IconCheck } from './icons';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayPlan: DailyPlanItem | null;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose, dayPlan }) => {
  if (!isOpen || !dayPlan) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative transform transition-all duration-300 ease-in-out scale-95 animate-in fade-in-0 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <IconX size={24} />
        </button>

        <div className="flex items-center mb-4">
          <div className="bg-blue-100 text-blue-600 rounded-full p-2 mr-4">
            <IconBell size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Day {dayPlan.day} Reminder</h2>
            <p className="text-slate-500">{dayPlan.title}</p>
          </div>
        </div>

        <div className="space-y-3 mt-6">
          {dayPlan.tasks.map((task, index) => (
            <div key={index} className="flex items-center bg-slate-50 p-3 rounded-lg">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-3 ${task.completed ? 'bg-green-500' : 'border-2 border-slate-300'}`}>
                {task.completed && <IconCheck size={14} className="text-white" />}
              </div>
              <span className={`flex-1 ${task.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                {task.task}
              </span>
            </div>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="mt-8 w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};
