
import React from 'react';
import type { HealthData } from '../types';
import { IconBell, IconCheck, IconHeart, IconList, IconCalendar } from './icons';

interface DashboardProps {
  healthData: HealthData;
  onToggleSuggestion: (index: number) => void;
  onToggleTask: (dayIndex: number, taskIndex: number) => void;
  onShowNotification: (dayIndex: number) => void;
}

const ScoreCircle: React.FC<{ score: number }> = ({ score }) => {
  const circumference = 2 * Math.PI * 54; // 2 * pi * r
  const offset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return 'stroke-green-500';
    if (score >= 50) return 'stroke-yellow-500';
    return 'stroke-red-500';
  };

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      <svg className="absolute w-full h-full" viewBox="0 0 120 120">
        <circle
          className="stroke-slate-200"
          strokeWidth="12"
          fill="transparent"
          r="54"
          cx="60"
          cy="60"
        />
        <circle
          className={`${getColor()} transition-all duration-1000 ease-out`}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r="54"
          cx="60"
          cy="60"
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="text-center">
        <span className="text-5xl font-bold text-slate-800">{score}</span>
        <p className="text-slate-500">Health Score</p>
      </div>
    </div>
  );
};

const SuggestionItem: React.FC<{ text: string, completed: boolean, onClick: () => void }> = ({ text, completed, onClick }) => (
  <li 
    className="flex items-center p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
    onClick={onClick}
  >
    <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-4 transition-all duration-300 ${completed ? 'bg-green-500' : 'bg-slate-200'}`}>
      {completed && <IconCheck size={16} className="text-white" />}
    </div>
    <span className={`flex-1 ${completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{text}</span>
  </li>
);

const DayPlanCard: React.FC<{ dayPlan: HealthData['dailyPlan'][0], onToggleTask: (taskIndex: number) => void, onShowNotification: () => void }> = ({ dayPlan, onToggleTask, onShowNotification }) => {
  const completedTasks = dayPlan.tasks.filter(t => t.completed).length;
  const totalTasks = dayPlan.tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col h-full">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-sm font-semibold text-blue-600">Day {dayPlan.day}</p>
          <h4 className="font-bold text-slate-800">{dayPlan.title}</h4>
        </div>
        <button onClick={onShowNotification} className="text-slate-400 hover:text-blue-600 transition-colors">
          <IconBell size={20} />
        </button>
      </div>
      <ul className="space-y-2 mb-4 flex-grow">
        {dayPlan.tasks.map((task, index) => (
          <li 
            key={index} 
            className="flex items-center text-sm cursor-pointer group"
            onClick={() => onToggleTask(index)}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mr-2 ${task.completed ? 'border-green-500 bg-green-500' : 'border-slate-300 group-hover:border-green-400'}`}>
              {task.completed && <IconCheck size={10} className="text-white" />}
            </div>
            <span className={task.completed ? 'line-through text-slate-400' : 'text-slate-600'}>{task.task}</span>
          </li>
        ))}
      </ul>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
};


export const Dashboard: React.FC<DashboardProps> = ({ healthData, onToggleSuggestion, onToggleTask, onShowNotification }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 md:p-8">
      {/* Left Column */}
      <div className="lg:col-span-1 space-y-8">
        <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-full mb-4">
                <IconHeart size={32}/>
            </div>
           <h3 className="text-2xl font-bold text-slate-800 mb-4 text-center">Your Health Score</h3>
          <ScoreCircle score={healthData.healthScore} />
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-4">
                <div className="bg-purple-100 text-purple-600 p-2 rounded-full mr-3">
                    <IconList size={24}/>
                </div>
                <h3 className="text-xl font-bold text-slate-800">General Suggestions</h3>
            </div>
          <ul className="space-y-3">
            {healthData.generalSuggestions.map((suggestion, index) => (
              <SuggestionItem 
                key={index}
                text={suggestion.suggestion} 
                completed={suggestion.completed} 
                onClick={() => onToggleSuggestion(index)}
              />
            ))}
          </ul>
        </div>
      </div>

      {/* Right Column */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-6">
                <div className="bg-green-100 text-green-600 p-2 rounded-full mr-3">
                    <IconCalendar size={24}/>
                </div>
                <h3 className="text-xl font-bold text-slate-800">Your 14-Day Action Plan</h3>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {healthData.dailyPlan.sort((a,b) => a.day - b.day).map((plan, index) => (
              <DayPlanCard 
                key={plan.day} 
                dayPlan={plan} 
                onToggleTask={(taskIndex) => onToggleTask(index, taskIndex)}
                onShowNotification={() => onShowNotification(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
