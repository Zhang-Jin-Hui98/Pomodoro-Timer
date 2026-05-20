/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Check,
  Trash2,
  Settings,
  Sparkles,
  Clock,
  Volume2,
  VolumeX,
  PlusCircle,
  HelpCircle,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Circle,
  Info,
  Calendar,
  Layers,
  CloudRain,
  Waves,
  Music,
  Bell
} from 'lucide-react';

import { Task, TimerMode, TimerStatus, CustomSettings } from './types';
import * as audio from './audioEngine';

// Default constants
const DEFAULT_SETTINGS: CustomSettings = {
  focusTime: 25,
  shortBreakTime: 5,
  longBreakTime: 15,
  tickTock: false
};

const DEFAULT_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Membaca Dokumentasi AetherFocus',
    isActive: true,
    isCompleted: false,
    createdAt: Date.now()
  },
  {
    id: 'task-2',
    title: 'Mengaktifkan Soundscape Cosmic Rain',
    isActive: false,
    isCompleted: false,
    createdAt: Date.now() + 1
  },
  {
    id: 'task-3',
    title: 'Menyelesaikan Sesi Fokus Pertama',
    isActive: false,
    isCompleted: false,
    createdAt: Date.now() + 2
  }
];

export default function App() {
  // --- STATE ---
  // Tasks Persistence
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('aetherfocus_tasks');
      return saved ? JSON.parse(saved) : DEFAULT_TASKS;
    } catch {
      return DEFAULT_TASKS;
    }
  });

  // Settings Persistence
  const [settings, setSettings] = useState<CustomSettings>(() => {
    try {
      const saved = localStorage.getItem('aetherfocus_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Soundscape Options
  const [soundSettings, setSoundSettings] = useState({
    rainVolume: 0.3,
    wavesVolume: 0.35,
    isRainOn: false,
    isWavesOn: false
  });

  // Current Timer State
  const [timerMode, setTimerMode] = useState<TimerMode>('focus');
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('idle');
  const [secondsLeft, setSecondsLeft] = useState<number>(settings.focusTime * 60);
  
  // Total original seconds for progress computing
  const [totalSeconds, setTotalSeconds] = useState<number>(settings.focusTime * 60);

  // Audio Context initialization status
  const [audioInitialized, setAudioInitialized] = useState<boolean>(false);

  // New task utility state
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Tab & Guide panels state
  const [showGuide, setShowGuide] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Temporarily edit settings in Form State
  const [focusInput, setFocusInput] = useState(settings.focusTime);
  const [shortInput, setShortInput] = useState(settings.shortBreakTime);
  const [longInput, setLongInput] = useState(settings.longBreakTime);
  const [tickTockInput, setTickTockInput] = useState(settings.tickTock);

  // Ref to track actual running interval
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- LOCAL STORAGE SYNC ---
  useEffect(() => {
    localStorage.setItem('aetherfocus_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('aetherfocus_settings', JSON.stringify(settings));
  }, [settings]);

  // Handle ambient volume & state updates in real Audio Engine
  useEffect(() => {
    if (audioInitialized) {
      if (soundSettings.isRainOn) {
        audio.startCosmicRain(soundSettings.rainVolume);
      } else {
        audio.stopCosmicRain();
      }
    }
  }, [soundSettings.isRainOn, soundSettings.rainVolume, audioInitialized]);

  useEffect(() => {
    if (audioInitialized) {
      if (soundSettings.isWavesOn) {
        audio.startOceanWaves(soundSettings.wavesVolume);
      } else {
        audio.stopOceanWaves();
      }
    }
  }, [soundSettings.isWavesOn, soundSettings.wavesVolume, audioInitialized]);

  // Adjust timers based on mode changes or setting modifications
  useEffect(() => {
    let minutes = settings.focusTime;
    if (timerMode === 'short') minutes = settings.shortBreakTime;
    if (timerMode === 'long') minutes = settings.longBreakTime;

    setSecondsLeft(minutes * 60);
    setTotalSeconds(minutes * 60);
    
    // Stop running timer on mode switch
    if (timerStatus === 'running') {
      pauseTimer();
    }
  }, [timerMode, settings]);

  // --- TIMER LOGIC ---
  const startTimer = () => {
    // Lazy Audio Activation on user interaction to avoid Chrome block
    if (!audioInitialized) {
      try {
        audio.initAudio();
        setAudioInitialized(true);
      } catch (e) {
        console.error("Web Audio initialisation failed:", e);
      }
    } else {
      audio.initAudio(); // Keep context alive
    }

    setTimerStatus('running');
  };

  const pauseTimer = () => {
    setTimerStatus('paused');
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const resetTimer = () => {
    pauseTimer();
    let minutes = settings.focusTime;
    if (timerMode === 'short') minutes = settings.shortBreakTime;
    if (timerMode === 'long') minutes = settings.longBreakTime;
    setSecondsLeft(minutes * 60);
    setTotalSeconds(minutes * 60);
    setTimerStatus('idle');
  };

  // Main countdown trigger loop
  useEffect(() => {
    if (timerStatus === 'running') {
      timerIntervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            // Timer Finished! Trigger Alarms & Mode change recommendation
            handleTimerComplete();
            return 0;
          }

          const nextSecond = prev - 1;

          // Sound tick & tock digital synth timing
          if (settings.tickTock && audioInitialized) {
            const isEven = nextSecond % 2 === 0;
            audio.playTick(isEven ? 'tick' : 'tock');
          }

          return nextSecond;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerStatus, settings.tickTock, audioInitialized]);

  const handleTimerComplete = () => {
    pauseTimer();
    audio.playChime(); // Smart Chime E-Mayor chord

    // Highlight active task as completed if in Focus mode
    if (timerMode === 'focus') {
      const activeTaskIndex = tasks.findIndex(t => t.isActive && !t.isCompleted);
      if (activeTaskIndex !== -1) {
        const updated = [...tasks];
        updated[activeTaskIndex].isCompleted = true;
        setTasks(updated);
      }
      
      // Auto recommend Short Break
      setTimerMode('short');
    } else {
      // Return to focus
      setTimerMode('focus');
    }
  };

  // --- AUDIO SERVICE INITIALIZERS ---
  const handleInteractionInit = () => {
    if (!audioInitialized) {
      try {
        audio.initAudio();
        setAudioInitialized(true);
      } catch (e) {
        console.warn("Failed to activate audio via body click:", e);
      }
    }
  };

  // --- SETTINGS CONTROLS ---
  const applySettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSettings({
      focusTime: Math.max(1, Math.min(180, focusInput)),
      shortBreakTime: Math.max(1, Math.min(60, shortInput)),
      longBreakTime: Math.max(1, Math.min(120, longInput)),
      tickTock: tickTockInput
    });
    setShowSettingsModal(false);
  };

  const resetToDefaultSettings = () => {
    setFocusInput(DEFAULT_SETTINGS.focusTime);
    setShortInput(DEFAULT_SETTINGS.shortBreakTime);
    setLongInput(DEFAULT_SETTINGS.longBreakTime);
    setTickTockInput(DEFAULT_SETTINGS.tickTock);
    setSettings(DEFAULT_SETTINGS);
  };

  // --- TASK MANAGER CONTROLS ---
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      isActive: tasks.length === 0, // Make primary if first task
      isCompleted: false,
      createdAt: Date.now()
    };

    setTasks(prev => [...prev, newTask]);
    setNewTaskTitle('');
  };

  const toggleTaskCompleted = (id: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === id ? { ...task, isCompleted: !task.isCompleted } : task
      )
    );
  };

  const setTaskAsActive = (id: string) => {
    setTasks(prev =>
      prev.map(task => ({
        ...task,
        isActive: task.id === id
      }))
    );
  };

  const deleteTask = (id: string) => {
    setTasks(prev => {
      const remaining = prev.filter(task => task.id !== id);
      // If deleted task was active, redistribute focus status to nearest task
      if (remaining.length > 0 && !remaining.some(t => t.isActive)) {
        remaining[0].isActive = true;
      }
      return remaining;
    });
  };

  // --- HELPER UTILS ---
  const formatTime = (totalSecondsCount: number) => {
    const mins = Math.floor(totalSecondsCount / 60);
    const secs = totalSecondsCount % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const activeTask = tasks.find(t => t.isActive && !t.isCompleted) || tasks.find(t => t.isActive);

  // Calculate coordinates and stroke offsets for Dynamic Progress Ring
  const radius = 95;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = totalSeconds > 0 
    ? circumference - (secondsLeft / totalSeconds) * circumference 
    : 0;

  // Determine accent color theme strings depending on mode
  const getThemeColors = () => {
    switch (timerMode) {
      case 'focus':
        return {
          glow: 'rgba(56, 189, 248, 0.4)',
          stroke: 'stroke-sky-400',
          bg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
          activeBtn: 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/30',
          textAccent: 'text-sky-400',
          borderAccent: 'border-sky-500/40',
          hoverAccent: 'hover:bg-sky-500/10'
        };
      case 'short':
        return {
          glow: 'rgba(45, 212, 191, 0.4)',
          stroke: 'stroke-teal-400',
          bg: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
          activeBtn: 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/30',
          textAccent: 'text-teal-400',
          borderAccent: 'border-teal-500/40',
          hoverAccent: 'hover:bg-teal-500/10'
        };
      case 'long':
        return {
          glow: 'rgba(129, 140, 248, 0.4)',
          stroke: 'stroke-indigo-400',
          bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
          activeBtn: 'bg-indigo-500 text-slate-950 shadow-md shadow-indigo-500/30',
          textAccent: 'text-indigo-400',
          borderAccent: 'border-indigo-500/40',
          hoverAccent: 'hover:bg-indigo-500/10'
        };
    }
  };

  const themeColors = getThemeColors();

  return (
    <div 
      className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden select-none pb-8"
      onClick={handleInteractionInit}
    >
      {/* Dynamic Cosmic Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Soft swirling background dust & gas nebula clouds */}
        <div className="absolute top-1/4 -left-1/4 w-[75%] h-[75%] rounded-full bg-sky-950/20 filter blur-[150px] animate-pulse-slow" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[75%] h-[75%] rounded-full bg-indigo-950/15 filter blur-[160px] animate-pulse-slow-reverse" />
        
        {/* Glowing stars vector simulation background */}
        <div 
          className="absolute inset-0 opacity-25" 
          style={{
            backgroundImage: `radial-gradient(ellipse at center, rgba(56, 189, 248, 0.15) 0%, transparent 70%), 
                              radial-gradient(1px 1px at 20px 30px, #fff, rgba(0,0,0,0)),
                              radial-gradient(1px 1px at 40px 70px, #fff, rgba(0,0,0,0)),
                              radial-gradient(1.5px 1.5px at 140px 180px, #bae6fd, rgba(0,0,0,0)),
                              radial-gradient(1px 1px at 240px 320px, #fff, rgba(0,0,0,0)),
                              radial-gradient(2px 2px at 380px 120px, #7dd3fc, rgba(0,0,0,0)),
                              radial-gradient(1px 1px at 580px 290px, #fff, rgba(0,0,0,0)),
                              radial-gradient(1.5px 1.5px at 720px 420px, #bae6fd, rgba(0,0,0,0)),
                              radial-gradient(1px 1px at 860px 190px, #fff, rgba(0,0,0,0)),
                              radial-gradient(2px 2px at 980px 380px, #7dd3fc, rgba(0,0,0,0))`,
            backgroundSize: 'auto, 350px 350px'
          }}
        />
      </div>

      {/* --- HEADER BAR --- */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 pt-6 pb-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-sky-900/25 pb-4 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 shadow-lg shadow-sky-500/20">
              <Sparkles className="w-6 h-6 text-slate-100" />
              <div className="absolute inset-0 rounded-xl bg-sky-400 opacity-20 blur-sm animate-pulse" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-sky-300 via-sky-100 to-indigo-200 bg-clip-text text-transparent">
                AetherFocus
              </h1>
              <p className="text-xs text-sky-400/80 font-mono tracking-widest">
                AESTHETIC BLUE PORTABLE TIMER
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-guide-toggle"
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center gap-2 text-xs bg-slate-900/60 hover:bg-slate-800/80 border border-sky-900/30 text-sky-300 px-3.5 py-2 rounded-lg transition-all duration-300 hover:border-sky-500/50"
              title="Panduan Pomodoro"
            >
              <Info className="w-4 h-4" />
              <span>Panduan</span>
            </button>

            <button
              id="btn-settings"
              onClick={() => {
                setFocusInput(settings.focusTime);
                setShortInput(settings.shortBreakTime);
                setLongInput(settings.longBreakTime);
                setTickTockInput(settings.tickTock);
                setShowSettingsModal(true);
              }}
              className="flex items-center gap-2 text-xs bg-slate-900/60 hover:bg-slate-800/80 border border-sky-900/30 text-sky-300 px-3.5 py-2 rounded-lg transition-all duration-300 hover:border-sky-500/50"
            >
              <Settings className="w-4 h-4" />
              <span>Pengaturan</span>
            </button>
          </div>
        </div>

        {/* Audio Context Unlock Prompt (Visible only if Not Initialized yet) */}
        {!audioInitialized && (
          <div className="w-full mt-4 bg-sky-950/30 border border-sky-500/20 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-sky-300/90 backdrop-blur-md animate-pulse">
            <span className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-sky-400" />
              Audio synthesizer siap. Klik tombol mana saja untuk mengaktifkan pengalaman suara real-time.
            </span>
            <button 
              onClick={() => {
                audio.initAudio();
                setAudioInitialized(true);
              }}
              className="px-2.5 py-1 bg-sky-500/25 hover:bg-sky-500/40 border border-sky-400/30 rounded-md transition-all text-xs text-sky-100 font-medium cursor-pointer"
            >
              Aktifkan Suara
            </button>
          </div>
        )}
      </header>

      {/* --- MAIN DASHBOARD CONTENT (BENTO GRID) --- */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-6 my-auto pt-4">
        
        {/* LEFT COMPONENT: INTEGRATED TASK MANAGER (Span 3) */}
        <section id="pane-tasks" className="lg:col-span-3 flex flex-col gap-4">
          <div className="rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-md p-5 flex flex-col h-[520px] shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-sky-900/20 pb-2">
              <h2 className="text-sm font-semibold tracking-wide text-sky-300 flex items-center gap-2 font-display uppercase">
                <Layers className="w-4 h-4" />
                Tugas Fokus
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-950/60 border border-sky-900/40 text-sky-400 font-mono font-medium">
                {tasks.filter(t => !t.isCompleted).length} Tersisa
              </span>
            </div>

            {/* Form to insert Task */}
            <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
              <input
                id="input-new-task"
                type="text"
                placeholder="Tulis tugas baru..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                maxLength={80}
                className="flex-1 text-sm bg-slate-950/80 border border-sky-900/40 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
              />
              <button
                id="btn-add-task"
                type="submit"
                className="bg-sky-600/30 text-sky-300 hover:bg-sky-600 border border-sky-500/30 rounded-xl p-2.5 px-3 transition-colors flex items-center justify-center cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            {/* Task list with beautiful custom glass scrollbar */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              <AnimatePresence initial={false}>
                {tasks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <CheckSquareIcon className="w-8 h-8 text-sky-500/20 mb-2" />
                    <p className="text-xs text-slate-500">Tidak ada tugas sekarang.</p>
                    <p className="text-3xs text-sky-500/40 mt-1">Gunakan formulir untuk menambah beban fokus.</p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ scale: 1.01 }}
                      className={`group p-3 rounded-xl border transition-all duration-300 ${
                        task.isCompleted
                          ? 'bg-slate-950/20 border-slate-900/40 opacity-50'
                          : task.isActive
                          ? 'bg-sky-950/30 border-sky-500/40 shadow-inner'
                          : 'bg-slate-950/40 border-sky-900/10 hover:border-sky-900/30'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => toggleTaskCompleted(task.id)}
                          className="mt-0.5 flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-md border transition-all cursor-pointer"
                          style={{
                            borderColor: task.isCompleted ? 'var(--color-sky-500)' : 'rgba(56, 189, 248, 0.3)',
                            backgroundColor: task.isCompleted ? 'rgba(56, 189, 248, 0.2)' : 'transparent'
                          }}
                        >
                          {task.isCompleted && <Check className="w-3.5 h-3.5 text-sky-400" />}
                        </button>

                        <div className="flex-1 min-w-0" onClick={() => !task.isCompleted && setTaskAsActive(task.id)}>
                          <p className={`text-xs font-medium cursor-pointer transition-all break-words ${
                            task.isCompleted 
                              ? 'line-through text-slate-500' 
                              : task.isActive 
                              ? 'text-sky-200 hover:text-sky-100' 
                              : 'text-slate-300 group-hover:text-slate-100'
                          }`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {task.isActive && !task.isCompleted && (
                              <span className="text-4xs px-1.5 py-0.5 rounded-md bg-sky-500/15 text-sky-400 uppercase font-mono font-bold tracking-widest leading-none">
                                Fokus Utama
                              </span>
                            )}
                            <span className="text-4xs text-slate-500 font-mono">
                              {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-slate-500 transition-all rounded-md hover:bg-slate-950/80 cursor-pointer"
                          title="Hapus Tugas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Task completion percentage bar */}
            {tasks.length > 0 && (
              <div className="mt-4 pt-3 border-t border-sky-900/15">
                <div className="flex items-center justify-between text-3xs text-slate-400 mb-1 font-mono">
                  <span>Progres Terkini</span>
                  <span>
                    {Math.round((tasks.filter(t => t.isCompleted).length / tasks.length) * 100)}% Selesai
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${(tasks.filter(t => t.isCompleted).length / tasks.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* CENTER COMPONENT: INTERACTIVE TIMER CANVAS (Span 6) */}
        <section id="pane-timer-canvas" className="lg:col-span-6 flex flex-col justify-center items-center gap-4">
          <div className="w-full rounded-2xl bg-slate-900/30 border border-white/5 backdrop-blur-md p-6 sm:p-8 flex flex-col items-center justify-between h-[520px] shadow-2xl relative overflow-hidden">
            
            {/* Visual Glass highlights inside card */}
            <div className="absolute top-0 left-0 w-24 h-24 bg-sky-500/5 rounded-full filter blur-xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full filter blur-xl pointer-events-none" />

            {/* Mode Selector Tab Pills */}
            <div className="relative z-10 w-full max-w-md bg-slate-950/80 p-1 border border-sky-950/60 rounded-xl grid grid-cols-3 gap-1">
              <button
                id="btn-mode-focus"
                onClick={() => setTimerMode('focus')}
                className={`py-2 text-xs font-medium font-display rounded-lg transition-all duration-300 relative ${
                  timerMode === 'focus' ? 'text-sky-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {timerMode === 'focus' && (
                  <motion.div
                    layoutId="activeModeIndicator"
                    className="absolute inset-0 bg-sky-950/50 border border-sky-500/30 rounded-lg shadow-sm"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Focus
                </span>
              </button>

              <button
                id="btn-mode-short"
                onClick={() => setTimerMode('short')}
                className={`py-2 text-xs font-medium font-display rounded-lg transition-all duration-300 relative ${
                  timerMode === 'short' ? 'text-teal-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {timerMode === 'short' && (
                  <motion.div
                    layoutId="activeModeIndicator"
                    className="absolute inset-0 bg-teal-950/50 border border-teal-500/30 rounded-lg shadow-sm"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  <CoffeeIcon className="w-3.5 h-3.5" />
                  Short Break
                </span>
              </button>

              <button
                id="btn-mode-long"
                onClick={() => setTimerMode('long')}
                className={`py-2 text-xs font-medium font-display rounded-lg transition-all duration-300 relative ${
                  timerMode === 'long' ? 'text-indigo-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {timerMode === 'long' && (
                  <motion.div
                    layoutId="activeModeIndicator"
                    className="absolute inset-0 bg-indigo-950/50 border border-indigo-500/30 rounded-lg shadow-sm"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  <CompassIcon className="w-3.5 h-3.5" />
                  Long Break
                </span>
              </button>
            </div>

            {/* Main Interactive Circle Indicator */}
            <div className="relative my-4 flex items-center justify-center scale-95 sm:scale-100">
              {/* Outer Glow filter behind ring */}
              <div 
                className="absolute w-56 h-56 rounded-full blur-2xl opacity-15 transition-all duration-500"
                style={{ backgroundColor: themeColors.glow }}
              />

              {/* Progress Ring Ring */}
              <svg className="w-56 h-56 -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="112"
                  cy="112"
                  r={radius}
                  className="stroke-slate-950 fill-transparent"
                  strokeWidth="8"
                />
                <circle
                  cx="112"
                  cy="112"
                  r={radius}
                  className="stroke-sky-900/10 fill-transparent"
                  strokeWidth="8"
                />
                {/* Colored Progress path */}
                <motion.circle
                  cx="112"
                  cy="112"
                  r={radius}
                  className={`fill-none ${themeColors.stroke} transition-all duration-200`}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  animate={{ strokeDashoffset }}
                  strokeLinecap="round"
                />
              </svg>

              {/* Central Clock Typography Layer */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {/* Current Active Mode Badge */}
                <span className={`text-[10px] font-mono tracking-widest uppercase font-semibold px-2 py-0.5 rounded-full ${themeColors.bg} mb-1`}>
                  {timerMode === 'focus' ? 'Fokus Sesi' : timerMode === 'short' ? 'Istirahat Singkat' : 'Istirahat Panjang'}
                </span>
                
                {/* Big Timer String Display */}
                <span className="text-5xl font-bold font-display tracking-wide text-slate-100">
                  {formatTime(secondsLeft)}
                </span>
                
                {/* Status Indicator text */}
                <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase mt-1">
                  {timerStatus === 'running' ? '● BERJALAN' : timerStatus === 'paused' ? '|| JEDA' : 'SIAP'}
                </span>
              </div>
            </div>

            {/* Currently Focused Task Tracker */}
            <div className="relative z-10 w-full max-w-md h-12 flex items-center justify-center bg-slate-950/50 border border-sky-900/10 rounded-xl px-4 text-center">
              {activeTask ? (
                <div className="flex items-center gap-1.5 truncate max-w-full">
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0 ${timerMode === 'focus' ? 'bg-sky-400' : 'bg-teal-400'}`} />
                  <span className="text-3xs text-slate-400 uppercase font-mono mr-1 flex-shrink-0">Tugas Aktif:</span>
                  <span className="text-xs text-sky-200 font-medium truncate">{activeTask.title}</span>
                </div>
              ) : (
                <span className="text-xs text-slate-500 italic">Pilih tugas utama untuk memulai fokus</span>
              )}
            </div>

            {/* Timer Core Button Action Cluster */}
            <div className="relative z-10 flex items-center gap-4 mt-2">
              {/* Reset button */}
              <button
                id="btn-timer-reset"
                onClick={resetTimer}
                className="w-12 h-12 rounded-full bg-slate-900/80 border border-sky-900/30 hover:border-sky-500/40 text-sky-400 hover:text-sky-300 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-md hover:bg-slate-800 focus:outline-none cursor-pointer"
                title="Reset Sesi"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              {/* Central Play/Pause toggle */}
              {timerStatus === 'running' ? (
                <button
                  id="btn-timer-pause"
                  onClick={pauseTimer}
                  className="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 border border-sky-400/20 text-slate-950 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-sky-500/25 focus:outline-none cursor-pointer"
                  title="Jeda"
                >
                  <Pause className="w-7 h-7 text-slate-100 fill-slate-100" />
                </button>
              ) : (
                <button
                  id="btn-timer-start"
                  onClick={startTimer}
                  className="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 border border-sky-300/30 text-slate-950 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-sky-400/30 focus:outline-none cursor-pointer"
                  title="Mulai"
                >
                  <Play className="w-7 h-7 text-slate-950 fill-slate-950 ml-1" />
                </button>
              )}

              {/* Manual sound chime preview for validation / instant joy */}
              <button
                id="btn-alarm-test"
                onClick={() => {
                  audio.initAudio();
                  audio.playChime();
                }}
                className="w-12 h-12 rounded-full bg-slate-900/80 border border-sky-900/30 hover:border-sky-500/40 text-sky-400 hover:text-sky-300 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-md hover:bg-slate-800 focus:outline-none cursor-pointer"
                title="Tes Melodi Alarm (E-Mayor Chime)"
              >
                <Bell className="w-5 h-5" />
              </button>
            </div>

          </div>
        </section>

        {/* RIGHT COMPONENT: AUDIO AMBIENCE SOUNDSCAPES & PERSISTED SETTINGS (Span 3) */}
        <section id="pane-sound-settings" className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Ambient Soundscapes Panel with Audio sliders */}
          <div className="rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-md p-5 flex flex-col h-[270px] justify-between shadow-xl">
            <div className="border-b border-sky-900/20 pb-2">
              <h2 className="text-sm font-semibold tracking-wide text-sky-300 flex items-center gap-2 font-display uppercase">
                <Music className="w-4 h-4" />
                Suara Latar (Ambient)
              </h2>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Synthesized via Web Audio</p>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-4 py-2">
              {/* Cosmic Rain control block */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <button
                    id="btn-sound-rain"
                    onClick={() => {
                      setSoundSettings(prev => ({ ...prev, isRainOn: !prev.isRainOn }));
                      if (!audioInitialized) {
                        audio.initAudio();
                        setAudioInitialized(true);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-3xs font-mono font-medium tracking-wide uppercase transition-all duration-300 cursor-pointer ${
                      soundSettings.isRainOn
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold'
                        : 'bg-slate-950/60 border-sky-900/30 text-slate-400'
                    }`}
                  >
                    <CloudRain className="w-3.5 h-3.5" />
                    <span>Cosmic Rain</span>
                  </button>
                  <span className="text-3xs text-slate-400 font-mono">
                    {soundSettings.isRainOn ? `${Math.round(soundSettings.rainVolume * 100)}%` : 'OFF'}
                  </span>
                </div>
                <input
                  id="slider-volume-rain"
                  type="range"
                  min="0"
                  max="100"
                  value={soundSettings.rainVolume * 100}
                  disabled={!soundSettings.isRainOn}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value) / 100;
                    setSoundSettings(p => ({ ...p, rainVolume: parsed }));
                  }}
                  className="w-full accent-sky-400 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-slate-950 h-1.5 rounded-full"
                />
              </div>

              {/* Ocean Waves control block */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <button
                    id="btn-sound-waves"
                    onClick={() => {
                      setSoundSettings(prev => ({ ...prev, isWavesOn: !prev.isWavesOn }));
                      if (!audioInitialized) {
                        audio.initAudio();
                        setAudioInitialized(true);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-3xs font-mono font-medium tracking-wide uppercase transition-all duration-300 cursor-pointer ${
                      soundSettings.isWavesOn
                        ? 'bg-teal-500/20 border-teal-400 text-teal-300 font-bold'
                        : 'bg-slate-950/60 border-sky-900/30 text-slate-400'
                    }`}
                  >
                    <Waves className="w-3.5 h-3.5" />
                    <span>Ocean Waves</span>
                  </button>
                  <span className="text-3xs text-slate-400 font-mono">
                    {soundSettings.isWavesOn ? `${Math.round(soundSettings.wavesVolume * 100)}%` : 'OFF'}
                  </span>
                </div>
                <input
                  id="slider-volume-waves"
                  type="range"
                  min="0"
                  max="100"
                  value={soundSettings.wavesVolume * 100}
                  disabled={!soundSettings.isWavesOn}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value) / 100;
                    setSoundSettings(p => ({ ...p, wavesVolume: parsed }));
                  }}
                  className="w-full accent-teal-400 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-slate-950 h-1.5 rounded-full"
                />
              </div>
            </div>

            <div className="text-4xs text-slate-500 font-mono italic leading-relaxed text-center">
              *Suara disintesis secara dinamis langsung dalam browser Anda menggunakan modulasi digital. No audio limits!
            </div>
          </div>

          {/* Settings Shortcuts / Info Panel */}
          <div className="rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-md p-5 flex flex-col h-[234px] justify-between shadow-xl">
            <div className="border-b border-sky-900/20 pb-2">
              <h2 className="text-sm font-semibold tracking-wide text-sky-300 flex items-center gap-2 font-display uppercase">
                <Sliders className="w-4 h-4" />
                Preferensi Cepat
              </h2>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-3 py-1">
              {/* Tick Tock switch mechanical toggler */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-sky-900/10">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-200">Suara Detikan</span>
                  <span className="text-4xs text-slate-500 font-mono">Mechanic Tick-Tock (1s)</span>
                </div>
                <button
                  id="btn-quick-ticktock"
                  onClick={() => {
                    setSettings(s => ({ ...s, tickTock: !s.tickTock }));
                    if (!audioInitialized) {
                      audio.initAudio();
                      setAudioInitialized(true);
                    }
                  }}
                  className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none cursor-pointer ${
                    settings.tickTock ? 'bg-sky-500' : 'bg-slate-900 border border-sky-900/30'
                  }`}
                >
                  <div className={`bg-slate-100 w-4 h-4 rounded-full shadow-md transform duration-300 ${
                    settings.tickTock ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Simple info badges */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-950/30 border border-white/3 flex flex-col items-center">
                  <span className="text-3xs text-slate-400 font-mono uppercase">Durasi Fokus</span>
                  <span className="text-sm font-bold text-sky-400 font-display mt-0.5">{settings.focusTime} Mnt</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/30 border border-white/3 flex flex-col items-center">
                  <span className="text-3xs text-slate-400 font-mono uppercase">Istirahat</span>
                  <span className="text-sm font-bold text-teal-400 font-display mt-0.5">{settings.shortBreakTime} Mnt</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-4xs text-slate-500">
              <span className="font-mono">Ver v2.1 (Pure Native Synth)</span>
              <button 
                onClick={resetToDefaultSettings}
                className="text-sky-400 hover:text-sky-300 transition-colors font-semibold"
              >
                Reset Pabrik
              </button>
            </div>
          </div>

        </section>

      </main>

      {/* --- FLOATING INTRODUCTORY / GUIDE PANEL (TOGGLED) --- */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full max-w-7xl mx-auto px-4 mt-6 z-10"
          >
            <div className="rounded-2xl bg-gradient-to-tr from-slate-900/90 to-sky-950/90 border border-sky-500/25 p-6 backdrop-blur-xl shadow-2xl relative">
              <button
                onClick={() => setShowGuide(false)}
                className="absolute top-4 right-4 text-xs text-sky-400 hover:text-sky-100 bg-sky-900/20 px-2.5 py-1 rounded-md transition-all font-semibold"
              >
                Tutup
              </button>

              <h3 className="text-base font-bold text-sky-300 font-display mb-3 flex items-center gap-1.5 uppercase">
                <Sparkles className="w-4 h-4 animate-spin-slow" />
                Cara Memaksimalkan Fokus Anda dengan AetherFocus
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                <div className="p-3 bg-slate-950/40 border border-sky-900/20 rounded-xl">
                  <span className="text-xl font-bold font-display text-sky-400">01</span>
                  <h4 className="text-xs font-semibold text-slate-200 mt-1 mb-1.5">Buat & Pilih Tugas</h4>
                  <p className="text-3xs text-slate-400 leading-relaxed">
                    Tulis tugas Anda di bagian <strong>Tugas Fokus</strong>. Pilih satu tugas utama untuk mendedikasikan seluruh energi Anda ke dalamnya.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/40 border border-sky-900/20 rounded-xl">
                  <span className="text-xl font-bold font-display text-teal-400">02</span>
                  <h4 className="text-xs font-semibold text-slate-200 mt-1 mb-1.5">Nyalakan Soundscape</h4>
                  <p className="text-3xs text-slate-400 leading-relaxed">
                    Aktifkan <strong>Cosmic Rain</strong> atau <strong>Ocean Waves</strong>. Atur volume ternyaman untuk mengisolasikan perhatian dari kebisingan luar.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/40 border border-sky-900/20 rounded-xl">
                  <span className="text-xl font-bold font-display text-indigo-400">03</span>
                  <h4 className="text-xs font-semibold text-slate-200 mt-1 mb-1.5">Mulai Siklus Kerja</h4>
                  <p className="text-3xs text-slate-400 leading-relaxed">
                    Klik <strong>START</strong>. Bekerja secara terisolasi tanpa interupsi hingga chord melodi <i>E-Mayor</i> lembut berkumandang.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/40 border border-sky-900/20 rounded-xl">
                  <span className="text-xl font-bold font-display text-emerald-400">04</span>
                  <h4 className="text-xs font-semibold text-slate-200 mt-1 mb-1.5 font-sans">Istirahat Berkala</h4>
                  <p className="text-3xs text-slate-400 leading-relaxed">
                    Lakukan <strong>Short Break</strong> (5 menit) untuk meregangkan tubuh. Setelah 4 siklus selesai, ambil <strong>Long Break</strong> (15 menit).
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- POPUP SETTINGS MODAL --- */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettingsModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-slate-900 border border-sky-500/30 rounded-2xl p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between border-b border-sky-900/30 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-sky-400" />
                  <h3 className="text-sm font-bold text-sky-300 font-display uppercase tracking-wide">
                    Pengaturan AetherFocus
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="text-xs text-slate-400 hover:text-slate-100 bg-slate-950 py-1 px-2.5 rounded-lg border border-sky-900/20"
                >
                  Batal
                </button>
              </div>

              <form onSubmit={applySettings} className="space-y-4">
                {/* Focus duration input */}
                <div className="space-y-1.5">
                  <label className="text-2xs font-mono text-sky-300 uppercase tracking-wider block">
                    Mode Focus Sesi (Kerja)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="input-focus-time"
                      type="range"
                      min="1"
                      max="120"
                      value={focusInput}
                      onChange={(e) => setFocusInput(parseInt(e.target.value))}
                      className="flex-1 accent-sky-400 cursor-pointer bg-slate-950 h-1.5 rounded-full"
                    />
                    <span className="w-12 text-sm font-bold text-right text-slate-200 font-display">
                      {focusInput} Mnt
                    </span>
                  </div>
                </div>

                {/* Short break input */}
                <div className="space-y-1.5">
                  <label className="text-2xs font-mono text-teal-300 uppercase tracking-wider block">
                    Short Break (Istirahat Singkat)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="input-short-time"
                      type="range"
                      min="1"
                      max="30"
                      value={shortInput}
                      onChange={(e) => setShortInput(parseInt(e.target.value))}
                      className="flex-1 accent-teal-400 cursor-pointer bg-slate-950 h-1.5 rounded-full"
                    />
                    <span className="w-12 text-sm font-bold text-right text-slate-200 font-display">
                      {shortInput} Mnt
                    </span>
                  </div>
                </div>

                {/* Long break input */}
                <div className="space-y-1.5">
                  <label className="text-2xs font-mono text-indigo-300 uppercase tracking-wider block">
                    Long Break (Istirahat Panjang)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="input-long-time"
                      type="range"
                      min="1"
                      max="60"
                      value={longInput}
                      onChange={(e) => setLongInput(parseInt(e.target.value))}
                      className="flex-1 accent-indigo-400 cursor-pointer bg-slate-950 h-1.5 rounded-full"
                    />
                    <span className="w-12 text-sm font-bold text-right text-slate-200 font-display">
                      {longInput} Mnt
                    </span>
                  </div>
                </div>

                {/* Mechanis system sound checkbox toggle inside card */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-sky-900/20 mt-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-200">Suara Mekanis Detikan</span>
                    <span className="text-4xs text-slate-500 font-mono">Baku detak digital mekanis</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTickTockInput(!tickTockInput)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none cursor-pointer ${
                      tickTockInput ? 'bg-sky-500' : 'bg-slate-900 border border-sky-900/30'
                    }`}
                  >
                    <div className={`bg-slate-100 w-4 h-4 rounded-full shadow-md transform duration-300 ${
                      tickTockInput ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Actions cluster */}
                <div className="flex gap-3 pt-3 border-t border-sky-900/30">
                  <button
                    type="button"
                    onClick={async () => {
                      // Trigger preview chord directly on demand
                      try {
                        audio.initAudio();
                        audio.playChime();
                      } catch (e) {
                        alert("Gagal memutar melodi. Silakan berinteraksi dengan halaman terlebih dulu.");
                      }
                    }}
                    className="flex-1 text-2xs bg-slate-950 hover:bg-slate-800 border border-indigo-900/30 text-indigo-300 font-mono py-2 rounded-xl transition-all cursor-pointer"
                  >
                    PREVIEW ALARM
                  </button>
                  <button
                    type="submit"
                    className="flex-1 text-2xs bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-slate-950 font-bold py-2 rounded-xl shadow-lg shadow-sky-500/10 transition-all cursor-pointer"
                  >
                    SIMPAN PREFERENSI
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- FOOTER META CREDITS --- */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 mt-8 pt-4 border-t border-sky-900/10 text-center">
        <p className="text-4xs text-slate-400 font-mono tracking-widest leading-relaxed">
          🌌 AETHERFOCUS • EST. 2026 • DESIGNED WITH SYNTHESIZED WEB AUDIO API ENGINES
        </p>
        <p className="text-4xs text-slate-600 font-mono mt-1">
          Bebas berkonsentrasi. Seluruh metadata disimpan di ruang lokal (localStorage) browser Anda.
        </p>
      </footer>
    </div>
  );
}

// Fallback helper components so imports don't error out
function CoffeeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      <line x1="6" x2="6" y1="2" y2="4" />
      <line x1="10" x2="10" y1="2" y2="4" />
      <line x1="14" x2="14" y1="2" y2="4" />
    </svg>
  );
}

function CompassIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function CheckSquareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
