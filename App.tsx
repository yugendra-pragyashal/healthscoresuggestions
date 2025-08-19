
import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { User, HealthData } from './types';
import { firebaseService } from './services/firebaseService';
import { analyzeHealthReport } from './services/geminiService';
import { Dashboard } from './components/Dashboard';
import { NotificationModal } from './components/NotificationModal';
import { IconUpload, IconFile, IconLoader, IconHeart } from './components/icons';

// Configure the worker for pdf.js. This is required for it to work in a browser environment.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.mjs`;

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);
  
  const [modalData, setModalData] = useState<{ isOpen: boolean; dayIndex: number | null }>({
    isOpen: false,
    dayIndex: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const { user: authUser } = await firebaseService.auth.signInAnonymously();
        setUser(authUser);
        
        const unsubscribe = firebaseService.firestore.onSnapshot(
          authUser.uid,
          (data) => {
            setHealthData(data);
            setIsLoading(false);
          }
        );
        
        return () => unsubscribe();
      } catch (err) {
        setError("Failed to initialize the application. Please refresh the page.");
        setIsLoading(false);
      }
    };
    initializeApp();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    
    setAnalyzing(true);
    setError(null);
    setFileName(file.name);

    try {
      let reportText = '';
      if (file.type === 'text/plain') {
        reportText = await file.text();
      } else if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const numPages = pdf.numPages;
        const textContents = [];
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          textContents.push(textContent.items.map((item: any) => item.str).join(' '));
        }
        reportText = textContents.join('\n');
      } else {
        throw new Error('Unsupported file type. Please upload a .txt or .pdf file.');
      }

      if (!reportText.trim()) {
        throw new Error("The file seems to be empty. Please upload a valid report.");
      }
      
      const newHealthData = await analyzeHealthReport(reportText);
      await firebaseService.firestore.setDoc(user.uid, newHealthData);
      // The onSnapshot listener will automatically update the state

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during file processing.');
      setHealthData(null); // Clear old data on new error
    } finally {
      setAnalyzing(false);
      // Reset file input to allow re-uploading the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const recalculateHealthScore = useCallback((data: HealthData): number => {
    const { baseHealthScore, generalSuggestions, dailyPlan } = data;

    // If there's no base score (e.g., old data), don't change the score.
    if (typeof baseHealthScore !== 'number') {
        return data.healthScore;
    }

    const completedSuggestions = generalSuggestions.filter(s => s.completed).length;
    const totalSuggestions = generalSuggestions.length;

    const completedTasks = dailyPlan.reduce((acc, day) => acc + day.tasks.filter(t => t.completed).length, 0);
    const totalTasks = dailyPlan.reduce((acc, day) => acc + day.tasks.length, 0);
    
    const totalItems = totalSuggestions + totalTasks;
    if (totalItems === 0) {
        return baseHealthScore;
    }

    const pointsAvailable = 100 - baseHealthScore;
    const pointsPerItem = pointsAvailable / totalItems;
    const totalCompletedItems = completedSuggestions + completedTasks;

    const scoreIncrease = totalCompletedItems * pointsPerItem;
    const newScore = baseHealthScore + scoreIncrease;
    
    return Math.min(100, Math.round(newScore));
  }, []);

  const updateHealthData = useCallback((newData: Partial<HealthData>) => {
    if (user && healthData) {
        // Optimistic update
        setHealthData(prevData => prevData ? { ...prevData, ...newData } : null);
        firebaseService.firestore.updateDoc(user.uid, newData).catch(err => {
            console.error("Failed to sync update:", err);
            setError("Could not save your progress. Please check your connection.");
            // Here you might want to revert the optimistic update
        });
    }
  }, [user, healthData]);

  const handleToggleSuggestion = (index: number) => {
    if (!healthData) return;
    const newSuggestions = JSON.parse(JSON.stringify(healthData.generalSuggestions));
    newSuggestions[index].completed = !newSuggestions[index].completed;

    const newScore = recalculateHealthScore({ ...healthData, generalSuggestions: newSuggestions });

    updateHealthData({ generalSuggestions: newSuggestions, healthScore: newScore });
  };
  
  const handleToggleTask = (dayIndex: number, taskIndex: number) => {
    if (!healthData) return;
    const newDailyPlan = JSON.parse(JSON.stringify(healthData.dailyPlan));
    const day = newDailyPlan[dayIndex];
    day.tasks[taskIndex].completed = !day.tasks[taskIndex].completed;

    const newScore = recalculateHealthScore({ ...healthData, dailyPlan: newDailyPlan });

    updateHealthData({ dailyPlan: newDailyPlan, healthScore: newScore });
  };

  const handleShowNotification = (dayIndex: number) => {
    setModalData({ isOpen: true, dayIndex });
  };

  const handleCloseModal = () => {
    setModalData({ isOpen: false, dayIndex: null });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-screen text-slate-600">
            <IconLoader className="animate-spin mb-4" size={48} />
            <p className="text-lg">Loading your health data...</p>
        </div>
      );
    }

    if (error && !analyzing) {
        return (
             <div className="flex flex-col items-center justify-center text-center p-8">
                <div className="bg-red-100 text-red-700 p-4 rounded-full mb-4">
                    <IconHeart size={40}/>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">An Error Occurred</h2>
                <p className="text-red-600 mb-6 max-w-md">{error}</p>
                {renderFileUpload()}
            </div>
        )
    }

    if (analyzing) {
      return (
        <div className="flex flex-col items-center justify-center h-screen text-slate-600 text-center p-4">
            <IconLoader className="animate-spin mb-6" size={56} />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Analyzing Your Report...</h2>
            <p className="text-slate-500 max-w-sm">Our AI is generating your personalized health score and action plan. This may take a moment.</p>
             {fileName && <p className="mt-4 text-sm bg-slate-100 px-3 py-1 rounded-full">{fileName}</p>}
        </div>
      );
    }

    if (healthData) {
      return <Dashboard 
        healthData={healthData} 
        onToggleSuggestion={handleToggleSuggestion}
        onToggleTask={handleToggleTask}
        onShowNotification={handleShowNotification}
      />;
    }

    return (
        <div className="flex flex-col items-center justify-center h-screen text-center p-8">
            <div className="bg-blue-100 text-blue-600 p-5 rounded-full mb-6 shadow-md">
                <IconHeart size={48}/>
            </div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">Welcome to Health Score AI</h1>
            <p className="text-slate-500 mb-8 max-w-lg">Upload your health report (.txt or .pdf) to receive a personalized health score and a 14-day action plan to improve your well-being.</p>
            {renderFileUpload()}
        </div>
    )
  };
  
  const renderFileUpload = () => (
      <div>
        <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".txt,.pdf"
            onChange={handleFileUpload}
            ref={fileInputRef}
            disabled={analyzing}
        />
        <label
            htmlFor="file-upload"
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md cursor-pointer hover:bg-blue-700 transition-all duration-300 transform hover:scale-105"
        >
            <IconUpload className="mr-2" size={20} />
            <span>Upload Health Report</span>
        </label>
      </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {renderContent()}
      <NotificationModal
        isOpen={modalData.isOpen}
        onClose={handleCloseModal}
        dayPlan={
          modalData.dayIndex !== null && healthData
            ? healthData.dailyPlan[modalData.dayIndex]
            : null
        }
      />
    </main>
  );
};

export default App;